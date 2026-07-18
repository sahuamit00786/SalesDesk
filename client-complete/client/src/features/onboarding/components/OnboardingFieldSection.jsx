import { cn } from '@/utils/cn'

export function OnboardingFieldSection({ title, hint, icon: Icon, children, className }) {
  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          {Icon ? <Icon size={18} variant="Linear" className="text-brand-600" /> : null}
          {title}
        </p>
        {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}
