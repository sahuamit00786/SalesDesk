import { getCountries, getCountryCallingCode, parsePhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min'

/** @param {string} dialWithPlus e.g. "+1", "+91" */
export function defaultCountryFromCallingCode(dialWithPlus) {
  const target = String(dialWithPlus || '')
    .replace(/\D/g, '')
    .trim()
  if (!target) return 'IN'
  const matches = []
  for (const iso of getCountries()) {
    try {
      if (String(getCountryCallingCode(iso)) === target) matches.push(iso)
    } catch {
      // ignore
    }
  }
  if (!matches.length) return 'IN'
  if (matches.includes('US') && target === '1') return 'US'
  if (matches.includes('IN') && target === '91') return 'IN'
  return matches[0]
}

export function mergePartsToE164(countryCallingCode, nationalNumber) {
  const nat = String(nationalNumber || '').replace(/\D/g, '')
  if (!nat) return undefined
  const ccDigits = String(countryCallingCode || '').replace(/\D/g, '')
  if (!ccDigits) return undefined
  try {
    const p = parsePhoneNumber(`+${ccDigits}${nat}`)
    if (p?.isValid()) return p.format('E.164')
    return p?.number || `+${ccDigits}${nat}`
  } catch {
    return `+${ccDigits}${nat}`
  }
}

/**
 * @param {string | undefined} e164
 * @param {string} [fallbackCountryCallingCode] e.g. "+91" when clearing partial input
 */
export function splitFromE164(e164, fallbackCountryCallingCode = '+91') {
  if (!e164) {
    return {
      countryCallingCode: fallbackCountryCallingCode,
      nationalNumber: '',
    }
  }
  try {
    const p = parsePhoneNumber(e164)
    return {
      countryCallingCode: `+${p.countryCallingCode}`,
      nationalNumber: p.nationalNumber,
    }
  } catch {
    return {
      countryCallingCode: fallbackCountryCallingCode,
      nationalNumber: '',
    }
  }
}

/** Normalize legacy plain national or E.164 into E.164 for PhoneInput `value`. */
export function inferE164FromStored(raw, defaultCountry = 'IN') {
  const s = String(raw || '').trim()
  if (!s) return undefined
  if (s.startsWith('+')) {
    try {
      const p = parsePhoneNumber(s)
      return p?.number
    } catch {
      try {
        return parsePhoneNumberFromString(s)?.number
      } catch {
        return undefined
      }
    }
  }
  try {
    return parsePhoneNumberFromString(s, defaultCountry)?.number
  } catch {
    return undefined
  }
}

export function digitsOnlyE164(e164) {
  return String(e164 || '').replace(/\D/g, '')
}
