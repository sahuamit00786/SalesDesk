import { useState } from 'react'

export default function GmailReplyBox({ toLabel, onCreateEmail }) {
  const [body, setBody] = useState('')
  return (
    <div className="border-t border-surface-border bg-white px-6 py-4">
      <div className="mb-3 flex items-center gap-2 text-[12px] text-ink-muted">
        <span>Reply to</span>
        <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 font-medium text-brand-700">{toLabel || 'recipient'}</span>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your reply..."
        className="h-20 w-full resize-none rounded-xl border border-surface-border px-3.5 py-2.5 text-[13px] text-ink outline-none transition-all placeholder:text-ink-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" className="h-8 rounded-xl border border-surface-border px-4 text-[12px] text-ink-muted hover:bg-surface-subtle">
          Save draft
        </button>
        <button type="button" onClick={onCreateEmail} className="h-8 rounded-xl bg-brand-600 px-5 text-[12px] font-medium text-white hover:bg-brand-700">
          Send reply →
        </button>
      </div>
    </div>
  )
}
