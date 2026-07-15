import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Mail, Phone } from 'lucide-react'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'
import { Github, Linkedin, Twitter, Youtube } from '@/components/shared/BrandIcons'
import { CONTACT, FOOTER } from '@/features/leadflow-landing/landingContent'

// PLACEHOLDER social links — point to real profiles when they exist
const SOCIALS = [
  { label: 'Twitter', icon: Twitter, href: '#' },
  { label: 'LinkedIn', icon: Linkedin, href: '#' },
  { label: 'YouTube', icon: Youtube, href: '#' },
  { label: 'GitHub', icon: Github, href: '#' },
]

function FooterLink({ link }) {
  const className = 'text-sm text-ln-mut transition-colors hover:text-ln-ink'
  if (link.to) {
    return (
      <Link to={link.to} className={className}>
        {link.label}
      </Link>
    )
  }
  const isAnchor = link.href?.startsWith('#')
  return (
    <a
      href={link.href}
      className={className}
      onClick={
        isAnchor
          ? (e) => {
              const target = document.getElementById(link.href.slice(1))
              if (target) {
                e.preventDefault()
                target.scrollIntoView({ behavior: 'smooth' })
              }
            }
          : undefined
      }
    >
      {link.label}
    </a>
  )
}

export function FooterSection() {
  const [subscribed, setSubscribed] = useState(false)

  return (
    <footer className="border-t border-ln-line bg-ln-bg2">
      <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-1">
            <Link to="/" aria-label="LeadNest home">
              <LeadNestLogo className="h-9 w-auto max-w-[11rem]" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ln-mut">{FOOTER.tagline}</p>
            <div className="mt-5 flex items-center gap-3">
              {SOCIALS.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ln-line bg-white text-ln-mut transition-colors hover:text-ln-ink"
                >
                  <Icon size={16} strokeWidth={1.75} />
                </a>
              ))}
            </div>
          </div>

          {FOOTER.columns.map((col) => (
            <div key={col.heading}>
              <p className="text-[13px] font-semibold uppercase tracking-wider text-ln-ink">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink link={link} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider text-ln-ink">
              Stay in the loop
            </p>
            <p className="mt-4 text-sm leading-relaxed text-ln-mut">
              Product updates and sales playbooks. No spam.
            </p>
            {subscribed ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-field border border-ln-line bg-white px-4 py-2.5 text-sm font-medium text-ln-ink">
                <Check size={15} strokeWidth={1.75} className="text-emerald-600" />
                You're on the list
              </p>
            ) : (
              // Newsletter capture is front-end only for now — wire to a real list later
              <form
                className="mt-4 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSubscribed(true)
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Work email"
                  aria-label="Work email"
                  className="h-11 w-full min-w-0 rounded-field border border-ln-line bg-white px-4 text-sm text-ln-ink placeholder:text-neutral-400 focus:border-ln-accent focus:outline-none focus:ring-2 focus:ring-ln-accent/15"
                />
                <button
                  type="submit"
                  className="h-11 shrink-0 rounded-field bg-ln-btn px-5 text-sm font-semibold text-white transition-colors hover:bg-ln-btnh"
                >
                  Subscribe
                </button>
              </form>
            )}
            <div className="mt-6 space-y-2">
              <a
                href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-2 text-sm text-ln-mut transition-colors hover:text-ln-ink"
              >
                <Mail size={14} strokeWidth={1.75} /> {CONTACT.email}
              </a>
              <a
                href={`tel:${CONTACT.phoneTel}`}
                className="flex items-center gap-2 text-sm text-ln-mut transition-colors hover:text-ln-ink"
              >
                <Phone size={14} strokeWidth={1.75} /> {CONTACT.phone}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-ln-line pt-8 sm:flex-row">
          <p className="text-[13px] text-ln-mut">
            © {new Date().getFullYear()} LeadNest. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-[13px] text-ln-mut transition-colors hover:text-ln-ink">
              Privacy
            </Link>
            <Link to="/terms" className="text-[13px] text-ln-mut transition-colors hover:text-ln-ink">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
