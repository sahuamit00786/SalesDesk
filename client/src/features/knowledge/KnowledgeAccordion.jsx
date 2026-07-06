import { ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { KnowledgeMarkdown } from '@/features/knowledge/KnowledgeMarkdown'

/** Collapsible module + nested FAQ accordion for one Knowledge Base document. */
export function KnowledgeAccordion({ intro, modules, openModules, openFaqs, onToggleModule, onToggleFaq }) {
  return (
    <div className="min-w-0">
      {intro ? (
        <div className="mb-4">
          <KnowledgeMarkdown content={intro} />
        </div>
      ) : null}
      <div className="space-y-2">
        {modules.map((mod) => {
          const isOpen = openModules.has(mod.anchor)
          return (
            <div
              key={mod.anchor}
              id={mod.anchor}
              className="scroll-mt-24 overflow-hidden rounded-xl border border-surface-border"
            >
              <button
                type="button"
                onClick={() => onToggleModule(mod.anchor)}
                className="flex w-full items-center justify-between gap-3 bg-surface-subtle/70 px-4 py-3 text-left hover:bg-surface-subtle"
              >
                <span className="text-sm font-semibold text-ink">{mod.title}</span>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-ink-faint transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen ? (
                <div className="space-y-2 p-3">
                  {mod.nodes.map((node, i) =>
                    node.type === 'markdown' ? (
                      <KnowledgeMarkdown key={i} content={node.text} />
                    ) : (
                      <FaqItem
                        key={i}
                        id={`${mod.anchor}--faq-${i}`}
                        question={node.question}
                        answer={node.answer}
                        open={openFaqs.has(`${mod.anchor}--faq-${i}`)}
                        onToggle={() => onToggleFaq(`${mod.anchor}--faq-${i}`)}
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FaqItem({ id, question, answer, open, onToggle }) {
  return (
    <div id={id} className="scroll-mt-24 rounded-lg border border-surface-border bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-brand-50/60"
      >
        <span className="text-[13px] font-medium text-ink">{question}</span>
        <Plus className={cn('h-3.5 w-3.5 shrink-0 text-brand-600 transition-transform', open && 'rotate-45')} />
      </button>
      {open ? (
        <div className="border-t border-surface-border px-3 pt-2.5">
          <KnowledgeMarkdown content={answer} />
        </div>
      ) : null}
    </div>
  )
}
