import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles } from 'lucide-react'
import { TableBlock } from './TableBlock'
import { ChartBlock } from './ChartBlock'
import { KpiBlock } from './KpiBlock'
import { DisambiguationChips } from './DisambiguationChips'
import { EntityLinksBlock } from './EntityLinksBlock'

function renderBlock(block, i, onSelectDisambiguation, disambiguationDisabled) {
  switch (block.type) {
    case 'table':
      return <TableBlock key={i} block={block} />
    case 'chart':
      return <ChartBlock key={i} block={block} />
    case 'kpi':
      return <KpiBlock key={i} block={block} />
    case 'entities':
      return <EntityLinksBlock key={i} block={block} />
    case 'disambiguation':
      return (
        <DisambiguationChips
          key={i}
          block={block}
          onSelect={onSelectDisambiguation}
          disabled={disambiguationDisabled}
        />
      )
    case 'text':
    default:
      return (
        <div
          key={i}
          className="prose prose-sm max-w-none text-left text-sm leading-relaxed text-ink prose-p:my-1.5 prose-p:leading-relaxed prose-li:my-0.5 prose-headings:mb-1.5 prose-headings:mt-2.5 prose-pre:my-2.5 prose-strong:text-ink"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.markdown || ''}</ReactMarkdown>
        </div>
      )
  }
}

export function MessageBubble({ role, content, blocks, onSelectDisambiguation, disambiguationDisabled }) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white shadow-sm">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-2 overflow-x-auto break-words rounded-2xl rounded-tl-md border border-surface-border bg-white px-4 py-3 text-left text-sm leading-relaxed text-ink shadow-sm">
        {blocks?.length ? (
          blocks.map((b, i) => renderBlock(b, i, onSelectDisambiguation, disambiguationDisabled))
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  )
}
