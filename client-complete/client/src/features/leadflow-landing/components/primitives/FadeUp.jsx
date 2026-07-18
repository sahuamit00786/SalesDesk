import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '@/features/leadflow-landing/hooks/usePrefersReducedMotion'

const EASE = [0.21, 0.47, 0.32, 0.98]

/**
 * Scroll-reveal wrapper: fades content up into place the first time it enters
 * the viewport. `blur` adds a blur-to-sharp transition — keep it off for large
 * screenshot frames (filter animation is expensive on big layers).
 */
export function FadeUp({ children, delay = 0, blur = true, className, as = 'div', ...rest }) {
  const reduced = usePrefersReducedMotion()

  if (reduced) {
    const Tag = as
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }

  const MotionTag = motion[as] ?? motion.div

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: 24, ...(blur ? { filter: 'blur(6px)' } : {}) }}
      whileInView={{ opacity: 1, y: 0, ...(blur ? { filter: 'blur(0px)' } : {}) }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}
