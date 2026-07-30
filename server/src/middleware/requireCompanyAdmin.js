/**
 * SECURITY FIX (§11.3 of the bug audit) — billing-profile fraud path.
 *
 * `PATCH /billing-profile` writes the bank name/account number/IFSC that get
 * stamped onto every invoice via `mergeBillingIntoPaymentSnapshot()`. Before this
 * guard, any authenticated user of any role could change it — a single request
 * redirects every future invoice's payment details to an attacker-controlled
 * account, and the snapshot means it survives even after the profile is fixed.
 *
 * Use on any other route where a non-admin write has outsized blast radius
 * (money, credentials, company-wide config) — same elevated tier as
 * `requireAnalyticsAdmin` for consistency: company admin or workspace_admin.
 */
export function requireCompanyAdmin(req, res, next) {
  const { isCompanyAdmin, userRoleKind } = req.user || {}
  if (isCompanyAdmin || userRoleKind === 'workspace_admin') return next()
  return res.status(403).json({
    success: false,
    error: { code: 'FORBIDDEN', message: 'Admin access required for this action' },
  })
}
