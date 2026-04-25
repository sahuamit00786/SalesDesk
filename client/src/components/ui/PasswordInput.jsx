import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/utils/cn'

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
        className={cn(
          'w-full h-10 rounded-xl border border-surface-border bg-white pl-3.5 pr-11',
          'text-sm text-ink placeholder:text-ink-faint',
          'outline-none transition-all duration-150',
          'focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
          'hover:border-brand-300',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
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
