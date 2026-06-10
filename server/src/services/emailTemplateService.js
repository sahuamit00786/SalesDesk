const CURLY_MERGE_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g
const AT_MERGE_REGEX = /@([a-z][a-z0-9_]*)/gi

const KNOWN_MERGE_KEYS = new Set([
  'first_name',
  'last_name',
  'contact_name',
  'name',
  'company',
  'designation',
  'email',
  'phone',
  'value',
  'deal_value',
  'source',
  'status',
  'city',
  'state',
  'country',
  'street',
  'postal_code',
  'title',
  'sender_name',
  'requirement',
])

function splitName(contactName) {
  const parts = String(contactName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  }
}

function formatLeadValue(lead) {
  if (lead?.value == null || lead?.value === '') return ''
  const num = Number(lead.value)
  if (Number.isNaN(num)) return String(lead.value)
  const currency = String(lead.valueCurrency || lead.value_currency || 'INR').toUpperCase()
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return String(num)
  }
}

function formatPhone(lead) {
  const code = String(lead.phoneCountryCode || lead.phone_country_code || '').trim()
  const phone = String(lead.phone || '').trim()
  if (!phone) return ''
  if (code && !phone.startsWith('+')) return `${code} ${phone}`.trim()
  return phone
}

function humanizeEnum(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

/** Build token map from a Sequelize lead row or plain object. */
export function leadTokenMap(lead = {}, senderName = '') {
  const split = splitName(lead.contactName || lead.name || lead.title || '')
  const contactName = String(lead.contactName || lead.contact_name || '').trim() || split.firstName
    ? `${split.firstName}${split.lastName ? ` ${split.lastName}` : ''}`.trim()
    : ''
  const formattedValue = formatLeadValue(lead)

  return {
    first_name: split.firstName || 'there',
    last_name: split.lastName || '',
    contact_name: contactName || 'there',
    name: contactName || split.firstName || 'there',
    company: String(lead.company || '').trim(),
    designation: String(lead.designation || '').trim(),
    email: String(lead.email || '').trim(),
    phone: formatPhone(lead),
    value: formattedValue,
    deal_value: formattedValue,
    source: humanizeEnum(lead.source?.name || lead.sourceName || lead.source || ''),
    status: humanizeEnum(lead.status || ''),
    city: String(lead.city || '').trim(),
    state: String(lead.state || '').trim(),
    country: String(lead.country || '').trim(),
    street: String(lead.street || '').trim(),
    postal_code: String(lead.postalCode || lead.postal_code || '').trim(),
    title: String(lead.title || '').trim(),
    requirement: String(lead.requirement || '').trim(),
    sender_name: String(senderName || '').trim(),
  }
}

function resolveValue(token, lead, senderName) {
  const map = leadTokenMap(lead, senderName)
  const key = String(token || '').trim().toLowerCase()
  const value = map[key]
  if (value == null) return ''
  return String(value)
}

function replaceMergePlaceholders(text, lead, senderName) {
  const replaceCurly = (_match, tokenRaw) => resolveValue(String(tokenRaw || '').trim(), lead, senderName)
  const replaceAt = (match, tokenRaw) => {
    const key = String(tokenRaw || '').toLowerCase()
    if (!KNOWN_MERGE_KEYS.has(key)) return match
    return resolveValue(key, lead, senderName)
  }
  return String(text || '')
    .replace(CURLY_MERGE_REGEX, replaceCurly)
    .replace(AT_MERGE_REGEX, replaceAt)
}

/** Normalize editor HTML for email clients (spacing, empty blocks). */
export function normalizeEmailBodyHtml(html) {
  let body = String(html || '').trim()
  if (!body) return '<p style="margin:0 0 16px;line-height:1.65;color:#1f2937;">&nbsp;</p>'

  body = body
    .replace(/<div([^>]*)>/gi, '<p$1>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/<p(\s|>)/gi, (m) => {
      if (m.includes('margin')) return m
      return '<p style="margin:0 0 16px;line-height:1.65;color:#1f2937;"'
    })
    .replace(/<li(\s|>)/gi, (m) => {
      if (m.includes('margin')) return m
      return '<li style="margin:0 0 8px;line-height:1.6;color:#1f2937;"'
    })
    .replace(/<ul(\s|>)/gi, '<ul style="margin:0 0 16px;padding-left:22px;line-height:1.6;color:#1f2937;"')
    .replace(/<ol(\s|>)/gi, '<ol style="margin:0 0 16px;padding-left:22px;line-height:1.6;color:#1f2937;"')
    .replace(/<h1(\s|>)/gi, '<h1 style="margin:0 0 12px;font-size:22px;line-height:1.35;color:#111827;"')
    .replace(/<h2(\s|>)/gi, '<h2 style="margin:0 0 12px;font-size:18px;line-height:1.4;color:#111827;"')
    .replace(/<h3(\s|>)/gi, '<h3 style="margin:0 0 10px;font-size:16px;line-height:1.45;color:#111827;"')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '</p><p style="margin:0 0 16px;line-height:1.65;color:#1f2937;">')

  if (!/<p[\s>]/i.test(body) && !/<ul[\s>]/i.test(body) && !/<ol[\s>]/i.test(body) && !/<h[1-6][\s>]/i.test(body)) {
    body = body
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map(
        (block) =>
          `<p style="margin:0 0 16px;line-height:1.65;color:#1f2937;">${block.replace(/\n/g, '<br/>')}</p>`,
      )
      .join('')
  }

  return body
}

