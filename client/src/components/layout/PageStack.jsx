import { cn } from '@/utils/cn'

/** Page gutter on lavender canvas; min-height fills viewport below topbar */
export function PageStack({ children, className }) {
  return (
    <div
      className={cn(
        'cx-page-bg flex w-full min-w-0 flex-col gap-3 bg-surface-muted px-1.5 py-1.5 sm:px-2',
        'min-h-[calc(100dvh-var(--chrome-header-height))]',
        className,
      )}
    >
      {children}
    </div>
  )
}
