/** Shared Gmail API message parsing (used by leadsController + push/history ingest). */

export function decodeGmailBase64(data) {
  if (!data) return ''
  const normalized = String(data).replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

export function parseHeader(headers, name) {
  const row = (headers || []).find(
    (h) => String(h?.name || '').toLowerCase() === String(name).toLowerCase(),
  )
  return row?.value || ''
}

export function parseAddressList(raw) {
  if (!raw) return []
  return String(raw)
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const m = chunk.match(/^(.*?)<(.+?)>$/)
      if (!m) return { name: chunk, email: chunk.toLowerCase() }
      return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim().toLowerCase() }
    })
}

export function extractMimePart(payload, mimeType) {
  if (!payload) return null
  if (payload.mimeType === mimeType && payload.body?.data) return payload.body.data
  for (const part of payload.parts || []) {
    const found = extractMimePart(part, mimeType)
    if (found) return found
  }
  return null
}

export function extractAttachmentMeta(payload, target = []) {
  if (!payload) return target
  if (payload.filename && payload.body?.attachmentId) {
    target.push({
      id: payload.body.attachmentId,
      fileName: payload.filename,
      mimeType: payload.mimeType || null,
      sizeBytes: payload.body?.size || null,
    })
  }
  for (const part of payload.parts || []) extractAttachmentMeta(part, target)
  return target
}

export function htmlToText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseGmailMessage(detail) {
  const payload = detail?.payload || {}
  const headers = payload.headers || []
  const from = parseAddressList(parseHeader(headers, 'From'))[0] || null
  const to = parseAddressList(parseHeader(headers, 'To'))
  const cc = parseAddressList(parseHeader(headers, 'Cc'))
  const subject = parseHeader(headers, 'Subject') || '(No subject)'
  const dateHeader = parseHeader(headers, 'Date')
  const rawHtml = extractMimePart(payload, 'text/html')
  const rawText = extractMimePart(payload, 'text/plain')
  const bodyHtml = decodeGmailBase64(rawHtml)
  const bodyText = decodeGmailBase64(rawText) || htmlToText(bodyHtml) || detail?.snippet || ''
  const sentAt = dateHeader ? new Date(dateHeader) : detail?.internalDate ? new Date(Number(detail.internalDate)) : new Date()
  return {
    subject,
    from,
    to,
    cc,
    bodyHtml,
    bodyText,
    snippet: detail?.snippet || '',
    sentAt: Number.isNaN(sentAt.getTime()) ? new Date() : sentAt,
    labels: detail?.labelIds || [],
    attachments: extractAttachmentMeta(payload, []),
    threadId: detail?.threadId || null,
    providerMessageId: detail?.id || null,
  }
}
