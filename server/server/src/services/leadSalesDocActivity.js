import { Activity, DealActivity } from '../models/index.js'
import { recalculateScore } from './leadScoringService.js'

function plain(row) {
  return row?.get ? row.get({ plain: true }) : row
}

/**
 * Logs a system activity on the lead timeline when a quotation is created.
 * Also writes to deal_activities when a dealId is provided.
 * Errors are swallowed so document creation still succeeds.
 */
export async function recordQuotationCreatedOnLead({ leadId, userId, quotation, dealId = null }) {
  try {
    const q = plain(quotation)
    const metadata = {
      action: 'quotation_created',
      actorUserId: userId,
      quotationId: q.id,
      quotationNumber: q.quotationNumber || null,
      status: q.status || null,
      grandTotal: q.grandTotal != null ? String(q.grandTotal) : null,
      currency: q.currency || null,
    }
    const body = `Quotation ${q.quotationNumber || ''} added (${q.status || 'draft'})`
    await Activity.create({ type: 'system', body, metadata, leadId, userId })
    if (dealId) {
      await DealActivity.create({ type: 'system', body, metadata: { ...metadata, dealId }, dealId, userId })
    }
    await recalculateScore(leadId)
  } catch (err) {
    console.error('[recordQuotationCreatedOnLead]', err)
  }
}

/**
 * Logs a system activity on the lead timeline when an invoice is created (including from quotation conversion).
 * Also writes to deal_activities when a dealId is provided.
 */
export async function recordInvoiceCreatedOnLead({ leadId, userId, invoice, extraMetadata = {}, dealId = null }) {
  try {
    const inv = plain(invoice)
    const fromQ = extraMetadata.fromQuotationNumber
    const body = fromQ
      ? `Invoice ${inv.invoiceNumber || ''} added (${inv.status || 'draft'}) — converted from quotation ${fromQ}`
      : `Invoice ${inv.invoiceNumber || ''} added (${inv.status || 'draft'})`
    const metadata = {
      action: 'invoice_created',
      actorUserId: userId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber || null,
      status: inv.status || null,
      grandTotal: inv.grandTotal != null ? String(inv.grandTotal) : null,
      currency: inv.currency || null,
      ...extraMetadata,
    }
    await Activity.create({ type: 'system', body, metadata, leadId, userId })
    if (dealId) {
      await DealActivity.create({ type: 'system', body, metadata: { ...metadata, dealId }, dealId, userId })
    }
    await recalculateScore(leadId)
  } catch (err) {
    console.error('[recordInvoiceCreatedOnLead]', err)
  }
}
