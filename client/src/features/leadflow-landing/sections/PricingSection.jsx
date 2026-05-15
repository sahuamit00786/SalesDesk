import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { MagneticWrap } from '@/features/leadflow-landing/components/MagneticWrap'
import { cn } from '@/utils/cn'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    desc: 'For lean teams getting pipeline under control.',
    monthly: 29,
    yearly: 24,
    features: ['Up to 5 seats', 'Core CRM & inbox', 'Email templates', 'Standard reports'],
  },
  {
    id: 'growth',
    name: 'Growth',
    desc: 'For scaling orgs that need automation and governance.',
    monthly: 79,
    yearly: 64,
    features: ['Unlimited seats', 'Workflows & campaigns', 'AI assistant', 'Advanced analytics', 'Priority support'],
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    desc: 'Security, SSO, and bespoke rollout.',
    monthly: null,
    yearly: null,
    features: ['Dedicated CSM', 'SSO / SCIM', 'Custom SLA', 'Private integrations', 'On-site training'],
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(true)

  return (
    <Section id="pricing" className="relative overflow-hidden bg-gradient-to-b from-white via-fuchsia-50/20 to-cyan-50/30">
      <div className="pointer-events-none absolute right-0 bottom-0 h-80 w-80 rounded-full bg-fuchsia-300/20 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-600">Pricing</p>
            <h2 className="mt-2 bg-gradient-to-r from-violet-900 via-fuchsia-800 to-cyan-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
              Simple plans. Serious outcomes.
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-violet-200/80 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                !annual ? 'bg-white text-lf-ink shadow-sm' : 'text-lf-muted',
              )}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                annual ? 'bg-white text-lf-ink shadow-sm' : 'text-lf-muted',
              )}
            >
              Yearly <span className="text-emerald-600">−20%</span>
            </button>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => {
            const price = p.monthly == null ? null : annual ? p.yearly : p.monthly
            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className={cn(
                  'relative overflow-hidden rounded-2xl border-2 bg-gradient-to-b from-white to-violet-50/20 p-6 shadow-md',
                  p.id === 'starter' && 'border-cyan-300/80 shadow-cyan-200/30',
                  p.id === 'enterprise' && 'border-indigo-300/80 shadow-indigo-200/25',
                  p.highlight &&
                    'border-fuchsia-400 ring-2 ring-fuchsia-300/70 shadow-xl shadow-fuchsia-500/20',
                )}
              >
                {p.highlight && (
                  <div
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
                    style={{
                      background: 'conic-gradient(from 180deg at 50% 50%, #c084fc, #38bdf8, #a855f7, #c084fc)',
                      maskImage: 'linear-gradient(#000, transparent 65%)',
                    }}
                  />
                )}
                <div className="relative">
                  {p.highlight && (
                    <span className="mb-3 inline-block rounded-full bg-gradient-to-r from-fuchsia-600 to-violet-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">
                      Recommended
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-lf-ink">{p.name}</h3>
                  <p className="mt-1 text-sm text-lf-muted">{p.desc}</p>
                  <div className="mt-5 flex items-baseline gap-1">
                    {price == null ? (
                      <span className="text-3xl font-bold text-lf-ink">Let&apos;s talk</span>
                    ) : (
                      <>
                        <span className="bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-3xl font-bold text-transparent">
                          ${price}
                        </span>
                        <span className="text-sm text-lf-muted">/ seat / mo</span>
                      </>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-lf-muted">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-600" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <MagneticWrap className="mt-8 block w-full">
                    <Link
                      to="/register"
                      className={cn(
                        'flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold transition',
                        p.highlight
                          ? 'bg-gradient-to-r from-violet-700 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/25 hover:brightness-110'
                          : 'border-2 border-violet-200 bg-white text-violet-900 hover:border-fuchsia-300 hover:bg-fuchsia-50/50',
                      )}
                    >
                      {p.id === 'enterprise' ? 'Contact sales' : 'Start free trial'}
                    </Link>
                  </MagneticWrap>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
