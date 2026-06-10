import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Play } from 'lucide-react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { HERO_SCREENSHOT } from '@/features/leadflow-landing/landingScreenshots'

gsap.registerPlugin(ScrollTrigger)

const ROTATE = [
  'Lead distribution & round-robin',
  'Full inbox inside the CRM',
  'Visual workflow automation',
  'Pipeline & deal management',
]

export function HeroSection() {
  const reduced = usePrefersReducedMotion()
  const [rotateIdx, setRotateIdx] = useState(0)
  const heroRef = useRef(null)
  const imageRef = useRef(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 64, damping: 18 })
  const sy = useSpring(my, { stiffness: 64, damping: 18 })
  const tiltX = useTransform(sy, [-80, 80], [3, -3])
  const tiltY = useTransform(sx, [-80, 80], [-3, 3])

  useEffect(() => {
    if (reduced) return undefined
    const id = window.setInterval(() => {
      setRotateIdx((i) => (i + 1) % ROTATE.length)
    }, 2800)
    return () => window.clearInterval(id)
  }, [reduced])

  useEffect(() => {
    if (reduced || !heroRef.current) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-hero-line]',
        { opacity: 0, y: 36 },
        { opacity: 1, y: 0, duration: 0.85, stagger: 0.13, ease: 'power3.out', delay: 0.08 },
      )
      if (imageRef.current) {
        gsap.to(imageRef.current, {
          y: -55,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        })
      }
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
      className="relative overflow-hidden bg-[#050510] pb-0 pt-16 sm:pt-24"
    >
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* Central top glow */}
        <div className="absolute left-1/2 top-0 h-[580px] w-[1000px] -translate-x-1/2 rounded-full bg-violet-600/[0.13] blur-[140px]" />
        {/* Side orbs */}
        <div className="absolute -left-60 top-1/4 h-[500px] w-[500px] rounded-full bg-purple-900/[0.18] blur-[110px]" />
        <div className="absolute -right-60 top-1/3 h-[450px] w-[450px] rounded-full bg-indigo-900/[0.12] blur-[100px]" />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050510] to-transparent" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.06) 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage:
              'radial-gradient(ellipse 90% 60% at 50% 0%, black 30%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Badge */}
        <div
          data-hero-line
          className="flex justify-center"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/[0.08] px-4 py-1.5 text-[11px] font-bold tracking-[0.2em] text-violet-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-[lf-pulse-glow_2s_ease-in-out_infinite] rounded-full bg-violet-400" />
            LEAD MANAGEMENT WORKSPACE
          </span>
        </div>

        {/* Main headline */}
        <h1
          data-hero-line
          className="mt-7 text-center font-display text-5xl font-bold leading-[1.05] tracking-[-0.025em] text-white sm:text-6xl lg:text-[4.5rem]"
          style={reduced ? undefined : { opacity: 0 }}
        >
          Full lifecycle{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
            lead management
          </span>
          <br />
          in one workspace.
        </h1>

        {/* Rotating feature */}
        <div
          data-hero-line
          className="mt-5 flex h-8 items-center justify-center"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <motion.span
            key={rotateIdx}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.38 }}
            className="text-base font-semibold text-violet-300/70 sm:text-lg"
          >
            {ROTATE[rotateIdx]}
          </motion.span>
        </div>

        {/* Subtitle */}
        <p
          data-hero-line
          className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-white/40 sm:text-base"
          style={reduced ? undefined : { opacity: 0 }}
        >
          LeadFlow CRM unifies leads, pipeline, email inbox, workflow automation, meetings, quotations,
          invoices, HR attendance, and team roles — built for high-velocity sales teams.
        </p>

        {/* CTAs */}
        <div
          data-hero-line
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <Link
            to="/register"
            className="group inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] transition hover:bg-violet-500 hover:shadow-[0_0_44px_rgba(139,92,246,0.7)] active:scale-[0.98]"
          >
            Get started free
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/70 backdrop-blur-sm transition hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white"
          >
            Sign in
          </Link>
          <a
            href="#showcase"
            className="inline-flex items-center gap-1.5 px-2 py-3 text-sm font-medium text-violet-400/70 underline decoration-violet-500/35 decoration-2 underline-offset-4 transition hover:text-violet-300"
          >
            <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
            See product screens
          </a>
        </div>

        {/* Social proof strip */}
        <div
          data-hero-line
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30"
          style={reduced ? undefined : { opacity: 0 }}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
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

      {/* 3D Dashboard screenshot */}
      <div className="relative z-10 mx-auto mt-16 max-w-[1100px] px-4 sm:mt-20 sm:px-6 lg:px-8">
        <motion.div
          ref={imageRef}
          style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1400 }}
          className="relative"
        >
          {/* Purple glow behind */}
          <div
            className="pointer-events-none absolute -inset-2 rounded-[2rem] opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 75% 35% at 50% 105%, rgba(139,92,246,0.4), transparent 70%)',
            }}
            aria-hidden
          />
          {/* Outer ambient ring */}
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-40"
            style={{
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.5) 0%, rgba(255,255,255,0.04) 40%, rgba(34,211,238,0.2) 100%)',
              padding: '1px',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            aria-hidden
          />
          {/* Frame */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0820] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_40px_100px_rgba(0,0,0,0.7),0_0_60px_rgba(139,92,246,0.1)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/[0.05] bg-[#07071a] px-5 py-3.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e] opacity-80" />
              <span className="h-3 w-3 rounded-full bg-[#28c840] opacity-80" />
              <div className="ml-4 flex h-6 flex-1 max-w-[220px] items-center gap-1.5 rounded-md bg-white/[0.05] px-3">
                <div className="h-1.5 w-1.5 rounded-full bg-green-400/50" />
                <span className="text-[10px] font-medium text-white/20">
                  app.connexify.io/dashboard
                </span>
              </div>
            </div>
            <img
              src={HERO_SCREENSHOT}
              alt="Connexify CRM dashboard — leads, pipeline, and team workspace"
              className="w-full"
              loading="eager"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
