export function buildCustomerSnapshotFromLead(lead) {
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

export function mergeBillingIntoPaymentSnapshot(billingProfile) {
  if (!billingProfile) return null
  return {
    bankName: billingProfile.bankName,
    bankAccountHolderName: billingProfile.bankAccountHolderName,
    bankBranch: billingProfile.bankBranch,
    micrCode: billingProfile.micrCode,
    bankAccountType: billingProfile.bankAccountType,
    bankAccountNumber: billingProfile.bankAccountNumber,
    bankIfsc: billingProfile.bankIfsc,
    bankSwift: billingProfile.bankSwift,
    upiId: billingProfile.upiId,
    paymentLinkUrl: billingProfile.paymentLinkUrl,
    paymentInstructions: billingProfile.paymentInstructions,
  }
}
