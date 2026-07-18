import { useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Building2, Check, Mail, Phone, Send } from '@/components/ui/icons'
import { useDocumentMeta } from '@/features/leadflow-landing/hooks/useDocumentMeta'
import { SubPageNav } from '@/features/leadflow-landing/components/SubPageNav'
import { FooterSection } from '@/features/leadflow-landing/sections/FooterSection'
import { FadeUp } from '@/features/leadflow-landing/components/primitives/FadeUp'
import { UPGROW } from '@/features/leadflow-landing/landingContent'

function ContactCard() {
  return (
    <div className="rounded-card border border-ln-line bg-white p-7 shadow-soft">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ln-bg2">
        <Building2 size={18} strokeWidth={1.75} className="text-ln-ink" aria-hidden />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ln-ink">{UPGROW.companyName}</p>
      <p className="mt-1 text-sm text-ln-mut">The company behind LeadNest.</p>

      <div className="mt-6 space-y-3.5 border-t border-ln-line pt-6">
        <a
          href={`mailto:${UPGROW.email}`}
          className="flex items-center gap-3 text-sm text-ln-ink transition-colors hover:text-ln-accent"
        >
          <Mail size={16} strokeWidth={1.75} className="text-ln-mut" />
          {UPGROW.email}
        </a>
        <a
          href={`tel:${UPGROW.phoneTel}`}
          className="flex items-center gap-3 text-sm text-ln-ink transition-colors hover:text-ln-accent"
        >
          <Phone size={16} strokeWidth={1.75} className="text-ln-mut" />
          {UPGROW.phone}
        </a>
      </div>
    </div>
  )
}

// Front-end only for now — wire to a real inbox/CRM endpoint later
function ContactForm() {
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-card border border-ln-line bg-white p-10 text-center shadow-soft">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <Check size={22} strokeWidth={1.75} className="text-emerald-600" />
        </span>
        <p className="mt-4 text-lg font-semibold text-ln-ink">Message sent</p>
        <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ln-mut">
          Thanks for reaching out — {UPGROW.companyName} will get back to you shortly.
        </p>
      </div>
    )
  }

  return (
    <form
      className="rounded-card border border-ln-line bg-white p-7 shadow-soft"
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="text-sm font-medium text-ln-ink">
            Name
          </label>
          <input
            id="c-name"
            type="text"
            required
            placeholder="Jane Cooper"
            className="mt-2 h-11 w-full rounded-field border border-ln-line bg-white px-4 text-sm text-ln-ink placeholder:text-neutral-400 focus:border-ln-accent focus:outline-none focus:ring-2 focus:ring-ln-accent/15"
          />
        </div>
        <div>
          <label htmlFor="c-email" className="text-sm font-medium text-ln-ink">
            Email
          </label>
          <input
            id="c-email"
            type="email"
            required
            placeholder="jane@company.com"
            className="mt-2 h-11 w-full rounded-field border border-ln-line bg-white px-4 text-sm text-ln-ink placeholder:text-neutral-400 focus:border-ln-accent focus:outline-none focus:ring-2 focus:ring-ln-accent/15"
          />
        </div>
      </div>
      <div className="mt-5">
        <label htmlFor="c-message" className="text-sm font-medium text-ln-ink">
          Message
        </label>
        <textarea
          id="c-message"
          required
          rows={5}
          placeholder="Tell us a bit about your team and what you're looking for."
          className="mt-2 w-full resize-none rounded-field border border-ln-line bg-white px-4 py-3 text-sm text-ln-ink placeholder:text-neutral-400 focus:border-ln-accent focus:outline-none focus:ring-2 focus:ring-ln-accent/15"
        />
      </div>
      <button
        type="submit"
        className="mt-6 inline-flex items-center gap-2 rounded-btn bg-ln-btn px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ln-btnh"
      >
        Send message
        <Send size={15} strokeWidth={1.75} />
      </button>
    </form>
  )
}

export function ContactPage() {
  useDocumentMeta(
    'Contact — LeadNest',
    `Get in touch with ${UPGROW.companyName}, the team behind LeadNest.`,
  )

  return (
    <MotionConfig reducedMotion="user">
      <div className="leadflow-landing min-h-screen bg-white">
        <SubPageNav />
        <main>
          <section className="relative overflow-hidden pb-16 pt-40 md:pb-20 md:pt-48">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,rgba(124,58,237,0.06),transparent_60%)]"
            />
            <div className="mx-auto max-w-3xl px-6 text-center">
              <FadeUp>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ln-accent">
                  Contact us
                </p>
                <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-ln-ink md:text-5xl">
                  Talk to {UPGROW.companyName}
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ln-mut">
                  Questions about LeadNest, a demo, or anything else — reach out and we&rsquo;ll
                  get back to you personally.
                </p>
              </FadeUp>
            </div>
          </section>

          <section className="pb-24 md:pb-32">
            <div className="mx-auto grid max-w-5xl gap-6 px-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
              <FadeUp blur={false} delay={0.05}>
                <ContactCard />
              </FadeUp>
              <FadeUp blur={false} delay={0.1}>
                <ContactForm />
              </FadeUp>
            </div>
          </section>
        </main>
        <FooterSection />
      </div>
    </MotionConfig>
  )
}
