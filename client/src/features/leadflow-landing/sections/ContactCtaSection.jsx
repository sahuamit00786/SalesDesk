import { Link } from 'react-router-dom'
import { Mail, Phone, ChevronRight } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'

const EMAIL = 'sahuamit00786@gmail.com'
const PHONE = '+91 63869 23401'
const PHONE_TEL = '+916386923401'

export function ContactCtaSection() {
  return (
    <Section id="contact" className="relative overflow-hidden bg-violet-700 py-28">
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
        }}
        aria-hidden
      />
      {/* Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-y-1/2 rounded-full bg-violet-500/40 blur-[80px]" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[11px] font-bold tracking-[0.2em] text-white/80">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          GET STARTED
        </span>

        <h2 className="mt-6 font-display text-4xl font-bold tracking-[-0.025em] text-white sm:text-5xl">
          Ready to manage leads<br />
          <span className="text-violet-200">in one workspace?</span>
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-violet-200/80 sm:text-base">
          Create your workspace, invite your team, and start with leads, pipeline, email, and
          automation — or reach out directly.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/register"
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-7 text-sm font-semibold text-violet-800 shadow-lg transition hover:bg-violet-50 active:scale-[0.98]"
          >
            Create free account
            <ChevronRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <Mail size={16} aria-hidden />
            Email us
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-sm text-violet-300/70 sm:flex-row sm:justify-center sm:gap-8">
          <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-2 transition hover:text-white">
            <Mail size={16} aria-hidden />
            {EMAIL}
          </a>
          <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-2 transition hover:text-white">
            <Phone size={16} aria-hidden />
            {PHONE}
          </a>
        </div>
      </div>
    </Section>
  )
}
