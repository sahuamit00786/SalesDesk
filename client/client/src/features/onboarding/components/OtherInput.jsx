import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

export function OtherInput({ label, value, onChange, placeholder, className, id }) {
  return (
    <div className={cn('mt-3 space-y-2', className)}>
      <label className="text-sm font-medium text-ink" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
      />
    </div>
  )
}
