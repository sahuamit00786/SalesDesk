import { cn } from '@/utils/cn'

export function GlassPanel({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/90 bg-gradient-to-br from-white/95 via-violet-50/50 to-cyan-50/35 shadow-[0_12px_48px_-12px_rgba(109,40,217,0.25)] ring-1 ring-violet-200/50 backdrop-blur-xl',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
