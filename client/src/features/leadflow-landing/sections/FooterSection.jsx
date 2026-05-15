import { Link } from 'react-router-dom'

const cols = [
  {
    title: 'Product',
    links: [
      { label: 'Tour', href: '#tour' },
      { label: 'Features', href: '#features' },
      { label: 'Pipeline', href: '#pipeline' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Security', href: '#faq' },
      { label: 'API docs', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Status', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Careers', href: '#' },
      { label: 'Legal', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
]

export function FooterSection() {
  return (
    <footer className="bg-gradient-to-r from-violet-100/90 via-fuchsia-50 to-cyan-100/90">
      <div className="bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-lf-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 text-xs font-bold text-white shadow-md">
                L
              </span>
              LeadFlow AI
            </p>
            <p className="mt-3 text-sm text-lf-muted">
              The AI-powered lead management & CRM platform for teams who refuse to leak pipeline.
            </p>
            <form
              className="mt-4 flex max-w-sm gap-2"
              onSubmit={(e) => {
                e.preventDefault()
              }}
            >
              <input
                type="email"
                required
                placeholder="Work email"
                className="h-10 flex-1 rounded-lg border border-violet-200 bg-violet-50/50 px-3 text-sm outline-none ring-fuchsia-400/30 focus:ring-2 focus:ring-violet-400"
              />
              <button
                type="submit"
                className="h-10 shrink-0 rounded-lg bg-gradient-to-r from-violet-700 to-fuchsia-600 px-3 text-xs font-semibold text-white shadow-md transition hover:brightness-110"
              >
                Subscribe
              </button>
            </form>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-lf-muted">{c.title}</p>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith('#') ? (
                      <a href={l.href} className="text-sm text-lf-muted transition hover:text-lf-purple-700">
                        {l.label}
                      </a>
                    ) : (
                      <Link to={l.href} className="text-sm text-lf-muted transition hover:text-lf-purple-700">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-lf-purple-100 pt-8 text-xs text-lf-muted sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} LeadFlow AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-lf-purple-700">
              Twitter
            </a>
            <a href="#" className="hover:text-lf-purple-700">
              LinkedIn
            </a>
            <a href="#" className="hover:text-lf-purple-700">
              GitHub
            </a>
          </div>
        </div>
      </div>
      </div>
    </footer>
  )
}
