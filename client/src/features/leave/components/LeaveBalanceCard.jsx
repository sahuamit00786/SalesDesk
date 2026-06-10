import { Wallet } from 'lucide-react'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'
import { cn } from '@/utils/cn'

const ACCENTS = [
  { bar: 'bg-brand-500', pill: 'bg-brand-50 text-brand-700', border: 'border-brand-200/50' },
  { bar: 'bg-violet-500', pill: 'bg-violet-50 text-violet-700', border: 'border-violet-200/50' },
  { bar: 'bg-teal-500', pill: 'bg-teal-50 text-teal-700', border: 'border-teal-200/50' },
  { bar: 'bg-amber-500', pill: 'bg-amber-50 text-amber-700', border: 'border-amber-200/50' },
  { bar: 'bg-rose-500', pill: 'bg-rose-50 text-rose-700', border: 'border-rose-200/50' },
  { bar: 'bg-sky-500', pill: 'bg-sky-50 text-sky-700', border: 'border-sky-200/50' },
]

export function LeaveBalanceCard({ balances = [], year }) {
  const rows = balances.filter((b) => b.leaveType?.id || b.leaveType?.name || b.leaveType?.code)

  return (
    <HrCard
      title={`Leave balance${year ? ` — ${year}` : ''}`}
      description="Available days by leave type"
      icon={Wallet}
      bodyClassName="!pt-3 !pb-4"
    >
      {!rows.length ? (
        <HrEmptyState
          icon={Wallet}
          title="No balances yet"
          description="Leave types and balances will appear here once configured by your admin."
          className="border-0 bg-transparent py-4"
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((b, i) => {
            const avail = Number(b.available ?? 0)
            const alloc = Number(b.allocated ?? 0)
            const used = Number(b.used ?? 0)
            const pending = Number(b.pending ?? 0)
            const pct = alloc > 0 ? Math.min(Math.round((used / alloc) * 100), 100) : 0
            const accent = ACCENTS[i % ACCENTS.length]

            return (
              <div
                key={b.id}
                className={cn(
                  'rounded-xl border bg-white px-4 py-3 shadow-sm',
                  accent.border,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', accent.pill)}>
                    {b.leaveType?.code || b.leaveType?.name || 'Leave'}
                  </span>
                  <span className="text-xs text-ink-muted">{alloc} alloc.</span>
                </div>

                <div className="mt-2 flex items-end gap-1">
                  <span className="text-2xl font-extrabold tabular-nums leading-none text-ink">{avail}</span>
                  <span className="mb-0.5 text-xs text-ink-muted">days left</span>
                </div>

                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-subtle">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', accent.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-1.5 flex justify-between text-[10px] text-ink-muted">
                  <span>{used} used</span>
                  {pending > 0 && <span className="text-amber-600">{pending} pending</span>}
                  <span>{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </HrCard>
  )
}
