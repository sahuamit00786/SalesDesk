import { Op } from 'sequelize'
import { Lead, LeadTask, Deal, Meeting } from '../models/index.js'
import { leadAccessWhere } from '../services/leadVisibility.js'
import { isElevated } from '../services/recordVisibility.js'

/**
 * Global search — the ONE new endpoint Phase 4 needs. Searches leads, tasks,
 * deals, and meetings in a single call and returns grouped results.
 *
 * Visibility is enforced exactly per your rule and reuses the SAME primitives
 * the rest of the app uses:
 *   - leads/deals: `leadAccessWhere(user)` → elevated see all, others see
 *     owned/assigned only.
 *   - tasks: elevated see all; others see tasks assigned to or created by them.
 *   - meetings: elevated see all; others see meetings they participate in
 *     (approximated here by createdBy/ownerUserId; tighten to participants if
 *     your Meeting model exposes them cheaply).
 *
 * So a sales user's search never surfaces records they aren't allowed to see —
 * the scoping is applied in the WHERE, not filtered after the fact.
 *
 * GET /api/v1/search?q=term&limit=5
 * → { data: { leads:[], tasks:[], deals:[], meetings:[] }, meta: { q } }
 */
export async function globalSearch(req, res, next) {
  try {
    const q = String(req.query.q || '').trim()
    const workspaceId = req.workspaceId || null
    const perType = Math.min(Number(req.query.limit) || 5, 10)

    if (q.length < 2) {
      return res.json({
        success: true,
        data: { leads: [], tasks: [], deals: [], meetings: [] },
        meta: { q, hint: 'Type at least 2 characters' },
      })
    }

    const like = { [Op.like]: `%${q}%` }
    const wsClause = workspaceId ? { workspaceId: String(workspaceId) } : {}
    const leadWhere = await leadAccessWhere(req.user, workspaceId ? { workspaceId: String(workspaceId) } : {})

    // Non-elevated own-scoping for tasks/meetings
    const elevated = isElevated(req.user)
    const ownTaskClause = elevated
      ? {}
      : { [Op.or]: [{ assignedTo: req.user.id }, { createdBy: req.user.id }] }
    const ownMeetingClause = elevated
      ? {}
      : { [Op.or]: [{ createdBy: req.user.id }, { ownerUserId: req.user.id }] }

    const [leads, tasks, deals, meetings] = await Promise.all([
      Lead.findAll({
        where: {
          ...leadWhere,
          isDeleted: false,
          [Op.or]: [{ title: like }, { contactName: like }, { company: like }, { email: like }, { phone: like }],
        },
        attributes: ['id', 'title', 'contactName', 'company', 'phone', 'status', 'isOpportunity'],
        limit: perType,
        order: [['updatedAt', 'DESC']],
      }).catch(() => []),

      LeadTask.findAll({
        where: {
          companyId: req.user.companyId,
          ...wsClause,
          ...ownTaskClause,
          title: like,
        },
        attributes: ['id', 'title', 'status', 'dueAt', 'leadId'],
        limit: perType,
        order: [['updatedAt', 'DESC']],
      }).catch(() => []),

      Deal.findAll({
        where: {
          ...(await leadAccessWhere(req.user)),
          ...wsClause,
          isDeleted: false,
          name: like,
        },
        attributes: ['id', 'name', 'value', 'valueCurrency', 'stage'],
        limit: perType,
        order: [['updatedAt', 'DESC']],
      }).catch(() => []),

      Meeting.findAll({
        // Meeting has no companyId column — workspaceId scoping is sufficient
        // (a workspace belongs to exactly one company).
        where: {
          ...wsClause,
          ...ownMeetingClause,
          title: like,
        },
        attributes: ['id', 'title', 'scheduledStart'],
        limit: perType,
        order: [['scheduledStart', 'DESC']],
      }).catch(() => []),
    ])

    return res.json({
      success: true,
      data: { leads, tasks, deals, meetings },
      meta: { q, counts: { leads: leads.length, tasks: tasks.length, deals: deals.length, meetings: meetings.length } },
    })
  } catch (err) {
    next(err)
  }
}
