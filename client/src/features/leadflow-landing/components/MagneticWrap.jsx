import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

/** Wraps CTA content (e.g. Link) with subtle magnetic pull. */
export function MagneticWrap({ className, children, strength = 0.18 }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  function onMove(e) {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      x: (e.clientX - (r.left + r.width / 2)) * strength,
      y: (e.clientY - (r.top + r.height / 2)) * strength,
    })
  }

  return (
    <motion.span
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 380, damping: 20, mass: 0.35 }}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.span>
  )
}
