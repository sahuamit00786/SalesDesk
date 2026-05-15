import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'
import { GradientMesh } from '@/features/leadflow-landing/components/GradientMesh'
import { ParticleField } from '@/features/leadflow-landing/components/ParticleField'
import { MagneticWrap } from '@/features/leadflow-landing/components/MagneticWrap'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

const ROTATE = [
  'Omnichannel inbox',
  'AI meeting summaries',
  'Visual workflows',
  'Pipeline that never slips',
]

const stages = ['New', 'Qualified', 'Proposal', 'Won']

export function HeroSection() {
  const reduced = usePrefersReducedMotion()
  const [rotateIdx, setRotateIdx] = useState(0)
  const heroRef = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 64, damping: 18 })
  const sy = useSpring(my, { stiffness: 64, damping: 18 })
  const tiltX = useTransform(sy, [-80, 80], [6, -6])
  const tiltY = useTransform(sx, [-80, 80], [-6, 6])

  useEffect(() => {
    if (reduced) return undefined
    const id = window.setInterval(() => {
      setRotateIdx((i) => (i + 1) % ROTATE.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [reduced])

  useEffect(() => {
    if (reduced || !heroRef.current) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-hero-line]',
        { opacity: 0, y: 28 },
        {
          opacity: 1,
          y: 0,
          duration: 0.75,
          stagger: 0.1,
          ease: 'power3.out',
          delay: 0.12,
        },
      )
    }, heroRef)
    return () => ctx.revert()
  }, [reduced])

  const onMove = (e) => {
    if (reduced || !heroRef.current) return
    const r = heroRef.current.getBoundingClientRect()
    mx.set((e.clientX - r.left - r.width / 2) / 18)
    my.set((e.clientY - r.top - r.height / 2) / 18)
  }

  const onLeave = () => {
    mx.set(0)
    my.set(0)
  }

  const pipeline = useMemo(
    () => [
      { id: 1, title: 'Apex Labs', v: '$42k', s: 0 },
      { id: 2, title: 'Northwind', v: '$18k', s: 1 },
      { id: 3, title: 'Blue Ocean', v: '$96k', s: 2 },
      { id: 4, title: 'Vertex', v: '$12k', s: 1 },
    ],
    [],
  )

  return (
    <div
      id="top"
      ref={heroRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden bg-lf-page pb-16 pt-6 sm:pb-24 sm:pt-10"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-lf-grid bg-[length:44px_44px] opacity-50"
        aria-hidden
      />
      <GradientMesh />
      <ParticleField count={reduced ? 0 : 40} />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-10 lg:px-8">
        <div>
          <p
            data-hero-line
            className="inline-flex items-center gap-2 rounded-full border border-violet-200/90 bg-gradient-to-r from-white/95 to-violet-50/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-violet-800 shadow-md shadow-violet-300/20"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-[0_0_14px_2px_rgba(34,211,238,0.75)]" />
            AI-native revenue workspace
          </p>
          <h1
            data-hero-line
            className="mt-5 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-lf-ink sm:text-5xl lg:text-[3.25rem]"
          >
            Turn conversations
            <br />
            into{' '}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              revenue
            </span>
            .
          </h1>
          <div data-hero-line className="mt-4 h-7 text-base font-semibold text-transparent sm:text-lg">
            <motion.span
              key={rotateIdx}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text"
            >
              {ROTATE[rotateIdx]}
            </motion.span>
          </div>
          <p data-hero-line className="mt-3 max-w-xl text-sm leading-relaxed text-lf-muted sm:text-base">
            A complete lead management and sales automation platform with omnichannel communication, smart
            workflows, meetings, pipeline management, reporting, and team collaboration — all in one system.
          </p>
          <div data-hero-line className="mt-8 flex flex-wrap items-center gap-3">
            <MagneticWrap>
              <Link
                to="/register"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-700 via-fuchsia-600 to-violet-700 px-5 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110"
              >
                Start free trial
              </Link>
            </MagneticWrap>
            <MagneticWrap>
              <a
                href="#demo"
                className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-violet-300/80 bg-white/95 px-5 text-sm font-semibold text-violet-900 shadow-md transition hover:border-fuchsia-400 hover:bg-gradient-to-r hover:from-fuchsia-50 hover:to-violet-50"
              >
                Book a demo
              </a>
            </MagneticWrap>
            <MagneticWrap>
              <a
                href="#tour"
                className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-fuchsia-700 underline decoration-fuchsia-300 decoration-2 underline-offset-4 transition hover:text-cyan-700 hover:decoration-cyan-300"
              >
                Watch product tour
              </a>
            </MagneticWrap>
          </div>
          <div data-hero-line className="mt-10 flex flex-wrap items-center gap-4">
            <div className="flex -space-x-2">
              {['SJ', 'MR', 'AK', 'LP'].map((t, ai) => (
                <span
                  key={t}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md',
                    ai === 0 && 'bg-gradient-to-br from-violet-500 to-purple-700',
                    ai === 1 && 'bg-gradient-to-br from-cyan-500 to-blue-600',
                    ai === 2 && 'bg-gradient-to-br from-fuchsia-500 to-pink-600',
                    ai === 3 && 'bg-gradient-to-br from-amber-400 to-orange-600',
                  )}
                >
                  {t}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-lf-ink">Trusted by growing businesses</p>
              <p className="text-xs text-lf-muted">4.9/5 average rating across 2,400+ reviews</p>
            </div>
          </div>
        </div>

        <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1200 }} className="relative">
          <GlassPanel className="relative overflow-hidden p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-lf-muted">Live workspace</p>
                <p className="text-sm font-semibold text-lf-ink">Pipeline overview</p>
              </div>
              <span className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-emerald-500/30">
                +12% win rate
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 border-b border-violet-200/60 pb-3">
              {stages.map((s, si) => (
                <div
                  key={s}
                  className={cn(
                    'text-center text-[10px] font-bold uppercase tracking-wide',
                    si === 0 && 'text-sky-700',
                    si === 1 && 'text-violet-700',
                    si === 2 && 'text-fuchsia-700',
                    si === 3 && 'text-amber-700',
                  )}
                >
                  {s}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {stages.map((label, col) => {
                const colTint = [
                  'border-sky-200/80 bg-gradient-to-b from-sky-50/90 to-white',
                  'border-violet-200/80 bg-gradient-to-b from-violet-50/90 to-white',
                  'border-fuchsia-200/80 bg-gradient-to-b from-fuchsia-50/90 to-white',
                  'border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-white',
                ][col]
                return (
                <div
                  key={label}
                  className={cn(
                    'flex min-h-[180px] flex-col gap-2 rounded-xl border p-2 shadow-inner',
                    colTint,
                  )}
                >
                  <p className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-600">{label}</p>
                  {pipeline
                    .filter((l) => l.s === col)
                    .map((lead) => (
                      <motion.div
                        key={lead.id}
                        animate={reduced ? {} : { y: [0, -3, 0] }}
                        transition={{ duration: 2.5 + lead.id * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                        className="rounded-lg border border-white/80 bg-white/95 p-2 shadow-md ring-1 ring-violet-100/80"
                      >
                        <p className="truncate text-xs font-semibold text-lf-ink">{lead.title}</p>
                        <p className="text-[10px] font-semibold text-violet-600">{lead.v}</p>
                      </motion.div>
                    ))}
                </div>
                )
              })}
              <motion.div
                initial={false}
                animate={reduced ? {} : { opacity: [0, 1, 1, 0], y: [8, 0, 0, -6] }}
                transition={{ duration: 5, repeat: Infinity, times: [0, 0.15, 0.75, 1] }}
                className="pointer-events-none absolute right-2 top-2 max-w-[140px] rounded-lg border border-violet-300/80 bg-gradient-to-br from-violet-600 to-fuchsia-600 p-2 text-[10px] text-white shadow-lg shadow-fuchsia-500/25"
              >
                <p className="font-semibold">AI suggestion</p>
                <p className="mt-0.5 leading-snug">Follow up with a pricing recap in 24h.</p>
              </motion.div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-gradient-to-br from-sky-500/15 to-cyan-500/10 p-2 ring-1 ring-sky-200/60">
                <p className="text-[10px] font-medium text-sky-800">Meetings</p>
                <p className="text-sm font-bold text-sky-950">6 today</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-fuchsia-500/15 to-violet-500/10 p-2 ring-1 ring-fuchsia-200/60">
                <p className="text-[10px] font-medium text-fuchsia-900">Inbox</p>
                <p className="text-sm font-bold text-violet-950">WA · IG · FB</p>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-amber-400/20 to-orange-500/10 p-2 ring-1 ring-amber-200/70">
                <p className="text-[10px] font-medium text-amber-900">Forecast</p>
                <p className="text-sm font-bold text-orange-700">$1.2M</p>
              </div>
            </div>
          </GlassPanel>
          <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-tr from-fuchsia-500/35 via-violet-500/25 to-cyan-400/30 blur-2xl" />
        </motion.div>
      </div>
    </div>
  )
}
