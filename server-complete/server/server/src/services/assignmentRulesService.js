import { Op } from 'sequelize'
import { AssignmentRule, Activity, User, UserWorkspace } from '../models/index.js'
import { getRedis } from '../config/redis.js'
import { notifyLeadAssigned } from './notification/teamNotificationService.js'

function matchesConditions(lead, conditions) {
  const c = conditions || {}
  if (c.source && c.source !== lead.source) return false
  if (c.tag && Array.isArray(lead.tags) && !lead.tags.some((t) => t.name === c.tag)) return false
  if (c.territory && c.territory !== lead.metadata?.territory) return false
  return true
}

/**
 * Rule assignees drift: a user can leave the workspace or be deactivated after
 * the rule was saved. Filter the pool to ACTIVE members of the lead's
 * workspace before rotating, so background assignment can never hand a lead
 * to someone who can't open the workspace it lives in.
 */
async function eligibleAssignees(rule, workspaceId) {
  const pool = Array.isArray(rule.assignees) ? rule.assignees.filter(Boolean).map(String) : []
  if (!pool.length) return []
  const [members, activeUsers] = await Promise.all([
    UserWorkspace.findAll({
      where: { workspaceId, userId: { [Op.in]: pool } },
      attributes: ['userId'],
      raw: true,
    }),
    User.findAll({
      where: { id: { [Op.in]: pool }, isActive: true },
      attributes: ['id'],
      raw: true,
    }),
  ])
  const memberSet = new Set(members.map((m) => String(m.userId)))
  const activeSet = new Set(activeUsers.map((u) => String(u.id)))
  return pool.filter((id) => memberSet.has(id) && activeSet.has(id))
}

async function pickAssignee(rule, workspaceId) {
  const pool = await eligibleAssignees(rule, workspaceId)
  if (!pool.length) return null
  const redis = getRedis()
  if (!redis) return pool[0]
  const next = await redis.incr(`rr:${rule.id}`)
  const idx = (Number(next) - 1) % pool.length
  return pool[idx]
}

export async function autoAssignLead(lead, { suppressNotification = false } = {}) {
  // Manual assignee wins — don't override explicit selection
  if (lead.assignedTo) return null

  const rules = await AssignmentRule.findAll({
    where: { workspaceId: lead.workspaceId, isActive: true },
    order: [['priority', 'ASC']],
  })
  for (const rule of rules) {
    if (!matchesConditions(lead, rule.conditions)) continue
    const userId = await pickAssignee(rule, lead.workspaceId)
    if (!userId) continue
    await lead.update({ assignedTo: userId, ownerUserId: lead.ownerUserId || userId })
    await Activity.create({
      type: 'assignment',
      leadId: lead.id,
      userId,
      body: `Assigned by rule ${rule.name}`,
      metadata: { ruleId: rule.id, userId },
    })
    if (!suppressNotification) {
      notifyLeadAssigned({
        companyId: lead.companyId,
        workspaceId: lead.workspaceId,
        recipientUserId: userId,
        actorUserId: null,
        leadCount: 1,
      }).catch(() => {})
    }
    return userId
  }
  return null
}
