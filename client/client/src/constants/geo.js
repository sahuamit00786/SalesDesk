/** ISO region flag emoji from alpha-2 code (e.g. US → 🇺🇸). */
export function countryFlagEmoji(code) {
  const c = String(code || '').trim().toUpperCase()
  if (!c || c === 'OTHER' || c.length !== 2) return '🌍'
  if (c === 'EU') return '🇪🇺'
  return String.fromCodePoint(...[...c].map((ch) => 127397 + ch.charCodeAt(0)))
}

/** Primary country used for currency flag display. */
const CURRENCY_FLAG_REGION = {
  USD: 'US',
  EUR: 'EU',
  GBP: 'GB',
  INR: 'IN',
  MYR: 'MY',
  CAD: 'CA',
  AUD: 'AU',
  AED: 'AE',
  SGD: 'SG',
  JPY: 'JP',
  CHF: 'CH',
  NZD: 'NZ',
  SEK: 'SE',
  NOK: 'NO',
  DKK: 'DK',
  MXN: 'MX',
  ZAR: 'ZA',
  BRL: 'BR',
  CNY: 'CN',
  HKD: 'HK',
  KRW: 'KR',
  THB: 'TH',
  PHP: 'PH',
  IDR: 'ID',
  PKR: 'PK',
  BDT: 'BD',
  NGN: 'NG',
  KES: 'KE',
  EGP: 'EG',
  SAR: 'SA',
  QAR: 'QA',
  KWD: 'KW',
  BHD: 'BH',
  OMR: 'OM',
  ILS: 'IL',
  TRY: 'TR',
  PLN: 'PL',
  CZK: 'CZ',
  HUF: 'HU',
  RON: 'RO',
  RUB: 'RU',
  UAH: 'UA',
  VND: 'VN',
  TWD: 'TW',
  CLP: 'CL',
  COP: 'CO',
  PEN: 'PE',
  ARS: 'AR',
}

export function currencyFlagEmoji(code) {
  const c = String(code || '').trim().toUpperCase()
  const region = CURRENCY_FLAG_REGION[c]
  return region ? countryFlagEmoji(region) : '💱'
}

/** ISO 4217 → default currency for common countries (onboarding auto-hint). */
export const COUNTRY_CURRENCY_MAP = {
  US: 'USD',
  GB: 'GBP',
  IN: 'INR',
  MY: 'MYR',
  SG: 'SGD',
  AE: 'AED',
  AU: 'AUD',
  CA: 'CAD',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  IE: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  JP: 'JPY',
  CH: 'CHF',
  NZ: 'NZD',
  ZA: 'ZAR',
  NG: 'NGN',
  KE: 'KES',
  BR: 'BRL',
  MX: 'MXN',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  TR: 'TRY',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  BH: 'BHD',
  OM: 'OMR',
  IL: 'ILS',
  EG: 'EGP',
  PK: 'PKR',
  BD: 'BDT',
  PH: 'PHP',
  ID: 'IDR',
  TH: 'THB',
  VN: 'VND',
  KR: 'KRW',
  CN: 'CNY',
  HK: 'HKD',
  TW: 'TWD',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  RU: 'RUB',
  UA: 'UAH',
}

let countriesCache = null
let currenciesCache = null

/** ISO 3166-1 alpha-2 fallback when Intl.supportedValuesOf('region') is unavailable. */
const ISO_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ',
  'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET',
  'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU',
  'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT',
  'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ',
  'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ',
  'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA',
  'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'UM', 'US', 'UY', 'UZ',
  'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU',
  'WF', 'WS',
  'YE', 'YT',
  'ZA', 'ZM', 'ZW',
]

/** ISO 4217 fallback when Intl.supportedValuesOf('currency') is unavailable. */
const ISO_CURRENCY_CODES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD',
  'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK',
  'DJF', 'DKK', 'DOP', 'DZD',
  'EGP', 'ERN', 'ETB', 'EUR',
  'FJD', 'FKP',
  'GBP', 'GEL', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD',
  'HKD', 'HNL', 'HRK', 'HTG', 'HUF',
  'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK',
  'JMD', 'JOD', 'JPY',
  'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT',
  'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD',
  'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN',
  'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD',
  'OMR',
  'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG',
  'QAR',
  'RON', 'RSD', 'RUB', 'RWF',
  'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL',
  'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS',
  'UAH', 'UGX', 'USD', 'UYU', 'UZS',
  'VES', 'VND', 'VUV',
  'WST',
  'XAF', 'XCD', 'XOF', 'XPF',
  'YER',
  'ZAR', 'ZMW', 'ZWL',
]

function regionCodes() {
  try {
    if (typeof Intl?.supportedValuesOf === 'function') {
      const regions = Intl.supportedValuesOf('region').filter((c) => /^[A-Z]{2}$/.test(c))
      if (regions.length) return regions
    }
  } catch {
    /* Chromium/Node may expose supportedValuesOf but reject 'region' */
  }
  return ISO_COUNTRY_CODES
}

function currencyCodes() {
  try {
    if (typeof Intl?.supportedValuesOf === 'function') {
      const codes = Intl.supportedValuesOf('currency')
      if (codes.length) return codes
    }
  } catch {
    /* same as region */
  }
  return ISO_CURRENCY_CODES
}

function regionDisplayName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code
  } catch {
    return code
  }
}

function currencyDisplayName(code) {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' }).of(code) ?? code
  } catch {
    return code
  }
}

export function getAllCountries() {
  if (countriesCache) return countriesCache
  countriesCache = regionCodes()
    .map((code) => ({
      code,
      name: regionDisplayName(code),
      currency: COUNTRY_CURRENCY_MAP[code] ?? null,
    }))
    .filter((c) => c.name && c.name !== c.code)
    .sort((a, b) => a.name.localeCompare(b.name))
  countriesCache.push({ code: 'OTHER', name: 'Other', currency: null })
  return countriesCache
}

export function getAllCurrencies() {
  if (currenciesCache) return currenciesCache
  currenciesCache = currencyCodes()
    .map((code) => ({
      code,
      name: currencyDisplayName(code),
      flag: currencyFlagEmoji(code),
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
  return currenciesCache
}

export function currencyFromCountryCode(countryCode) {
  const c = String(countryCode || '').trim().toUpperCase()
  return COUNTRY_CURRENCY_MAP[c] ?? null
}

export function findCountryByCode(code) {
  return getAllCountries().find((c) => c.code === String(code || '').toUpperCase()) ?? null
}
