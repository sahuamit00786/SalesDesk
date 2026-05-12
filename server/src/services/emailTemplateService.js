const MERGE_TAG_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

function splitName(contactName) {
  const parts = String(contactName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  }
}

function leadTokenMap(lead = {}, senderName = '') {
  const split = splitName(lead.contactName || lead.name || '')
  return {
    first_name: split.firstName || 'there',
    last_name: split.lastName || '',
    company: lead.company || '',
    deal_value: lead.value != null ? String(lead.value) : '',
    sender_name: senderName || '',
    email: lead.email || '',
    phone: lead.phone || '',
  }
}

function resolveValue(token, lead, senderName) {
  const map = leadTokenMap(lead, senderName)
  const value = map[token]
  if (value == null) return ''
  return String(value)
}

export function resolveMergeTags(templateSubject, templateBody, lead, { senderName = '' } = {}) {
  const replace = (_match, tokenRaw) => resolveValue(String(tokenRaw || '').trim(), lead, senderName)
  return {
    subject: String(templateSubject || '').replace(MERGE_TAG_REGEX, replace),
    bodyHtml: String(templateBody || '').replace(MERGE_TAG_REGEX, replace),
  }
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
  const footer = `<p style="margin-top:24px;font-size:12px;color:#6b7280;">If you no longer want to receive these emails, <a href="${unsubscribeUrl}">unsubscribe here</a>.</p>`
  if (!html) return footer
  if (html.includes('</body>')) return html.replace('</body>', `${footer}</body>`)
  return `${html}${footer}`
}
