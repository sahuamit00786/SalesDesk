import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { cn } from '@/utils/cn'

const FAQS = [
  {
    q: 'How does LeadFlow AI integrate with our stack?',
    a: 'We ship native connectors for major email, calendar, and messaging providers. Enterprise plans include private APIs and webhooks for bespoke systems.',
  },
  {
    q: 'Is my customer data encrypted?',
    a: 'Yes — data is encrypted in transit and at rest. Enterprise customers can bring their own keys and enforce SSO / SCIM policies.',
  },
  {
    q: 'Can we start with a single team?',
    a: 'Absolutely. Pilot with one pod, prove lift on response times and pipeline hygiene, then expand seats with zero drama.',
  },
  {
    q: 'What happens after the free trial?',
    a: 'Pick a plan or downgrade to a read-only archive. No surprise charges — we notify you before any billing event.',
  },
]

export function FaqSection() {
  return (
    <Section id="faq" className="relative overflow-hidden bg-gradient-to-b from-violet-50/80 via-white to-fuchsia-50/50">
      <div className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">FAQ</p>
        <h2 className="mt-2 bg-gradient-to-r from-violet-800 via-fuchsia-700 to-cyan-800 bg-clip-text text-center text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
          Answers, upfront.
        </h2>
        <Accordion.Root type="single" collapsible className="mt-10 space-y-3">
          {FAQS.map((item, idx) => (
            <Accordion.Item
              key={item.q}
              value={`item-${idx}`}
              className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white/90 shadow-md shadow-violet-200/20"
            >
              <Accordion.Header>
                <Accordion.Trigger
                  className={cn(
                    'group flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-lf-ink transition hover:bg-lf-purple-50/50',
                  )}
                >
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-lf-purple-600 transition group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                <div className="border-t border-lf-purple-50 px-5 pb-4 pt-2 text-sm leading-relaxed text-lf-muted">
                  {item.a}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </Section>
  )
}
