export function OnboardingStepHeader({ title, subtitle }) {
  return (
    <header className="mb-10 border-b border-brand-200/50 pb-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink lg:text-[2.125rem]">{title}</h1>
      {subtitle ? (
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-muted">{subtitle}</p>
      ) : null}
    </header>
  )
}
