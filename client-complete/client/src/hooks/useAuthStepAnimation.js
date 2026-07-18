import { useEffect } from 'react'

/**
 * Animate a step container into view when stepKey changes.
 * Uses CSS transitions instead of GSAP for smaller bundle footprint.
 */
export function useAuthStepAnimation(stepKey, containerRef) {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Reset to start state
    el.style.opacity = '0'
    el.style.transform = 'translateX(20px)'
    el.style.transition = 'none'

    // Force reflow to apply initial state before animating
    void el.offsetWidth

    // Animate to end state
    el.style.transition = 'opacity 0.45s ease, transform 0.45s ease'
    el.style.opacity = '1'
    el.style.transform = 'translateX(0)'

    return () => {
      if (el) {
        el.style.transition = 'none'
      }
    }
  }, [stepKey, containerRef])
}
