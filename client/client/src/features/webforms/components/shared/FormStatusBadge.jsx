export function FormStatusBadge({ status }) {
  const color = status === 'active' ? 'bg-emerald-100 text-emerald-700' : status === 'paused' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${color}`}>{status || 'draft'}</span>
}
