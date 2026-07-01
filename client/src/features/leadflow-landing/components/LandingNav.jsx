import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'

const nav = [
  { label: 'Tour', href: '#showcase' },
  { label: 'Features', href: '#features' },
  { label: 'Automation', href: '#automation' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-violet-100/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
        <a href="#top" className="flex items-center">
          <LeadNestLogo className="h-11 w-auto max-w-[13rem] sm:h-12 sm:max-w-[15rem]" />
        </a>

        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Marketing">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-violet-50 hover:text-violet-700"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:text-violet-700"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-600 active:scale-[0.98]"
          >
            Get started
            <ChevronRight size={14} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  )
}
