import { AssignmentRule, Activity } from '../models/index.js'
import { getRedis } from '../config/redis.js'

function matchesConditions(lead, conditions) {
  const c = conditions || {}
  if (c.source && c.source !== lead.source) return false
  if (c.tag && Array.isArray(lead.tags) && !lead.tags.some((t) => t.name === c.tag)) return false
  if (c.territory && c.territory !== lead.metadata?.territory) return false
  return true
}

async function pickAssignee(rule) {
  if (!Array.isArray(rule.assignees) || !rule.assignees.length) return null
  const redis = getRedis()
  if (!redis) return rule.assignees[0]
  const next = await redis.incr(`rr:${rule.id}`)
  const idx = (Number(next) - 1) % rule.assignees.length
  return rule.assignees[idx]
}

export async function autoAssignLead(lead) {
  const rules = await AssignmentRule.findAll({
    where: { workspaceId: lead.workspaceId, isActive: true },
    order: [['priority', 'ASC']],
  })
  for (const rule of rules) {
    if (!matchesConditions(lead, rule.conditions)) continue
    const userId = await pickAssignee(rule)
    if (!userId) continue
    await lead.update({ assignedTo: userId, ownerUserId: lead.ownerUserId || userId })
    await Activity.create({
      type: 'assignment',
      leadId: lead.id,
      userId,
      body: `Assigned by rule ${rule.name}`,
      metadata: { ruleId: rule.id, userId },
    })
    return userId
  }
  return null
}
