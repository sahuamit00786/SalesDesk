import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/utils/cn'

/** Logical A4 at 96dpi — matches SalesDocumentPreview / print sheet */
const A4_W = 794
const A4_H = 1123

/**
 * Scales a 794×1123pt document inside the available box.
 * - `fit="contain"` keeps full page visible (letterboxed inside the viewport).
 * - `fit="width"` uses full available width with fixed A4 aspect (clips if viewport is short).
 * - `fit="fillWidth"` scales to full viewport width up to 1:1; page may extend below — scroll the viewport.
 */
export function ScaledA4PreviewViewport({
  children,
  className,
  fit = 'contain',
  emphasizePaper = false,
  /** Lighter single shadow — use in modals instead of heavy `emphasizePaper`. */
  minimalChrome = false,
}) {
  const ref = useRef(null)
  const [scale, setScale] = useState(0.35)

  const isFillWidth = fit === 'fillWidth'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const run = () => {
      const { width: w, height: h } = el.getBoundingClientRect()
      if (w < 4) return
      let s
      if (isFillWidth) {
        s = Math.min(1, w / A4_W)
      } else if (fit === 'width') {
        if (h < 4) return
        s = w / A4_W
      } else {
        if (h < 4) return
        s = Math.min(w / A4_W, h / A4_H)
      }
      setScale(Number.isFinite(s) && s > 0 ? s : 0.35)
    }
    run()
    const ro = new ResizeObserver(run)
    ro.observe(el)
    return () => ro.disconnect()
  }, [fit, isFillWidth])

  const paperFrame = minimalChrome
    ? 'rounded-md bg-white shadow-lg ring-1 ring-neutral-200/80'
    : emphasizePaper
      ? 'rounded-sm bg-[#fafaf9] shadow-[0_22px_64px_-14px_rgba(0,0,0,0.28),0_6px_18px_-4px_rgba(0,0,0,0.12)] ring-1 ring-neutral-900/12'
      : 'rounded-md bg-white shadow-md ring-1 ring-neutral-900/5'

  /* fillWidth: scroll only on an ancestor. Inner absolute+scale = full 794×1123 layout scaled into the clip box. */
  return (
    <div
      ref={ref}
      className={cn(
        'relative w-full',
        isFillWidth ? 'overflow-x-hidden overflow-y-visible' : 'min-h-0 flex-1 overflow-hidden',
        fit === 'width' && !isFillWidth && 'aspect-[794/1123] flex-none',
        className,
      )}
    >
      {isFillWidth ? (
        <div
          className={cn('relative mx-auto overflow-hidden', paperFrame)}
          style={{
            width: A4_W * scale,
            height: A4_H * scale,
            flexShrink: 0,
          }}
        >
          <div
            className="absolute left-0 top-0"
            style={{
              width: A4_W,
              height: A4_H,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {children}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-start justify-center">
          <div
            className={cn('relative overflow-hidden', paperFrame)}
            style={{
              width: A4_W * scale,
              height: A4_H * scale,
              flexShrink: 0,
            }}
          >
            <div
              className="absolute left-0 top-0"
              style={{
                width: A4_W,
                height: A4_H,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
