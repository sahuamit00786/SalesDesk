import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { LeadNestLogo } from '@/components/shared/LeadNestLogo'

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
    <footer className="relative border-t border-zinc-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <LeadNestLogo className="h-12 w-auto max-w-[15rem]" />
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Lead management, pipeline, email, automation, documents, and team workspace — in one system.
            </p>
            <div className="mt-6 space-y-2.5">
              <a
                href={`mailto:${EMAIL}`}
                className="flex items-center gap-2 text-sm text-violet-600/70 transition hover:text-violet-700"
              >
                <Mail size={16} className="shrink-0" aria-hidden />
                {EMAIL}
              </a>
              <a
                href={`tel:${PHONE_TEL}`}
                className="flex items-center gap-2 text-sm text-violet-600/70 transition hover:text-violet-700"
              >
                <Phone size={16} className="shrink-0" aria-hidden />
                {PHONE}
              </a>
            </div>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                {c.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.route ? (
                      <Link to={l.href} className="text-sm text-zinc-500 transition hover:text-violet-700">
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className="text-sm text-zinc-500 transition hover:text-violet-700">
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-zinc-100 pt-8">
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} LeadNest. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
