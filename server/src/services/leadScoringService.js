import { Activity, Lead } from '../models/index.js'

export const SCORE_WEIGHTS = {
  hasEmail: 10,
  hasPhone: 10,
  hasCompany: 5,
  hasValue: 10,
  hasClosingDate: 5,
  emailOpened: 15,
  replied: 20,
  meetingHeld: 20,
  pageVisit: 5,
}

export async function recalculateScore(leadId) {
  const lead = await Lead.findByPk(leadId, { include: [{ model: Activity, as: 'activities' }] })
  if (!lead) return 0
  let score = 0
  if (lead.email) score += SCORE_WEIGHTS.hasEmail
  if (lead.phone) score += SCORE_WEIGHTS.hasPhone
  if (lead.companyId) score += SCORE_WEIGHTS.hasCompany
  if (Number(lead.value || 0) > 0) score += SCORE_WEIGHTS.hasValue
  if (lead.closingDate) score += SCORE_WEIGHTS.hasClosingDate
  const activities = lead.activities || []
  if (activities.some((a) => a.type === 'email')) score += SCORE_WEIGHTS.emailOpened
  if (activities.some((a) => a.metadata?.replied)) score += SCORE_WEIGHTS.replied
  if (activities.some((a) => a.type === 'meeting')) score += SCORE_WEIGHTS.meetingHeld
  if (activities.some((a) => a.metadata?.pageVisit)) score += SCORE_WEIGHTS.pageVisit
  score = Math.min(100, score)
  await lead.update({ score })
  return score
}

// ─── Rule-based scoring engine (Feature 5.10) ─────────────────────────────────

/**
 * Recalculates and updates the score for a lead based on active ScoringRule records.
 * Call this whenever a lead field changes.
 * Falls back gracefully if ScoringRule table has no rules — returns null without error.
 */
export async function recalculateLeadScore(lead, companyId) {
  try {
    const { ScoringRule } = await import('../models/index.js')
    const rules = await ScoringRule.findAll({
      where: {
        companyId,
        isActive: true,
        ruleType: 'field',
      },
      order: [['sortOrder', 'ASC']],
    })

    if (rules.length === 0) return null

    let totalScore = 0

    for (const rule of rules) {
      const fieldValue = lead[rule.fieldName] ?? lead.dataValues?.[rule.fieldName]
      if (fieldValue === undefined || fieldValue === null) continue

      let matches = false
      switch (rule.operator) {
        case 'equals':
          matches = String(fieldValue).toLowerCase() === String(rule.value).toLowerCase()
          break
        case 'not_equals':
          matches = String(fieldValue).toLowerCase() !== String(rule.value).toLowerCase()
          break
        case 'contains':
          matches = String(fieldValue).toLowerCase().includes(String(rule.value).toLowerCase())
          break
        case 'greater_than':
          matches = Number(fieldValue) > Number(rule.value)
          break
        case 'less_than':
          matches = Number(fieldValue) < Number(rule.value)
          break
        case 'exists':
          matches = fieldValue !== null && fieldValue !== '' && fieldValue !== undefined
          break
        default:
          break
      }

      if (matches) totalScore += rule.points
    }

    // Clamp score between 0 and 100
    const clampedScore = Math.max(0, Math.min(100, totalScore))

    await lead.update({ score: clampedScore })
    return clampedScore
  } catch (e) {
    console.error('[leadScoringService] recalculateLeadScore failed:', e.message)
    return null
  }
}

/**
 * Adjusts lead score for activity-based events (email open, meeting, reply).
 * This is additive — it adds/subtracts points from the current score.
 */
export async function adjustLeadScoreForActivity(leadId, eventType, companyId) {
  try {
    const { ScoringRule } = await import('../models/index.js')
    const rules = await ScoringRule.findAll({
      where: { companyId, isActive: true, ruleType: eventType },
    })

    if (rules.length === 0) return

    const lead = await Lead.findByPk(leadId)
    if (!lead) return

    const delta = rules.reduce((sum, r) => sum + r.points, 0)
    const newScore = Math.max(0, Math.min(100, (lead.score || 0) + delta))
    await lead.update({ score: newScore })
  } catch (e) {
    console.error('[leadScoringService] adjustLeadScoreForActivity failed:', e.message)
  }
}
