import { useLayoutEffect, useRef } from 'react'
import { animate, createTimeline, stagger } from 'animejs'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

export function useOnboardingStepAnimation(stepKey, panelRef) {
  const reduced = usePrefersReducedMotion()
  const prevKey = useRef(stepKey)

  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el || reduced) {
      if (el) {
        el.style.opacity = '1'
        el.style.transform = 'none'
      }
      prevKey.current = stepKey
      return undefined
    }

    const direction = stepKey > prevKey.current ? 1 : -1
    prevKey.current = stepKey

    const tl = createTimeline({ defaults: { ease: 'outExpo' } })
    tl.add(el, {
      opacity: [direction > 0 ? 0 : 1, 1],
      translateX: [direction > 0 ? 32 : -32, 0],
      duration: 420,
    })

  }, [stepKey, panelRef, reduced])

  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el || reduced) return undefined

    const choices = el.querySelectorAll('[data-choice]')
    if (!choices.length) return undefined

    animate(choices, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 380,
      ease: 'outExpo',
      delay: stagger(40),
    })
  }, [stepKey, panelRef, reduced])
}
