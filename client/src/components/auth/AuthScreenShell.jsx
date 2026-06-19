import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { FloatingBg } from '@/features/leadflow-landing/components/FloatingBg'

/**
 * Full-viewport auth layout — white + violet theme with floating shapes (matches landing).
 * @param {'login'|'register'} variant
 */
export function AuthScreenShell({ variant = 'login', brand, eyebrow, title, subtitle, visual, children }) {
  const rootRef = useRef(null)
  const visualRef = useRef(null)
  const cardRef = useRef(null)
  const textBlockRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        textBlockRef.current?.children || [],
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.09,
          ease: 'power2.out',
          delay: 0.08,
        },
      )
      gsap.fromTo(
        visualRef.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', delay: 0.22 },
      )
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 32, scale: 0.98 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'power3.out',
          delay: 0.14,
        },
      )
    }, rootRef)

    return () => ctx.revert()
  }, [variant, title])

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-white via-violet-50/50 to-fuchsia-50/30 text-[#0a0714]"
    >
      <FloatingBg />

      <div className="pointer-events-none absolute -left-32 top-[-10%] h-[min(520px,70vw)] w-[min(520px,70vw)] rounded-full bg-violet-400/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-[-8%] h-[min(440px,60vw)] w-[min(440px,60vw)] rounded-full bg-fuchsia-400/10 blur-3xl" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-14 lg:px-8 lg:py-12">
        <aside className="flex flex-1 flex-col lg:max-w-[28rem]">
          <div ref={textBlockRef} className="space-y-5">
            {brand ? (
              <div className="w-fit">{brand}</div>
            ) : eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">{eyebrow}</p>
            ) : null}
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#0a0714] sm:text-4xl lg:text-[2.65rem]">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-md text-base leading-relaxed text-zinc-500">{subtitle}</p>
            ) : null}
          </div>
          <div ref={visualRef} className="mt-8 hidden lg:block">{visual}</div>
        </aside>

        <main className="mt-8 flex flex-1 justify-center lg:mt-0 lg:justify-end">
          <div
            ref={cardRef}
            className="w-full max-w-md rounded-3xl border border-violet-100/90 bg-white/95 p-6 shadow-[0_24px_80px_rgba(124,58,237,0.14),0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:p-8"
          >
            {children}
          </div>
        </main>

        {visual ? <div className="mt-8 lg:hidden">{visual}</div> : null}
      </div>
    </div>
  )
}

/** Shared link style for auth footers */
export const authLinkClassName = 'font-semibold text-violet-700 transition hover:text-violet-900'
