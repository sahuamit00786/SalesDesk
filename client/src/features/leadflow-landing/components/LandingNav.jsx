import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { NAV_LINKS } from '@/features/leadflow-landing/landingContent'
import { CtaButton } from '@/features/leadflow-landing/components/primitives/CtaButton'

function scrollToAnchor(e, href) {
  const target = document.getElementById(href.slice(1))
  if (target) {
    e.preventDefault()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

/** Floating pill navbar — blurred glass, shrinks once the page scrolls. */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 24))

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav
        className={cn(
          'mx-auto flex items-center justify-between rounded-2xl border border-ln-line bg-white/70 px-4 backdrop-blur-[5px] transition-all duration-300 sm:px-5',
          scrolled ? 'max-w-4xl py-2 shadow-soft' : 'max-w-5xl py-3',
        )}
      >
        <Link to="/" className="flex shrink-0 items-center" aria-label="LeadNest home">
          <LeadNestLogo className="h-8 w-auto max-w-[10rem]" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              onClick={(e) => scrollToAnchor(e, href)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-ln-mut transition-colors hover:text-ln-ink"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            to="/login"
            className="px-3 py-2 text-sm font-medium text-ln-mut transition-colors hover:text-ln-ink"
          >
            Login
          </Link>
          <CtaButton href="#cta" variant="ghost">
            Book Demo
          </CtaButton>
          <CtaButton to="/register" variant="primary">
            Start Free
          </CtaButton>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <CtaButton to="/register" variant="primary" className="px-4 py-2 text-[13px]">
            Start Free
          </CtaButton>
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ln-line bg-white text-ln-ink"
          >
            {menuOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-5xl rounded-2xl border border-ln-line bg-white p-4 shadow-soft-lg lg:hidden"
          >
            <div className="flex flex-col">
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={(e) => {
                    scrollToAnchor(e, href)
                    setMenuOpen(false)
                  }}
                  className="rounded-lg px-3 py-3 text-[15px] font-medium text-ln-ink hover:bg-ln-bg2"
                >
                  {label}
                </a>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-ln-line pt-4">
                <CtaButton to="/login" variant="ghost" className="w-full">
                  Login
                </CtaButton>
                <CtaButton
                  href="#cta"
                  variant="primary"
                  className="w-full"
                  onClick={() => setMenuOpen(false)}
                >
                  Book Demo
                </CtaButton>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
