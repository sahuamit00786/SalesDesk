import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { FooterSection } from '@/features/leadflow-landing/sections/FooterSection'

/**
 * Shell for static legal / policy pages (Privacy, Terms).
 * Reuses the landing footer and a slim marketing-style header.
 */
export function LegalPageShell({ title, updated, description, children }) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = `${title} — LeadNest`
    let meta = document.querySelector('meta[name="description"]')
    let created = false
    const prevDesc = meta ? meta.getAttribute('content') : null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
      created = true
    }
    if (description) meta.setAttribute('content', description)
    return () => {
      document.title = prevTitle
      if (created) meta.remove()
      else if (prevDesc != null) meta.setAttribute('content', prevDesc)
    }
  }, [title, description])

  return (
    <div className="leadflow-landing min-h-screen bg-white text-[#0a0714]">
      <header className="sticky top-0 z-50 border-b border-violet-100/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center">
            <LeadNestLogo className="h-11 w-auto max-w-[13rem] sm:h-12 sm:max-w-[15rem]" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <ArrowLeft size={15} aria-hidden />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-600">Legal</p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-[#0a0714] sm:text-4xl">
          {title}
        </h1>
        {updated ? (
          <p className="mt-3 text-sm text-zinc-400">Last updated: {updated}</p>
        ) : null}

        <div className="legal-prose mt-10 space-y-8 text-[15px] leading-relaxed text-zinc-600">
          {children}
        </div>
      </main>

      <FooterSection />
    </div>
  )
}

/** Section heading + body block for legal pages. */
export function LegalSection({ heading, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-tight text-[#0a0714]">{heading}</h2>
      {children}
    </section>
  )
}
