import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'

const EMAIL = 'sahuamit00786@gmail.com'
const PHONE = '+91 63869 23401'
const PHONE_TEL = '+916386923401'

const cols = [
  {
    title: 'Product',
    links: [
      { label: 'Product tour', href: '#showcase' },
      { label: 'Features', href: '#features' },
      { label: 'Automation', href: '#automation' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', href: '/login', route: true },
      { label: 'Register', href: '/register', route: true },
      { label: 'Contact', href: '#contact' },
    ],
  },
]

export function FooterSection() {
  return (
    <footer className="relative border-t border-white/[0.05] bg-[#050510]">
      {/* Top fade from CTA section */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <p className="flex items-center gap-2.5 text-sm font-bold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 text-xs font-bold text-white shadow-[0_0_12px_rgba(139,92,246,0.4)]">
                C
              </span>
              Connexify CRM
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/35">
              Lead management, pipeline, email, automation, documents, and team workspace — in one
              system.
            </p>
            <div className="mt-6 space-y-2.5">
              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-2 text-sm text-violet-400/70 transition hover:text-violet-300"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                {EMAIL}
              </a>
              <a
                href={`tel:${PHONE_TEL}`}
                className="flex items-center gap-2 text-sm text-violet-400/70 transition hover:text-violet-300"
              >
                <Phone className="h-4 w-4 shrink-0" aria-hidden />
                {PHONE}
              </a>
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/30">
                {c.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.route ? (
                      <Link
                        to={l.href}
                        className="text-sm text-white/40 transition hover:text-white/75"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-sm text-white/40 transition hover:text-white/75"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-white/[0.05] pt-8">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} Connexify CRM. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
