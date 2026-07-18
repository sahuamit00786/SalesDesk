/** Strong password rules (keep in sync with server `validations/auth.js`) */
export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

/** Same symbol set as server `validations/auth.js` */
export const SYMBOL_RE = /[!@#$%^&*()_+\-=[\]{}|;:',.<>/?]/

export const passwordPolicyRules = [
  { id: 'len', label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { id: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { id: 'num', label: 'One number', test: (p) => /\d/.test(p) },
  { id: 'sym', label: 'One symbol (!@#$…)', test: (p) => SYMBOL_RE.test(p) },
]

export function passwordPolicySummary() {
  return `Use ${PASSWORD_MIN_LENGTH}+ characters with upper & lower case, a number, and a symbol.`
}

export function passwordMeetsPolicy(password) {
  return passwordPolicyRules.every((r) => r.test(password))
}
