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
