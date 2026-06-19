import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight2 } from 'iconsax-react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { animate, createTimeline, stagger } from 'animejs'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { HERO_SCREENSHOT } from '@/features/leadflow-landing/landingScreenshots'
import { FloatingBg } from '@/features/leadflow-landing/components/FloatingBg'

gsap.registerPlugin(ScrollTrigger)

const FLOAT_CHIPS = [
  {
    id: 'deal',
    icon: '💰',
    title: 'Deal closed',
    sub: '$12,400 · Enterprise',
    color: 'text-emerald-700',
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    shadow: '0 4px 20px rgba(16,185,129,0.14)',
    cls: 'top-[4.5rem] left-4',
    delay: 0,
    dur: '3.4s',
  },
  {
    id: 'leads',
    icon: '📈',
    title: '42 new leads',
    sub: '+35% vs yesterday',
    color: 'text-violet-700',
    border: 'border-violet-200',
    bg: 'bg-violet-50',
    shadow: '0 4px 20px rgba(124,58,237,0.14)',
    cls: 'top-[4.5rem] right-4',
    delay: 200,
    dur: '4.1s',
  },
  {
    id: 'workflow',
    icon: '⚡',
    title: 'Workflow triggered',
    sub: 'Welcome email · sent',
    color: 'text-sky-700',
    border: 'border-sky-200',
    bg: 'bg-sky-50',
    shadow: '0 4px 20px rgba(14,165,233,0.14)',
    cls: 'bottom-12 right-4',
    delay: 400,
    dur: '3.8s',
  },
  {
    id: 'email',
    icon: '✉️',
    title: 'Email opened',
    sub: 'Priya S. · Q3 Proposal',
    color: 'text-cyan-700',
    border: 'border-cyan-200',
    bg: 'bg-cyan-50',
    shadow: '0 4px 20px rgba(6,182,212,0.14)',
    cls: 'bottom-12 left-4',
    delay: 600,
    dur: '2.9s',
  },
]

const ROTATE = [
  'Lead distribution & round-robin',
  'Full inbox inside the CRM',
  'Visual workflow automation',
  'Pipeline & deal management',
]

