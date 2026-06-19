import { useCallback, useRef } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const SPRING = 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.4s ease'

export function use3DTilt({ max = 10, glare = true, lift = 14 } = {}) {
  const ref = useRef(null)
  const reduced = usePrefersReducedMotion()

  const onMove = useCallback(
    (e) => {
      if (reduced) return
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      const rX = (0.5 - y) * max * 2
      const rY = (x - 0.5) * max * 2
      el.style.transition = ''
      el.style.transform = `perspective(700px) rotateX(${rX}deg) rotateY(${rY}deg) translateZ(${lift}px)`
      if (glare) {
        const g = el.querySelector('[data-glare]')
        if (g) {
          g.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.11) 0%, transparent 65%)`
          g.style.opacity = '1'
        }
      }
    },
    [reduced, max, glare, lift],
  )

  const onLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transition = SPRING
    el.style.transform = `perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0px)`
    const g = el.querySelector('[data-glare]')
    if (g) g.style.opacity = '0'
  }, [])

  return { ref, onMove, onLeave }
}
