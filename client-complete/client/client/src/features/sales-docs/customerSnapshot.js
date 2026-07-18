/** Mirrors server `salesCustomerSnapshot.buildCustomerSnapshotFromLead`. */
export function buildCustomerSnapshotFromLead(lead) {
  if (!lead) return null
  const phone = [lead.phoneCountryCode, lead.phone].filter(Boolean).join(' ').trim() || null
  return {
    contactName: (lead.contactName || lead.title || '').trim() || null,
    companyName: (lead.company || '').trim() || null,
    email: lead.email || null,
    phone,
    gstin: lead.profileMeta?.gstin || lead.profileMeta?.taxId || null,
    billingAddress: {
      street: lead.street || null,
      city: lead.city || null,
      state: lead.state || null,
      postalCode: lead.postalCode || null,
      country: lead.country || null,
    },
    shippingAddress: {
      street: lead.street || null,
      city: lead.city || null,
      state: lead.state || null,
      postalCode: lead.postalCode || null,
      country: lead.country || null,
    },
  }
}

export function formatAddressLines(snapshot) {
  const b = snapshot?.billingAddress
  if (!b) return ''
  return [b.street, b.city, b.state, b.postalCode, b.country].filter(Boolean).join(', ')
}
