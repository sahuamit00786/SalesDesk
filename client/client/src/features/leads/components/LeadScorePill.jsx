import { cn } from '@/utils/cn'

function scoreClass(score) {
  if (score >= 80) return 'text-green-700'
  if (score >= 50) return 'text-amber-700'
  return 'text-red-700'
}

function dotClass(score) {
  if (score >= 80) return 'bg-green-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export function LeadScorePill({ score = 0, showBar = false }) {
  return (
    <div className="space-y-1">
      <div className={cn('inline-flex items-center gap-2 font-semibold', scoreClass(score))}>
        <span className={cn('h-2.5 w-2.5 rounded-full', dotClass(score))} />
        <span>{score}</span>
      </div>
      {showBar ? (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
          <div className="h-full rounded-full bg-slate-1000" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
        </div>
      ) : null}
    </div>
  )
}
