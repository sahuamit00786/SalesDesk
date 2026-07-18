import { cn } from '@/utils/cn'

export function ChoiceCard({ selected, onClick, icon: Icon, label, sub, disabled, className, dataChoice }) {
  return (
    <button
      type="button"
      data-choice={dataChoice}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'group flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200',
        'hover:border-brand-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        selected
          ? 'border-brand-500 bg-brand-50/80 shadow-md ring-2 ring-brand-500/20'
          : 'border-brand-200/50 bg-white/80 backdrop-blur-sm',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            'mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
            selected ? 'bg-brand-500 text-white' : 'bg-surface-muted text-ink-muted group-hover:bg-brand-100 group-hover:text-brand-700',
          )}
        >
          <Icon size={20} variant={selected ? 'Bold' : 'Linear'} />
        </span>
      ) : null}
      <span className="text-sm font-semibold text-ink">{label}</span>
      {sub ? <span className="mt-0.5 text-xs text-ink-muted">{sub}</span> : null}
    </button>
  )
}
