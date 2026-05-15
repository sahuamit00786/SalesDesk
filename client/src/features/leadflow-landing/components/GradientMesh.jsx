/** @param {{ tone?: 'light' | 'dark' }} props */
export function GradientMesh({ tone = 'light' }) {
  if (tone === 'dark') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-1/4 top-0 h-[min(90vw,780px)] w-[min(90vw,780px)] rounded-full bg-gradient-to-br from-fuchsia-500/35 via-violet-600/30 to-transparent blur-3xl animate-lf-pulse-glow" />
        <div className="absolute -right-1/4 top-1/4 h-[min(75vw,620px)] w-[min(75vw,620px)] rounded-full bg-gradient-to-bl from-cyan-400/30 via-violet-500/25 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-purple-600/35 blur-3xl" />
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-1/4 top-0 h-[min(85vw,760px)] w-[min(85vw,760px)] rounded-full bg-gradient-to-br from-violet-400/55 via-fuchsia-400/35 to-transparent blur-3xl animate-lf-pulse-glow" />
      <div className="absolute -right-1/4 top-1/4 h-[min(72vw,580px)] w-[min(72vw,580px)] rounded-full bg-gradient-to-bl from-cyan-400/40 via-sky-400/25 to-fuchsia-300/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-gradient-to-tr from-amber-300/25 via-fuchsia-400/20 to-violet-500/25 blur-2xl" />
      <div className="absolute right-1/4 top-2/3 h-56 w-56 rounded-full bg-indigo-400/20 blur-2xl" />
    </div>
  )
}
