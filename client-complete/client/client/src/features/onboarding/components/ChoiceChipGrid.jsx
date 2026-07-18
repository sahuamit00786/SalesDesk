import { cn } from '@/utils/cn'

export function ChoiceChip({ selected, onClick, icon: Icon, label, disabled, dataChoice }) {
  return (
    <button
      type="button"
      data-choice={dataChoice}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200',
        'hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        selected
          ? 'border-brand-500 bg-brand-500 text-white shadow-sm'
          : 'border-brand-200/50 bg-white/80 text-ink-muted backdrop-blur-sm hover:border-brand-300 hover:bg-brand-50/60 hover:text-ink',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {Icon ? <Icon size={16} variant={selected ? 'Bold' : 'Linear'} /> : null}
      {label}
    </button>
  )
}

export function ChoiceChipGrid({ children, className, columns = 'grid-cols-2 sm:grid-cols-3' }) {
  return <div className={cn('grid gap-2.5', columns, className)}>{children}</div>
}
