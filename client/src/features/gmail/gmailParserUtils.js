export function decodeGmailBase64(data) {
  if (!data) return ''
  try {
    const base64 = String(data).replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join(''),
    )
  } catch {
    return ''
  }
}

export function decodeHtmlEntities(str) {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

export function extractBody(payload, targetMime) {
  if (!payload) return null
  if (payload.mimeType === targetMime && payload.body?.data) return payload.body.data
  for (const part of payload.parts || []) {
    const found = extractBody(part, targetMime)
    if (found) return found
  }
  return null
}

export function getHeader(headers, name) {
  return headers?.find((h) => String(h.name || '').toLowerCase() === name.toLowerCase())?.value || ''
}

export function getInitials(name) {
  if (!name) return '??'
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export function parseEmailAddress(raw) {
  if (!raw) return { name: 'Unknown', email: '', initials: '??' }
  const match = String(raw).match(/^(.*?)\s*<(.+?)>$/)
  if (match) {
    const name = match[1].replace(/"/g, '').trim() || match[2]
    const email = match[2].trim()
    return { name, email, initials: getInitials(name) }
  }
  const value = String(raw).trim()
  return { name: value, email: value, initials: getInitials(value) }
}

export function parseAddressList(raw) {
  if (!raw) return []
  return String(raw)
    .split(',')
    .map((s) => parseEmailAddress(s.trim()))
}

export function extractAttachments(payload) {
  const atts = []
  function walk(part) {
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      atts.push({
        id: part.body.attachmentId,
        name: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: formatBytes(part.body.size || 0),
        icon: getFileIcon(part.filename),
        color: getFileColor(part.filename),
      })
    }
    for (const child of part.parts || []) walk(child)
  }
  walk(payload || {})
  return atts
}

export function removeTrackingPixels(html) {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('img').forEach((img) => {
    const w = Number.parseInt(img.getAttribute('width') || '999', 10)
    const h = Number.parseInt(img.getAttribute('height') || '999', 10)
    if (w <= 2 || h <= 2) img.remove()
  })
  return div.innerHTML
}

export function formatEmailDate(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) return ''
  const d = new Date(date)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  if (isThisYear) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Full date + time, used as a native tooltip (title attribute) alongside the compact formatEmailDate text. */
export function formatEmailDateTime(date) {
  if (!date || Number.isNaN(new Date(date).getTime())) return ''
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function parseGmailMessage(rawMsg) {
  const headers = rawMsg.payload?.headers || []
  const fromRaw = getHeader(headers, 'From')
  const toRaw = getHeader(headers, 'To')
  const ccRaw = getHeader(headers, 'Cc')
  const subject = getHeader(headers, 'Subject')
  const dateStr = getHeader(headers, 'Date')
  const htmlData = extractBody(rawMsg.payload, 'text/html')
  const textData = extractBody(rawMsg.payload, 'text/plain')
  let bodyHtml = htmlData ? decodeGmailBase64(htmlData) : ''
  let bodyText = textData ? decodeGmailBase64(textData) : ''
  if (!bodyHtml && bodyText) {
    bodyHtml = bodyText
      .split('\n')
      .map((line) => `<p style="margin:0 0 4px">${decodeHtmlEntities(line) || '&nbsp;'}</p>`)
      .join('')
  }
  bodyHtml = removeTrackingPixels(bodyHtml)
  const date = dateStr ? new Date(dateStr) : new Date()
  return {
    id: rawMsg.id,
    threadId: rawMsg.threadId,
    subject: subject || '(No subject)',
    from: parseEmailAddress(fromRaw),
    to: parseAddressList(toRaw),
    cc: parseAddressList(ccRaw),
    date,
    dateFormatted: formatEmailDate(date),
    bodyHtml,
    bodyText,
    snippet: decodeHtmlEntities(rawMsg.snippet || ''),
    attachments: extractAttachments(rawMsg.payload),
    isUnread: rawMsg.labelIds?.includes('UNREAD') ?? false,
    labelIds: rawMsg.labelIds || [],
  }
}

export function getUniqueParticipants(messages) {
  const seen = new Set()
  const out = []
  messages.forEach((m) => {
    if (!m?.from?.email || seen.has(m.from.email)) return
    seen.add(m.from.email)
    out.push(m.from)
  })
  return out
}

export function parseGmailThread(rawThread) {
  const messages = (rawThread.messages || []).map(parseGmailMessage)
  const first = messages[0]
  const last = messages[messages.length - 1]
  return {
    threadId: rawThread.id,
    subject: first?.subject || '(No subject)',
    participants: getUniqueParticipants(messages),
    messages,
    lastMessage: last || null,
    messageCount: messages.length,
    isUnread: messages.some((m) => m.isUnread),
    hasAttachments: messages.some((m) => m.attachments.length > 0),
    lastDate: last?.date,
    lastDateFormatted: last?.dateFormatted,
    snippet: last?.snippet || '',
  }
}

export function parseStoredThread(storedThread = []) {
  const messages = (storedThread || [])
    .map((msg) => {
      const date = new Date(msg.sentAt || msg.createdAt || Date.now())
      const senderRaw =
        msg.direction === 'inbound'
          ? msg.fromEmail || (Array.isArray(msg.toRecipients) ? '' : '') || 'Lead'
          : msg.fromEmail || 'You'
      return {
        id: msg.id,
        threadId: msg.threadId,
        subject: msg.subject || '(No subject)',
        from: parseEmailAddress(senderRaw),
        to: (msg.toRecipients || []).map((x) => parseEmailAddress(x)),
        cc: (msg.ccRecipients || []).map((x) => parseEmailAddress(x)),
        date,
        dateFormatted: formatEmailDate(date),
        bodyHtml: msg.bodyHtml || '',
        bodyText: msg.bodyText || '',
        snippet: decodeHtmlEntities((msg.bodyText || msg.bodyHtml || '').slice(0, 180)),
        attachments: (msg.attachments || []).map((att) => ({
          id: att.id || `${msg.id}-${att.fileName}`,
          name: att.fileName || 'Attachment',
          mimeType: att.mimeType || 'application/octet-stream',
          size: formatBytes(att.sizeBytes || 0),
          icon: getFileIcon(att.fileName || ''),
          color: getFileColor(att.fileName || ''),
          fileUrl: att.fileUrl || null,
        })),
        isUnread: false,
        labelIds: [],
      }
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const last = messages[messages.length - 1]
  return {
    threadId: messages[0]?.threadId || '',
    subject: messages[0]?.subject || '(No subject)',
    participants: getUniqueParticipants(messages),
    messages,
    lastMessage: last || null,
    messageCount: messages.length,
    isUnread: false,
    hasAttachments: messages.some((m) => m.attachments.length > 0),
    lastDate: last?.date,
    lastDateFormatted: last?.dateFormatted || '',
    snippet: last?.snippet || '',
  }
}

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename) {
  const ext = String(filename || '').split('.').pop()?.toLowerCase()
  const map = {
    pdf: 'pdf',
    xlsx: 'xls',
    xls: 'xls',
    csv: 'csv',
    docx: 'doc',
    doc: 'doc',
    pptx: 'ppt',
    ppt: 'ppt',
    png: 'img',
    jpg: 'img',
    jpeg: 'img',
    gif: 'img',
    webp: 'img',
    zip: 'zip',
    rar: 'zip',
  }
  return map[ext] || 'file'
}

function getFileColor(filename) {
  const icon = getFileIcon(filename)
  const map = {
    pdf: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    xls: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    csv: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    doc: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    ppt: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    img: { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    zip: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    file: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  }
  return map[icon] || map.file
}
