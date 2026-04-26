import { useMemo } from 'react'
import DOMPurify from 'dompurify'

export default function GmailEmailBody({ html }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'div', 'span', 'blockquote', 'h1', 'h2', 'h3', 'h4'],
        ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'target', 'rel', 'colspan', 'rowspan', 'width', 'height'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick'],
      }),
    [html],
  )

  const srcDoc = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      body { margin:0; padding: 14px 16px; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; font-size: 13px; line-height: 1.6; color: #0f1117; word-wrap: break-word; overflow-wrap: break-word; }
      a { color: #3b73f5; }
      img { max-width: 100%; height: auto; }
      blockquote { border-left: 2px solid #e3e7f0; margin: 8px 0; padding: 6px 12px; color: #8b93a8; font-size: 12px; }
      p { margin: 0 0 6px; }
      table { max-width: 100%; border-collapse: collapse; }
      img[width="1"], img[height="1"] { display: none !important; }
    </style>
  </head>
  <body>${clean}</body>
</html>`

  return (
    <iframe
      title="Email content"
      sandbox="allow-same-origin allow-popups"
      srcDoc={srcDoc}
      className="min-h-[180px] w-full border-0"
    />
  )
}
