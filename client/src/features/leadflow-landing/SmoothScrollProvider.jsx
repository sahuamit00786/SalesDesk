import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Smooth scroll + ScrollTrigger sync for the marketing page only.
 */
export function SmoothScrollProvider({ children, disabled }) {
  useEffect(() => {
    if (disabled) return undefined

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      autoRaf: true,
    })

    lenis.on('scroll', ScrollTrigger.update)

    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true })
        }
        return lenis.scroll
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight }
      },
      pinType: document.documentElement.style.transform ? 'transform' : 'fixed',
    })

    const onResize = () => {
      lenis.resize()
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      lenis.destroy()
      ScrollTrigger.scrollerProxy(document.documentElement, {})
      ScrollTrigger.refresh()
    }
  }, [disabled])

  return children
}
