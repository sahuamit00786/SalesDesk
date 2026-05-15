import { Wallet } from 'lucide-react'
import { HrCard } from '@/features/hr/components/HrCard'
import { HrEmptyState } from '@/features/hr/components/HrEmptyState'

const TYPE_ACCENTS = [
  'from-brand-50 to-white border-brand-200/70',
  'from-violet-50 to-white border-violet-200/70',
  'from-teal-50 to-white border-teal-200/70',
  'from-amber-50 to-white border-amber-200/70',
]

export function LeaveBalanceCard({ balances = [] }) {
  return (
    <HrCard
      title="Leave balance"
      description="Available days by leave type for the current year"
      icon={Wallet}
    >
      {!balances.length ? (
        <HrEmptyState
          icon={Wallet}
          title="No balances yet"
          description="Leave types and balances will appear here once configured by your admin."
          className="border-0 bg-transparent py-8"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {balances.map((b, i) => (
            <div
              key={b.id}
              className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ring-1 ring-black/[0.03] ${TYPE_ACCENTS[i % TYPE_ACCENTS.length]}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {b.leaveType?.name || b.leaveType?.code || 'Leave'}
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-ink">
                {Number(b.available ?? 0)}
                <span className="ml-1 text-sm font-medium text-ink-muted">days</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span>Used <strong className="text-ink">{Number(b.used ?? 0)}</strong></span>
                <span>Pending <strong className="text-ink">{Number(b.pending ?? 0)}</strong></span>
                <span>Allocated <strong className="text-ink">{Number(b.allocated ?? 0)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </HrCard>
  )
}
