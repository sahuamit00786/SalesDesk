import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * Full-viewport auth layout with GSAP entrance animations.
 * @param {'login'|'register'} variant
 */
export function AuthScreenShell({ variant = 'login', eyebrow, title, subtitle, visual, children }) {
  const rootRef = useRef(null)
  const visualRef = useRef(null)
  const glowRef = useRef(null)
  const cardRef = useRef(null)
  const textBlockRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        glowRef.current,
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' },
      )
      gsap.fromTo(
        visualRef.current,
        { opacity: 0, x: variant === 'register' ? -36 : -28 },
        { opacity: 1, x: 0, duration: 0.85, ease: 'power3.out', delay: 0.05 },
      )
      gsap.fromTo(
        textBlockRef.current?.children || [],
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.08,
          ease: 'power2.out',
          delay: 0.12,
        },
      )
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 28, filter: 'blur(6px)' },
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.75,
          ease: 'power3.out',
          delay: 0.18,
        },
      )
    }, rootRef)

    return () => ctx.revert()
  }, [variant, title])

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen w-full overflow-hidden bg-[#070a12] text-white"
    >
      <div
        ref={glowRef}
        className="pointer-events-none absolute -left-[20%] top-[-30%] h-[70vmin] w-[70vmin] rounded-full bg-brand-600/25 blur-[100px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-10%] bottom-[-20%] h-[55vmin] w-[55vmin] rounded-full bg-indigo-500/20 blur-[90px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1200px] flex-col lg:flex-row lg:items-stretch">
        <aside
          ref={visualRef}
          className="relative flex flex-1 flex-col justify-between px-6 pb-8 pt-10 sm:px-10 lg:max-w-[480px] lg:py-14"
        >
          <div ref={textBlockRef} className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200/90">{eyebrow}</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
            {subtitle ? (
              <p className="max-w-md text-sm leading-relaxed text-white/70 sm:text-base">{subtitle}</p>
            ) : null}
          </div>
          <div className="mt-10 hidden lg:block">{visual}</div>
        </aside>

        <main className="flex flex-1 items-center justify-center px-4 pb-12 pt-4 sm:px-8 lg:py-14">
          <div
            ref={cardRef}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
          >
            {children}
          </div>
        </main>
      </div>

      <div className="relative z-10 px-6 pb-8 lg:hidden">{visual}</div>
    </div>
  )
}
