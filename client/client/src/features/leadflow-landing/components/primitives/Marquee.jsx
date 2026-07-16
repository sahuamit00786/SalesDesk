import { cn } from '@/utils/cn'

/**
 * Infinite horizontal marquee (pure CSS). Content renders twice so the
 * translateX(-50%) loop is seamless; edges fade out. Reduced motion freezes
 * it via the scoped prefers-reduced-motion block in index.css.
 */
export function Marquee({ children, className, trackClassName }) {
  return (
    <div
      className={cn('overflow-hidden', className)}
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <div className={cn('flex w-max animate-ln-marquee', trackClassName)}>
        <div className="flex items-center gap-16 pr-16">{children}</div>
        <div aria-hidden className="flex items-center gap-16 pr-16">
          {children}
        </div>
      </div>
    </div>
  )
}
