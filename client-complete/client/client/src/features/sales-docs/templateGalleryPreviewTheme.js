/** @typedef {{ accentColor: string, headerTone?: 'light' | 'dark' } | null} GalleryPreviewTheme */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function expandHex3(s) {
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s)
  if (!m) return s
  return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`
}

function pickHex(...candidates) {
  for (const c of candidates) {
    const s = String(c || '').trim()
    if (HEX.test(s)) return expandHex3(s)
  }
  return ''
}

/** Skip near-white “accent” colors (library presets use them as text tints, not bars). */
function isTooLightForAccentBar(hex) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex)
  if (!m) return true
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const y = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return y > 0.88
}

/** Invoice `themeStyle` → accent for thumbnails (no hex stored on model yet). */
const INVOICE_THEME_STYLE_ACCENTS = {
  'gst-compliant': '#0d9488',
  gst: '#0d9488',
  minimal: '#64748b',
  enterprise: '#1e40af',
  saas: '#7c3aed',
  agency: '#db2777',
  retail: '#ea580c',
  'eu-vat': '#0369a1',
  proforma: '#57534e',
}

/**
 * Theme for gallery mini preview: match quotation `themeColor` / `accentOverride`,
 * invoice `sectionSettings.accentColor` or `themeStyle` fallback.
 * @param {'invoice' | 'quotation'} variant
 * @param {Record<string, unknown>} row
 * @returns {GalleryPreviewTheme}
 */
export function resolveGalleryPreviewTheme(variant, row) {
  if (!row || typeof row !== 'object') return null

  if (variant === 'quotation') {
    const hex = pickHex(row.accentOverride, row.themeColor)
    if (!hex || isTooLightForAccentBar(hex)) return null
    return { accentColor: hex, headerTone: 'light' }
  }

  const sec = row.sectionSettings && typeof row.sectionSettings === 'object' ? row.sectionSettings : {}
  const fromSettings = pickHex(sec.accentColor, sec.themeColor)
  if (fromSettings && !isTooLightForAccentBar(fromSettings)) {
    const headerTone = sec.headerTone === 'dark' ? 'dark' : 'light'
    return { accentColor: fromSettings, headerTone }
  }

  const styleKey = String(row.themeStyle || '')
    .toLowerCase()
    .trim()
  const mapped = INVOICE_THEME_STYLE_ACCENTS[styleKey]
  if (mapped) return { accentColor: mapped, headerTone: 'light' }

  return null
}
