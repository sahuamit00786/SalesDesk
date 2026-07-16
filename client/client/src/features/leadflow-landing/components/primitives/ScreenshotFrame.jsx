import { cn } from '@/utils/cn'

/**
 * Framed product screenshot. Fixed aspect ratio (real captures are 1024x545)
 * so images never cause layout shift. `eager` only for the hero (LCP image).
 * `glow` paints a faint violet radial behind the frame.
 */
export function ScreenshotFrame({
  src,
  alt,
  eager = false,
  chrome = false,
  glow = false,
  float = false,
  className,
  imgClassName,
}) {
  return (
    <div className={cn('relative', className)}>
      {glow ? (
        <div
          aria-hidden
          className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.09),transparent_65%)] blur-3xl"
        />
      ) : null}
      <div
        className={cn(
          'overflow-hidden rounded-frame border border-ln-line bg-white p-1.5 shadow-soft',
          float && 'animate-ln-float-slow',
        )}
      >
        {chrome ? (
          <div className="flex items-center gap-1.5 px-3 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
          </div>
        ) : null}
        <img
          src={src}
          alt={alt}
          width={1024}
          height={545}
          loading={eager ? 'eager' : 'lazy'}
          fetchpriority={eager ? 'high' : undefined}
          decoding={eager ? 'sync' : 'async'}
          draggable={false}
          className={cn('aspect-[1024/545] w-full rounded-[18px] object-cover', imgClassName)}
        />
      </div>
    </div>
  )
}
