import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { MagneticWrap } from '@/features/leadflow-landing/components/MagneticWrap'

const nav = [
  { label: 'Product', href: '#tour' },
  { label: 'Features', href: '#features' },
  { label: 'Pipeline', href: '#pipeline' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function LandingNav() {
  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 border-b border-violet-200/60 bg-white/80 shadow-[0_8px_30px_-10px_rgba(109,40,217,0.12)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/30 ring-2 ring-white/50">
            L
          </span>
          <span className="text-sm font-semibold tracking-tight text-lf-ink sm:text-base">
            LeadFlow <span className="bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent">AI</span>
          </span>
        </a>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Marketing">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-gradient-to-r hover:from-violet-50 hover:to-cyan-50 hover:text-violet-800"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-lf-muted transition hover:text-lf-ink"
          >
            Sign in
          </Link>
          <MagneticWrap>
            <Link
              to="/register"
              className={cn(
                'inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/35 transition hover:brightness-110',
              )}
            >
              Start free trial
            </Link>
          </MagneticWrap>
        </div>
      </div>
    </motion.header>
  )
}
