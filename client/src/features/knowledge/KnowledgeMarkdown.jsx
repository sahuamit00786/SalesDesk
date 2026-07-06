import { Children } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { uniqueSlug } from './slug'

function textOf(children) {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child
      if (typeof child === 'number') return String(child)
      if (child?.props?.children) return textOf(child.props.children)
      return ''
    })
    .join('')
}

const HEADING_STYLES = {
  1: 'mb-4 mt-0 text-2xl font-bold text-ink scroll-mt-24',
  2: 'mb-3 mt-10 scroll-mt-24 border-b border-surface-border pb-2 text-xl font-bold text-ink first:mt-0',
  3: 'mb-2 mt-7 scroll-mt-24 text-base font-semibold text-ink',
  4: 'mb-1.5 mt-5 scroll-mt-24 text-sm font-semibold text-ink',
}

/** Renders one Knowledge Base markdown document, assigning stable anchor ids to headings. */
export function KnowledgeMarkdown({ content }) {
  // A fresh map per render (not a ref) so heading anchor ids stay deterministic
  // within this render pass without touching refs during render.
  const seen = new Map()

  const components = {
      h1: (props) => makeHeading(1, props, seen),
      h2: (props) => makeHeading(2, props, seen),
      h3: (props) => makeHeading(3, props, seen),
      h4: (props) => makeHeading(4, props, seen),
      p: ({ children }) => <p className="mb-3 text-[13.5px] leading-relaxed text-ink-muted">{children}</p>,
      strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
      em: ({ children }) => <em className="text-ink-muted">{children}</em>,
      a: ({ children, href }) => (
        <a href={href} className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-800">
          {children}
        </a>
      ),
      ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1.5 text-[13.5px] leading-relaxed text-ink-muted">{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1.5 text-[13.5px] leading-relaxed text-ink-muted">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      hr: () => <hr className="my-8 border-surface-border" />,
      blockquote: ({ children }) => (
        <blockquote className="mb-3 rounded-r-lg border-l-4 border-brand-300 bg-brand-50/60 px-4 py-2 text-[13.5px] text-ink-muted">
          {children}
        </blockquote>
      ),
      code: ({ inline, children }) =>
        inline ? (
          <code className="rounded bg-surface-subtle px-1.5 py-0.5 font-mono text-[12px] text-brand-700">{children}</code>
        ) : (
          <code className="block overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-[12px] text-slate-100">{children}</code>
        ),
      table: ({ children }) => (
        <div className="mb-4 w-full overflow-x-auto rounded-lg border border-surface-border">
          <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className="bg-surface-subtle">{children}</thead>,
      tbody: ({ children }) => <tbody className="divide-y divide-surface-border">{children}</tbody>,
      tr: ({ children }) => <tr className="align-top">{children}</tr>,
      th: ({ children }) => <th className="px-3 py-2 font-semibold text-ink">{children}</th>,
      td: ({ children }) => <td className="px-3 py-2 text-ink-muted">{children}</td>,
  }

  return (
    <div className="kb-markdown min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

function makeHeading(level, { children }, seen) {
  const Tag = `h${level}`
  const text = textOf(children)
  const id = uniqueSlug(text, seen)
  return (
    <Tag id={id} className={HEADING_STYLES[level]}>
      {children}
    </Tag>
  )
}
