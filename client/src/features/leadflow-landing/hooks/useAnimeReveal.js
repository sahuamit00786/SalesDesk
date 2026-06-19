import { useLayoutEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * Scroll-reveal using anime.js v4 + IntersectionObserver.
 * Replaces the GSAP ScrollTrigger batch reveal.
 */
export function useAnimeReveal(scopeRef, selector = '[data-reveal]', options = {}) {
  const reduced = usePrefersReducedMotion()
  const observerRef = useRef(null)

  useLayoutEffect(() => {
    if (reduced || !scopeRef.current) return undefined

    const elements = Array.from(scopeRef.current.querySelectorAll(selector))
    if (!elements.length) return undefined

    // Set initial hidden state
    elements.forEach((el) => {
      el.style.opacity = '0'
      el.style.transform = `translateY(${options.y ?? 28}px) rotateX(${options.rotateX ?? 10}deg)`
      el.style.transformOrigin = 'top center'
      el.style.willChange = 'transform, opacity'
    })

    const pending = new Set(elements)

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target)
        if (!visible.length) return
        visible.forEach((el) => {
          pending.delete(el)
          observerRef.current?.unobserve(el)
        })
        animate(visible, {
          opacity: [0, 1],
          translateY: [options.y ?? 28, 0],
          rotateX: [options.rotateX ?? 10, 0],
          duration: options.duration ?? 700,
          ease: 'outExpo',
          delay: stagger(options.stagger ?? 70),
          onComplete: (anim) => {
            // Clean up will-change after animation
            anim.targets.forEach((el) => { el.style.willChange = '' })
          },
        })
      },
      { threshold: options.threshold ?? 0.1, rootMargin: '0px 0px -4% 0px' },
    )

    elements.forEach((el) => observerRef.current.observe(el))

    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [reduced, scopeRef, selector])
}
