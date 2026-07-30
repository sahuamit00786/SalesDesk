import DOMPurify from 'dompurify'

const NOTE_SANITIZE = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'div', 'span', 'ul', 'ol', 'li', 'a', 'img'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt'],
}

export function sanitizeNoteHtml(html) {
  return DOMPurify.sanitize(html || '', NOTE_SANITIZE)
}

/** Plain-text excerpt of an HTML (or plain-text) note body, for single-line labels/titles. */
export function noteBodyToPlainText(body) {
  const raw = (body || '').trim()
  if (!raw) return ''
  const html = sanitizeNoteHtml(raw)
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim()
}

/** Rich notes from the lead editor are HTML; plain text gets wrapped in paragraphs. */
export function noteBodyToDisplayHtml(body) {
  const raw = (body || '').trim()
  if (!raw) return ''
  if (/<[a-z][\s\S]*>/i.test(raw)) return sanitizeNoteHtml(raw)
  return sanitizeNoteHtml(
    raw
      .split('\n')
      .map((line) => {
        const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<p>${esc || '<br>'}</p>`
      })
      .join(''),
  )
}
