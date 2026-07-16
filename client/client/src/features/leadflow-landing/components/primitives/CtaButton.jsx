import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

const VARIANTS = {
  primary:
    'bg-ln-btn text-white hover:bg-ln-btnh shadow-soft',
  ghost:
    'border border-ln-line bg-white text-ln-ink hover:bg-ln-bg2',
  // white-on-dark: for use inside the dark final CTA card
  inverted:
    'bg-white text-ln-ink hover:bg-neutral-100',
  'ghost-dark':
    'border border-white/20 bg-transparent text-white hover:bg-white/10',
}

const SIZES = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

const MotionLink = motion.create(Link)

/**
 * Landing CTA button. `to` renders a router Link, `href` an anchor,
 * otherwise a button. Anchor hrefs starting with '#' smooth-scroll.
 */
export function CtaButton({ to, href, variant = 'primary', size = 'md', className, children, onClick, ...rest }) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-btn font-semibold transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ln-accent/40 focus-visible:ring-offset-2',
    VARIANTS[variant],
    SIZES[size],
    className,
  )

  const motionProps = { whileTap: { scale: 0.98 }, whileHover: { scale: 1.02 } }

  const handleAnchorClick = (e) => {
    if (href?.startsWith('#')) {
      const target = document.getElementById(href.slice(1))
      if (target) {
        e.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    onClick?.(e)
  }

  if (to) {
    return (
      <MotionLink to={to} className={classes} onClick={onClick} {...motionProps} {...rest}>
        {children}
      </MotionLink>
    )
  }

  if (href) {
    return (
      <motion.a href={href} className={classes} onClick={handleAnchorClick} {...motionProps} {...rest}>
        {children}
      </motion.a>
    )
  }

  return (
    <motion.button type="button" className={classes} onClick={onClick} {...motionProps} {...rest}>
      {children}
    </motion.button>
  )
}
