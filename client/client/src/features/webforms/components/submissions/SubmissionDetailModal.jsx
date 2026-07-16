export function SubmissionDetailModal({ submission }) {
  if (!submission) return null
  return (
    <div className="rounded-2xl border border-surface-border bg-white p-4">
      <pre className="whitespace-pre-wrap text-xs text-ink">{JSON.stringify(submission, null, 2)}</pre>
    </div>
  )
}