/** Wrap resolved body in a simple responsive email shell. */
export function wrapEmailHtml(bodyInner) {
  const inner = normalizeEmailBodyHtml(bodyInner)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f3f4f6;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="padding:28px 32px 32px;font-size:15px;">
${inner}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/** Tokens referenced in subject/body (known merge keys only for @). */
export function extractMergeKeysFromTemplate(subject, bodyHtml) {
  const keys = new Set()
  const scan = (text) => {
    const s = String(text || '')
    for (const m of s.matchAll(CURLY_MERGE_REGEX)) {
      const k = String(m[1] || '').trim().toLowerCase()
      if (KNOWN_MERGE_KEYS.has(k)) keys.add(k)
    }
    for (const m of s.matchAll(AT_MERGE_REGEX)) {
      const k = String(m[1] || '').trim().toLowerCase()
      if (KNOWN_MERGE_KEYS.has(k)) keys.add(k)
    }
  }
  scan(subject)
  scan(bodyHtml)
  return [...keys]
}

const MERGE_FALLBACK_KEYS = new Set(['first_name', 'last_name', 'contact_name', 'name', 'sender_name'])

/** Fields empty after merge resolution (excluding keys with intentional fallbacks). */
export function missingMergeKeysForLead(subject, bodyHtml, lead, senderName = '') {
  const map = leadTokenMap(lead, senderName)
  return extractMergeKeysFromTemplate(subject, bodyHtml).filter((key) => {
    if (MERGE_FALLBACK_KEYS.has(key)) return false
    const v = map[key]
    return v == null || !String(v).trim()
  })
}

export function resolveMergeTags(templateSubject, templateBody, lead, { senderName = '', wrapBody = true } = {}) {
  const subject = replaceMergePlaceholders(templateSubject, lead, senderName)
  let bodyHtml = replaceMergePlaceholders(templateBody, lead, senderName)
  if (wrapBody) {
    bodyHtml = wrapEmailHtml(bodyHtml)
  } else {
    bodyHtml = normalizeEmailBodyHtml(bodyHtml)
  }
  return { subject, bodyHtml }
}

export function injectTrackingPixel(html, trackingUrl) {
  const pixel = `<img src="${trackingUrl}" alt="" width="1" height="1" style="display:block;width:1px;height:1px;opacity:0;" />`
  if (!html) return pixel
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`)
  }
  return `${html}${pixel}`
}

export function wrapLinksWithTracking(html, clickBaseUrl, logId) {
  if (!html) return ''
  return html.replace(/href=(["'])(https?:\/\/[^"']+)\1/gi, (_m, q, url) => {
    const tracked = `${clickBaseUrl}?log_id=${encodeURIComponent(logId)}&url=${encodeURIComponent(url)}`
    return `href=${q}${tracked}${q}`
  })
}

export function injectUnsubscribeLink(html, unsubscribeUrl) {
  const footer = `<p style="margin-top:28px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.5;color:#6b7280;">If you no longer want to receive these emails, <a href="${unsubscribeUrl}" style="color:#ea580c;text-decoration:underline;">unsubscribe here</a>.</p>`
  if (!html) return footer
  if (html.includes('</body>')) return html.replace('</body>', `${footer}</body>`)
  return `${html}${footer}`
}
