import { cn } from '@/utils/cn'

const statusStyles = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-purple-50 text-purple-700 border-purple-200',
  proposal: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
}

export function Badge({ status, className, children }) {
  const key = status?.toLowerCase?.() ?? 'new'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border capitalize',
        statusStyles[key] ?? statusStyles.new,
        className,
      )}
    >
      {children ?? status}
    </span>
  )
}
