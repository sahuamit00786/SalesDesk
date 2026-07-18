import { Deal, Lead } from '../models/index.js'
import { leadAccessWhere } from './leadVisibility.js'

/**
 * Resolve sales-doc target: either a lead id, or a deal id (FK stores parent opportunity `lead_id` + optional `deal_id`).
 */
export async function resolveLeadAndDealForSalesDoc({ leadId, dealId, companyId, workspaceId, user }) {
  const dealIdTrim = dealId && String(dealId).trim()
  const leadIdTrim = leadId && String(leadId).trim()

  if (!dealIdTrim && !leadIdTrim) {
    const err = new Error('Either leadId or dealId is required')
    err.status = 400
    err.code = 'VALIDATION'
    throw err
  }

  let dealRow = null
  let resolvedLeadId = leadIdTrim

  if (dealIdTrim) {
    const access = await leadAccessWhere(user)
    dealRow = await Deal.findOne({
      where: {
        ...access,
        id: dealIdTrim,
        companyId,
        workspaceId: String(workspaceId),
        isDeleted: false,
      },
    })
    if (!dealRow) {
      const err = new Error('Deal not found')
      err.status = 404
      throw err
    }
    resolvedLeadId = String(dealRow.opportunityLeadId)
  }

  const lead = await Lead.findOne({
    where: { id: resolvedLeadId, companyId, isDeleted: false },
  })
  if (!lead) {
    const err = new Error('Lead not found')
    err.status = 404
    throw err
  }
  if (lead.workspaceId && String(lead.workspaceId) !== String(workspaceId)) {
    const err = new Error('Lead is in a different workspace')
    err.status = 400
    err.code = 'VALIDATION'
    throw err
  }

  if (dealRow && leadIdTrim && String(lead.id) !== String(leadIdTrim)) {
    const err = new Error('leadId does not match the deal parent opportunity')
    err.status = 400
    err.code = 'VALIDATION'
    throw err
  }

  return {
    lead,
    resolvedLeadId,
    resolvedDealId: dealRow ? String(dealRow.id) : null,
    dealRow,
  }
}
