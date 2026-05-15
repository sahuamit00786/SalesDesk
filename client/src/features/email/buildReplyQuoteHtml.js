import DOMPurify from 'dompurify'

const SANITIZE = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'div', 'span', 'blockquote', 'h1', 'h2', 'h3', 'h4'],
  ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'target', 'rel', 'colspan', 'rowspan', 'width', 'height'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
}

function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * HTML block quoted under the reply cursor (Gmail-style). Safe for contentEditable.
 */
export function buildReplyQuoteHtml(message) {
  if (!message) return '<p><br></p>'
  const fromLine = escAttr(
    [message.from?.name, message.from?.email].filter(Boolean).join(' ') || message.from?.email || 'Sender',
  )
  const when = escAttr(message.dateFormatted || '')
  const raw = message.bodyHtml || ''
  const clean = raw
    ? DOMPurify.sanitize(raw, SANITIZE)
    : DOMPurify.sanitize(
        (message.bodyText || '')
          .split('\n')
          .map((line) => `<p style="margin:0 0 4px">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;') || '&nbsp;'}</p>`)
          .join(''),
        SANITIZE,
      )
  return `<p><br></p><p style="color:#64748b;font-size:12px">On ${when}, ${fromLine} wrote:</p><blockquote style="margin:8px 0 0;padding:8px 12px;border-left:3px solid #e2e8f0;color:#334155">${clean}</blockquote><p><br></p>`
}
