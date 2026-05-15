import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Section } from '@/features/leadflow-landing/components/Section'
import { GlassPanel } from '@/features/leadflow-landing/components/GlassPanel'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'
import { cn } from '@/utils/cn'

const TABS = [
  { id: 'wa', label: 'WhatsApp', accent: 'bg-emerald-500' },
  { id: 'ig', label: 'Instagram', accent: 'bg-pink-500' },
  { id: 'fb', label: 'Facebook', accent: 'bg-blue-600' },
  { id: 'em', label: 'Email', accent: 'bg-slate-600' },
]

const MESSAGES = {
  wa: [
    { from: 'them', text: 'Hey — can we reschedule the demo?' },
    { from: 'us', text: 'Absolutely. Does Thursday 10am work?' },
  ],
  ig: [{ from: 'them', text: 'Pricing for 25 seats?' }, { from: 'us', text: 'Sharing a quote link now.' }],
  fb: [{ from: 'them', text: 'Do you integrate with HubSpot?' }, { from: 'us', text: 'Yes — bi-directional sync.' }],
  em: [{ from: 'them', text: 'Re: pilot scope' }, { from: 'us', text: 'Attached the success criteria doc.' }],
}

export function OmnichannelSection() {
  const [tab, setTab] = useState('wa')
  const [typing, setTyping] = useState(false)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return undefined
    const id = window.setInterval(() => setTyping((t) => !t), 2200)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <Section className="relative overflow-hidden bg-gradient-to-br from-emerald-50/40 via-white to-violet-50/40">
      <div className="pointer-events-none absolute right-0 top-1/4 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Omnichannel</p>
          <h2 className="mt-2 bg-gradient-to-r from-emerald-800 via-teal-800 to-violet-800 bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Every conversation — one unified inbox.
          </h2>
          <p className="mt-3 text-sm text-lf-muted sm:text-base">
            WhatsApp, Instagram, Facebook Messenger, and email threads merge into a single timeline on the lead record.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  tab === t.id
                    ? 'bg-gradient-to-r from-violet-700 via-fuchsia-600 to-indigo-700 text-white shadow-lg shadow-violet-500/30'
                    : 'border border-violet-200/80 bg-white/90 text-slate-600 shadow-sm hover:border-fuchsia-300 hover:text-violet-800',
                )}
              >
                <span className={cn('mr-2 inline-block h-2 w-2 rounded-full', t.accent)} />
                {t.label}
              </button>
            ))}
          </div>
          <GlassPanel className="relative min-h-[280px] overflow-hidden p-4">
            <div className="mb-3 flex items-center justify-between border-b border-lf-purple-100 pb-3">
              <p className="text-sm font-semibold text-lf-ink">Unified thread</p>
              <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
                3 unread
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={reduced ? false : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {MESSAGES[tab].map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[90%] rounded-2xl px-3 py-2 text-sm',
                      m.from === 'them'
                        ? 'ml-0 bg-gradient-to-br from-violet-100 to-fuchsia-50 text-violet-950 ring-1 ring-violet-200/60'
                        : 'ml-auto bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-violet-500/25',
                    )}
                  >
                    {m.text}
                  </div>
                ))}
                {typing && (
                  <div className="flex gap-1 px-2 py-1 text-xs text-lf-muted">
                    <span className="animate-pulse">Typing</span>
                    <span className="inline-flex gap-0.5">
                      <span className="h-1 w-1 animate-bounce rounded-full bg-lf-purple-400" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-lf-purple-400 [animation-delay:120ms]" />
                      <span className="h-1 w-1 animate-bounce rounded-full bg-lf-purple-400 [animation-delay:240ms]" />
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </GlassPanel>
        </div>
      </div>
    </Section>
  )
}
