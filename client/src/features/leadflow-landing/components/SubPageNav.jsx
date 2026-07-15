import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { CtaButton } from '@/features/leadflow-landing/components/primitives/CtaButton'

/**
 * Floating pill header for marketing subpages (About, Contact) that aren't
 * the home page — no section anchors here, just brand + a way back + CTAs.
 */
export function SubPageNav() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-ln-line bg-white/70 px-4 py-3 backdrop-blur-[5px] sm:px-5">
        <Link to="/" className="flex shrink-0 items-center" aria-label="LeadNest home">
          <LeadNestLogo className="h-8 w-auto max-w-[10rem]" />
        </Link>

        <Link
          to="/"
          className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ln-mut transition-colors hover:text-ln-ink sm:flex"
        >
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
          Back to home
        </Link>

        <div className="flex items-center gap-2.5">
          <Link
            to="/login"
            className="px-3 py-2 text-sm font-medium text-ln-mut transition-colors hover:text-ln-ink"
          >
            Login
          </Link>
          <CtaButton to="/register" variant="primary">
            Start Free
          </CtaButton>
        </div>
      </nav>
    </header>
  )
}
