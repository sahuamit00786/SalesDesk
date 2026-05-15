import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Section } from '@/features/leadflow-landing/components/Section'

const ReportingCharts = lazy(() => import('./ReportingCharts.jsx'))

export function ReportingSection() {
  const ref = useRef(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setShow(true)
      },
      { rootMargin: '80px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Section ref={ref} className="relative overflow-hidden bg-gradient-to-b from-amber-50/30 via-violet-50/25 to-cyan-50/30">
      <div className="pointer-events-none absolute left-1/4 top-0 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Analytics</p>
          <h2 className="mt-2 bg-gradient-to-r from-amber-800 via-violet-800 to-cyan-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Reporting that leadership actually opens.
          </h2>
          <p className="mt-3 text-sm text-lf-muted sm:text-base">
            Funnels, KPIs, and revenue counters update as your team works — no weekly export ritual.
          </p>
        </div>
        <div className="mt-10">
          {show ? (
            <Suspense
              fallback={<div className="grid h-64 animate-pulse gap-6 rounded-2xl bg-lf-purple-50 lg:grid-cols-2" />}
            >
              <ReportingCharts />
            </Suspense>
          ) : (
            <div className="grid h-64 gap-6 rounded-2xl bg-lf-purple-50/50 lg:grid-cols-2" />
          )}
        </div>
      </div>
    </Section>
  )
}