export function HeroSection() {
  const reduced = usePrefersReducedMotion()
  const heroRef = useRef(null)
  const imageRef = useRef(null)
  const rotateRef = useRef(null)
  const rotateIdx = useRef(0)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 64, damping: 18 })
  const sy = useSpring(my, { stiffness: 64, damping: 18 })
  const tiltX = useTransform(sy, [-80, 80], [3, -3])
  const tiltY = useTransform(sx, [-80, 80], [-3, 3])

  // Anime.js v4 entrance timeline
  useEffect(() => {
    if (reduced) return
    const tl = createTimeline({ defaults: { ease: 'outExpo' } })
    tl
      .add('[data-hero-badge]', { opacity: [0, 1], translateY: [-16, 0], duration: 600 })
      .add('[data-hero-title]', { opacity: [0, 1], translateY: [48, 0], duration: 900 }, '-=400')
      .add('[data-hero-sub]', { opacity: [0, 1], translateY: [24, 0], duration: 700 }, '-=600')
      .add('[data-hero-cta]', { opacity: [0, 1], translateY: [16, 0], scale: [0.96, 1], duration: 600, delay: stagger(80) }, '-=500')
      .add('[data-hero-frame]', { opacity: [0, 1], translateY: [56, 0], duration: 1100, ease: 'outBack(1.1)' }, '-=600')
  }, [reduced])

  // Rotating sub-heading
  useEffect(() => {
    if (reduced || !rotateRef.current) return
    const el = rotateRef.current
    const cycle = () => {
      rotateIdx.current = (rotateIdx.current + 1) % ROTATE.length
      animate(el, {
        opacity: [1, 0],
        translateY: [0, -8],
        duration: 280,
        ease: 'inExpo',
        onComplete: () => {
          el.textContent = ROTATE[rotateIdx.current]
          animate(el, { opacity: [0, 1], translateY: [8, 0], duration: 320, ease: 'outExpo' })
        },
      })
    }
    const id = setInterval(cycle, 2800)
    return () => clearInterval(id)
  }, [reduced])

  // GSAP parallax scroll on image
  useEffect(() => {
    if (reduced || !heroRef.current || !imageRef.current) return undefined
    const ctx = gsap.context(() => {
      gsap.to(imageRef.current, {
        y: -50,
        ease: 'none',
        scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, heroRef)
    return () => ctx.revert()
  }, [reduced])

  const onMove = (e) => {
    if (reduced || !heroRef.current) return
    const r = heroRef.current.getBoundingClientRect()
    mx.set((e.clientX - r.left - r.width / 2) / 22)
    my.set((e.clientY - r.top - r.height / 2) / 22)
  }
  const onLeave = () => { mx.set(0); my.set(0) }

  return (
    <section
      id="top"
      ref={heroRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden bg-white pb-0 pt-16 sm:pt-24"
    >
      {/* 3D floating bg elements */}
      <FloatingBg />

      {/* Subtle radial glow from top center */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(124,58,237,0.09) 0%, transparent 65%)',
        }}
        aria-hidden
      />
      {/* Dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(124,58,237,0.1) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <div
          data-hero-badge
          className="flex justify-center"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-[11px] font-bold tracking-[0.2em] text-violet-700">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
            LEAD MANAGEMENT WORKSPACE
          </span>
        </div>

        {/* Main headline */}
        <h1
          data-hero-title
          className="mt-7 text-center font-display text-5xl font-bold leading-[1.05] tracking-[-0.03em] text-[#0a0714] sm:text-6xl lg:text-[4.75rem]"
          style={reduced ? undefined : { opacity: 0 }}
        >
          Full lifecycle{' '}
          <span className="bg-gradient-to-r from-violet-700 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            lead management
          </span>
          <br />
          in one workspace.
        </h1>

        {/* Rotating sub-heading */}
        <div
          data-hero-sub
          className="mt-5 flex h-7 items-center justify-center"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <span
            ref={rotateRef}
            className="text-base font-semibold text-violet-600/70 sm:text-lg"
          >
            {ROTATE[0]}
          </span>
        </div>

        {/* Subtitle */}
        <p
          data-hero-sub
          className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-zinc-500 sm:text-base"
          style={reduced ? undefined : { opacity: 0 }}
        >
          LeadFlow CRM unifies leads, pipeline, email inbox, workflow automation, meetings,
          quotations, invoices, HR attendance, and team roles — built for high-velocity sales teams.
        </p>

        {/* CTAs */}
        <div
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <Link
            data-hero-cta
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-violet-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-600 active:scale-[0.98]"
          >
            Get started free
            <ArrowRight2 size={16} className="transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            data-hero-cta
            to="/login"
            className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold text-zinc-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            Sign in
          </Link>
        </div>

        {/* Social proof */}
        <div
          data-hero-cta
          className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-400"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Free workspace
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Full-featured from day one
          </span>
        </div>
      </div>

      {/* 3D Dashboard frame */}
      <div
        data-hero-frame
        className="relative z-10 mx-auto mt-16 max-w-[1100px] px-4 sm:mt-20 sm:px-6 lg:px-8"
        style={reduced ? undefined : { opacity: 0 }}
      >
        <motion.div
          ref={imageRef}
          style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1400, willChange: 'transform' }}
          className="relative"
        >
          {/* Colored drop shadow behind frame */}
          <div
            className="pointer-events-none absolute -bottom-4 left-1/2 h-16 w-4/5 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: 'rgba(124,58,237,0.18)' }}
            aria-hidden
          />

          {/* Frame */}
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.12),0_0_0_1px_rgba(124,58,237,0.06)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <div className="ml-4 flex h-6 flex-1 max-w-[220px] items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-medium text-zinc-400">app.connexify.io/dashboard</span>
              </div>
            </div>
            <img
              src={HERO_SCREENSHOT}
              alt="Connexify CRM dashboard"
              className="block w-full"
              loading="eager"
              style={{ imageRendering: 'auto' }}
            />
          </div>

          {/* Floating notification chips — lg+ only */}
          {FLOAT_CHIPS.map((chip) => (
            <div
              key={chip.id}
              className={[
                'pointer-events-none absolute z-20 hidden lg:flex items-center gap-2.5 rounded-xl border px-3 py-2',
                chip.bg,
                chip.border,
                chip.cls,
              ].join(' ')}
              style={{
                width: '11rem',
                boxShadow: chip.shadow,
                animation: `lf-bob ${chip.dur} ease-in-out infinite`,
                animationDelay: `${chip.delay}ms`,
              }}
            >
              <span className="text-base leading-none">{chip.icon}</span>
              <div className="min-w-0">
                <p className={`text-[11px] font-semibold truncate ${chip.color}`}>{chip.title}</p>
                <p className="text-[10px] text-zinc-400 truncate">{chip.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
