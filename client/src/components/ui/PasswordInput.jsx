import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'
import { inputFieldClassName } from '@/components/ui/Input'

export const PasswordInput = forwardRef(function PasswordInput(
  { className, toggleButtonClassName, type: _ignored, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cn(inputFieldClassName, 'pl-3.5 pr-11', className)}
        {...props}
      />
      <button
        type="button"
        className={cn(
          'absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg',
          'text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
          toggleButtonClassName,
        )}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  )
})
