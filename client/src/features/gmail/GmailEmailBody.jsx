import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'

const HEIGHT_PAD = 8
const MIN_IFRAME_PX = 120
const ABS_MAX_PX = 2400

function maxIframeHeightPx() {
  if (typeof window === 'undefined') return ABS_MAX_PX
  return Math.min(ABS_MAX_PX, Math.round(window.innerHeight * 0.85))
}

export default function GmailEmailBody({ html }) {
  const iframeRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const debounceTimerRef = useRef(null)
  const imageHandlersRef = useRef([])
  const [iframeHeight, setIframeHeight] = useState(MIN_IFRAME_PX)
  const [iframeOverflow, setIframeOverflow] = useState('hidden')

  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'div', 'span', 'blockquote', 'h1', 'h2', 'h3', 'h4'],
        ALLOWED_ATTR: ['href', 'src', 'style', 'class', 'target', 'rel', 'colspan', 'rowspan', 'width', 'height'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick'],
      }),
    [html],
  )

  const srcDoc = useMemo(
    () => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; height: auto; min-height: 100%; overflow-x: hidden; }
      body { padding: 12px 14px; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; font-size: 13px; line-height: 1.55; color: #0f1117; word-wrap: break-word; overflow-wrap: break-word; }
      a { color: #3b73f5; }
      img { max-width: 100%; height: auto; }
      blockquote { border-left: 2px solid #e3e7f0; margin: 8px 0; padding: 6px 12px; color: #8b93a8; font-size: 12px; }
      p { margin: 0 0 6px; }
      table { max-width: 100%; border-collapse: collapse; }
      img[width="1"], img[height="1"] { display: none !important; }
    </style>
  </head>
  <body>${clean}</body>
</html>`,
    [clean],
  )

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
  }, [])

  const disconnectObservers = useCallback(() => {
    clearDebounce()
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    imageHandlersRef.current.forEach(({ el, type, fn }) => el.removeEventListener(type, fn))
    imageHandlersRef.current = []
  }, [clearDebounce])

  const measureAndApply = useCallback(() => {
    const el = iframeRef.current
    if (!el) return
    const doc = el.contentDocument
    const body = doc?.body
    if (!body) return

    const cap = maxIframeHeightPx()
    const contentH = Math.max(body.scrollHeight, body.offsetHeight || 0) + HEIGHT_PAD
    const needsScroll = contentH > cap
    const nextH = needsScroll ? cap : Math.max(MIN_IFRAME_PX, contentH)
    setIframeHeight(nextH)
    setIframeOverflow(needsScroll ? 'auto' : 'hidden')
    if (doc.documentElement) {
      doc.documentElement.style.overflowY = needsScroll ? 'auto' : 'hidden'
      doc.documentElement.style.height = needsScroll ? '100%' : 'auto'
    }
    body.style.overflowY = needsScroll ? 'auto' : 'visible'
    body.style.height = needsScroll ? '100%' : 'auto'
  }, [])

  const debouncedMeasure = useCallback(() => {
    clearDebounce()
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      measureAndApply()
    }, 80)
  }, [clearDebounce, measureAndApply])

  const onIframeLoad = useCallback(() => {
    disconnectObservers()
    measureAndApply()

    const doc = iframeRef.current?.contentDocument
    const body = doc?.body
    if (!body) return

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => debouncedMeasure())
      ro.observe(body)
      resizeObserverRef.current = ro
    }

    const onImg = () => debouncedMeasure()
    body.querySelectorAll('img').forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', onImg, { once: true })
        imageHandlersRef.current.push({ el: img, type: 'load', fn: onImg })
      }
      img.addEventListener('error', onImg, { once: true })
      imageHandlersRef.current.push({ el: img, type: 'error', fn: onImg })
    })
  }, [debouncedMeasure, disconnectObservers, measureAndApply])

  useLayoutEffect(() => {
    return () => {
      disconnectObservers()
    }
  }, [disconnectObservers, srcDoc])

  useEffect(() => {
    const onWin = () => {
      window.requestAnimationFrame(() => measureAndApply())
    }
    window.addEventListener('resize', onWin)
    return () => window.removeEventListener('resize', onWin)
  }, [measureAndApply])

  return (
    <iframe
      ref={iframeRef}
      title="Email content"
      sandbox="allow-same-origin allow-popups"
      srcDoc={srcDoc}
      onLoad={onIframeLoad}
      style={{ height: iframeHeight, overflow: iframeOverflow }}
      className="block w-full min-h-[120px] border-0"
    />
  )
}
