import { useLayoutEffect } from 'react'
import gsap from 'gsap'

export function useAuthStepAnimation(stepKey, containerRef) {
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
      )
    }, el)
    return () => ctx.revert()
  }, [stepKey, containerRef])
}
