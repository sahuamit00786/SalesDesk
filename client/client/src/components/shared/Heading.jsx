import { cn } from '@/utils/cn'

const styles = {
  1: 'text-2xl font-semibold text-ink leading-tight',
  2: 'text-lg font-semibold text-ink leading-snug',
  3: 'text-base font-medium text-ink leading-normal',
  4: 'text-sm font-medium text-ink-muted leading-normal',
}

/**
 * Unified heading component enforcing the typographic scale.
 * Use instead of ad-hoc text-xl/text-2xl/text-lg mixtures.
 */
export function Heading({ level = 2, as, children, className, ...props }) {
  const Tag = as || `h${level}`
  return (
    <Tag className={cn(styles[level] || styles[2], className)} {...props}>
      {children}
    </Tag>
  )
}

export default Heading
