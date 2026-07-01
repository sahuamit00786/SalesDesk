import { DollarSign } from 'lucide-react'
import { PRIMARY_CURRENCY_OPTIONS } from '@/features/deals/dealCurrencies'
import { cn } from '@/utils/cn'

export function CurrencyPicker({ value, onChange, label = 'Base currency', required, error, className }) {
  return (
    <div className={className}>
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <DollarSign size={18} />
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">Used as the default for deals, leads, and reports in this workspace.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRIMARY_CURRENCY_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            onClick={() => onChange(opt.code)}
            className={cn(
              'rounded-full border px-3.5 py-2 text-sm font-medium transition-all',
              value === opt.code
                ? 'border-slate-800 bg-slate-800 text-white shadow-sm'
                : 'border-surface-border bg-white text-ink-muted hover:border-slate-300 hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  )
}
