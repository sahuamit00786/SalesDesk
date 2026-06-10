import { Link } from 'react-router-dom'
import { Mail, Phone, ArrowRight } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { MagneticWrap } from '@/features/leadflow-landing/components/MagneticWrap'

const EMAIL = 'sahuamit00786@gmail.com'
const PHONE = '+91 63869 23401'
const PHONE_TEL = '+916386923401'

export function ContactCtaSection() {
  return (
    <Section id="contact" className="relative overflow-hidden bg-[#080820] py-28">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.12] blur-[120px]" />
        <div className="absolute left-0 top-0 h-[400px] w-[400px] rounded-full bg-purple-900/[0.1] blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-indigo-900/[0.08] blur-[100px]" />
        {/* Grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        {/* Top glow pill */}
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/[0.08] px-4 py-1.5 text-[11px] font-bold tracking-[0.2em] text-violet-300">
          <span className="h-1.5 w-1.5 animate-[lf-pulse-glow_2s_ease-in-out_infinite] rounded-full bg-violet-400" />
          GET STARTED
        </span>

        <h2 className="mt-6 font-display text-4xl font-bold tracking-[-0.025em] text-white sm:text-5xl">
          Ready to manage leads<br />
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
            in one workspace?
          </span>
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/45 sm:text-base">
          Create your workspace, invite your team, and start with leads, pipeline, email, and
          automation — or reach out directly.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <MagneticWrap>
            <Link
              to="/register"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 text-sm font-semibold text-white shadow-[0_0_30px_rgba(139,92,246,0.5)] transition hover:bg-violet-500 hover:shadow-[0_0_44px_rgba(139,92,246,0.7)]"
            >
              Create free account
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </MagneticWrap>
          <MagneticWrap>
            <a
              href={`mailto:${EMAIL}`}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-7 text-sm font-semibold text-white/75 backdrop-blur-sm transition hover:border-violet-500/40 hover:bg-white/[0.07] hover:text-white"
            >
              <Mail className="h-4 w-4" aria-hidden />
              Email us
            </a>
          </MagneticWrap>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 text-sm text-white/30 sm:flex-row sm:justify-center sm:gap-8">
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex items-center gap-2 transition hover:text-white/60"
          >
            <Mail className="h-4 w-4 shrink-0" aria-hidden />
            {EMAIL}
          </a>
          <a
            href={`tel:${PHONE_TEL}`}
            className="inline-flex items-center gap-2 transition hover:text-white/60"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            {PHONE}
          </a>
        </div>
      </div>
    </Section>
  )
}
