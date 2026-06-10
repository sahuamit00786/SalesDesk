import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * ScrollTrigger batch reveal for elements matching `selector` inside `scopeRef`.
 */
export function useScrollReveal(scopeRef, selector = '[data-reveal]', options = {}) {
  const reduced = usePrefersReducedMotion()
  const ctxRef = useRef(null)

  useLayoutEffect(() => {
    if (reduced || !scopeRef.current) return undefined

    ctxRef.current = gsap.context(() => {
      ScrollTrigger.batch(selector, {
        start: options.start ?? 'top 88%',
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { opacity: 0, y: options.y ?? 24 },
            {
              opacity: 1,
              y: 0,
              duration: options.duration ?? 0.55,
              stagger: options.stagger ?? 0.08,
              ease: 'power3.out',
              overwrite: true,
            },
          )
        },
        once: true,
      })
    }, scopeRef)

    return () => {
      ctxRef.current?.revert()
      ctxRef.current = null
    }
  }, [reduced, scopeRef, selector, options.duration, options.stagger, options.start, options.y])
}
