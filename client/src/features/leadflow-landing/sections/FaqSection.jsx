import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { Section } from '@/features/leadflow-landing/components/Section'
import { cn } from '@/utils/cn'

const FAQS = [
  {
    q: 'What is LeadFlow CRM?',
    a: 'LeadFlow CRM is a lead management and sales workspace with leads, lead distribution, opportunities, pipeline, deals, email inbox, tasks, campaigns, automation workflows, quotations, invoices, documents, HR attendance, leave, and team roles.',
  },
  {
    q: 'How does lead distribution work?',
    a: 'Lead distribution fairly assigns unassigned leads to your calling team using round-robin rotation. Select leads, pick callers in order, and confirm assignment from the Lead distribution page.',
  },
  {
    q: 'Can I send and receive email inside the CRM?',
    a: 'Yes. The Email module lets you send, receive, and track emails without leaving the CRM — a full inbox inside the app with lead linking, reply, and templates.',
  },
  {
    q: 'Does LeadFlow CRM support quotations and invoices?',
    a: 'Yes. Create structured quotations with templates and live preview, convert them to invoices, and manage deal-linked sales documents with company billing details.',
  },
  {
    q: 'What about team roles and workspaces?',
    a: 'Workspace settings let you manage multiple workspaces. Team & roles lets you invite people, assign roles, and control what each role can see and do per workspace.',
  },
  {
    q: 'Is there HR and attendance built in?',
    a: 'Yes. HR Overview, attendance check-in, leave requests, approval queue, leave settings, and HR reports are included alongside sales modules in the same workspace.',
  },
]

export function FaqSection() {
  return (
    <Section id="faq" className="relative bg-[#faf9ff] py-24">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-violet-600">FAQ</p>
        <h2 className="mt-3 text-center font-display text-3xl font-bold tracking-[-0.025em] text-[#0a0714] sm:text-4xl">
          Common questions
        </h2>

        <Accordion.Root type="single" collapsible className="mt-10 space-y-2">
          {FAQS.map((item, idx) => (
            <Accordion.Item
              key={item.q}
              value={`item-${idx}`}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:border-violet-200"
            >
              <Accordion.Header>
                <Accordion.Trigger
                  className={cn(
                    'group flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-semibold text-zinc-800 transition hover:text-violet-700',
                  )}
                >
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-violet-400 transition group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                <div className="border-t border-zinc-100 px-5 pb-4 pt-3 text-sm leading-relaxed text-zinc-500">
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
