import { FloatingBg } from '@/features/leadflow-landing/components/FloatingBg'
import { motion } from 'framer-motion'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay },
})

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
}

const staggerChild = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

/**
 * Full-viewport auth layout — white + violet theme with floating shapes (matches landing).
 * @param {'login'|'register'} variant
 */
export function AuthScreenShell({ variant = 'login', brand, eyebrow, title, subtitle, visual, children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-white via-violet-50/50 to-fuchsia-50/30 text-[#0a0714]">
      <FloatingBg />

      <div className="pointer-events-none absolute -left-32 top-[-10%] h-[min(520px,70vw)] w-[min(520px,70vw)] rounded-full bg-violet-400/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-24 bottom-[-8%] h-[min(440px,60vw)] w-[min(440px,60vw)] rounded-full bg-fuchsia-400/10 blur-3xl" aria-hidden />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-14 lg:px-8 lg:py-12">
        <aside className="flex flex-1 flex-col lg:max-w-[28rem]">
          <motion.div
            className="space-y-5"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            key={`${variant}-${title}`}
          >
            {brand ? (
              <motion.div className="w-fit" variants={staggerChild}>{brand}</motion.div>
            ) : eyebrow ? (
              <motion.p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600" variants={staggerChild}>{eyebrow}</motion.p>
            ) : null}
            <motion.h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-[#0a0714] sm:text-4xl lg:text-[2.65rem]" variants={staggerChild}>
              {title}
            </motion.h1>
            {subtitle ? (
              <motion.p className="max-w-md text-base leading-relaxed text-zinc-500" variants={staggerChild}>{subtitle}</motion.p>
            ) : null}
          </motion.div>
          <motion.div className="mt-8 hidden lg:block" {...fadeUp(0.22)}>{visual}</motion.div>
        </aside>

        <main className="mt-8 flex flex-1 justify-center lg:mt-0 lg:justify-end">
          <motion.div
            key={`${variant}-card`}
            {...fadeUp(0.14)}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
            className="w-full max-w-md rounded-3xl border border-violet-100/90 bg-white/95 p-6 shadow-[0_24px_80px_rgba(124,58,237,0.14),0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md sm:p-8"
          >
            {children}
          </motion.div>
        </main>

        {visual ? <div className="mt-8 lg:hidden">{visual}</div> : null}
      </div>
    </div>
  )
}

/** Shared link style for auth footers */
export const authLinkClassName = 'font-semibold text-violet-700 transition hover:text-violet-900'
