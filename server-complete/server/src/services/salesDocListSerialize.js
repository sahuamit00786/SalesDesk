/** Extra list-row fields for quotations / invoices tables (client + deal context). */
export function enrichSalesDocListRow(plain, row = {}) {
  const snap = plain.customerSnapshot || {}
  const lead = row.lead || plain.lead || null
  const deal = row.deal || plain.deal || null

  const clientName =
    snap.contactName ||
    snap.companyName ||
    lead?.contactName ||
    lead?.title ||
    lead?.company ||
    lead?.email ||
    null

  const clientCompany = snap.companyName || lead?.company || null

  return {
    ...plain,
    clientName: clientName || '—',
    clientCompany: clientCompany || null,
    dealName: deal?.name || snap.dealName || null,
    dealStage: deal?.stage || null,
    leadTitle: lead?.title || null,
  }
}
