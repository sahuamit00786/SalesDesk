import { cn } from '@/utils/cn'

const LOGO_SRC = '/leadnest_logo.svg'

/** Text wordmark — Lead + Nest (for dark / purple backgrounds). */
export function LeadNestWordmark({ collapsed = false, className, alt = 'LeadNest' }) {
  if (collapsed) {
    return (
      <span
        className={cn('font-display text-base font-bold tracking-tight', className)}
        aria-label={alt}
      >
        <span className="text-white">L</span>
        <span className="text-violet-300">N</span>
      </span>
    )
  }

  return (
    <span
      className={cn('font-display text-[1.35rem] font-bold leading-none tracking-tight', className)}
      aria-label={alt}
    >
      <span className="text-white">Lead</span>
      <span className="text-violet-300">Nest</span>
    </span>
  )
}

/**
 * LeadNest wordmark from `public/leadnest_logo.svg`.
 * @param {'default' | 'auth' | 'sidebar' | 'sidebar-collapsed' | 'sidebar-wordmark'} variant
 */
export function LeadNestLogo({
  className,
  variant = 'default',
  alt = 'LeadNest',
}) {
  if (variant === 'sidebar-wordmark') {
    return <LeadNestWordmark className={className} alt={alt} />
  }

  if (variant === 'sidebar-wordmark-collapsed') {
    return <LeadNestWordmark collapsed className={className} alt={alt} />
  }

  const img = (
    <img
      src={LOGO_SRC}
      alt={alt}
      draggable={false}
      className={cn(
        'block object-contain object-left',
        variant === 'sidebar-collapsed' && 'h-7 w-[5.25rem] max-w-none shrink-0',
        variant === 'sidebar' && 'h-9 w-auto max-w-[13.5rem]',
        variant === 'auth' && 'h-14 w-auto max-w-[18rem] sm:h-16 sm:max-w-[20rem]',
        variant === 'default' && 'h-10 w-auto max-w-[14rem] sm:h-11 sm:max-w-[16rem]',
        className,
      )}
    />
  )

  if (variant === 'sidebar' || variant === 'sidebar-collapsed') {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white',
          variant === 'sidebar-collapsed' ? 'h-10 w-10' : 'px-3 py-2',
        )}
      >
        {img}
      </span>
    )
  }

  return img
}
