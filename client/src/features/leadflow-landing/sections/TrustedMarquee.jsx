const logos = [
  'Vertex Labs',
  'Northwind',
  'Blue Ocean',
  'Aperture',
  'Helix',
  'Nova CRM',
  'Stacked',
  'Railway',
  'Summit',
  'Atlas',
]

const CHIP = [
  'border-violet-200 bg-gradient-to-r from-violet-50 to-white text-violet-800 shadow-violet-200/50',
  'border-cyan-200 bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-900 shadow-cyan-200/40',
  'border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-pink-50 text-fuchsia-900 shadow-fuchsia-200/40',
  'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-900 shadow-amber-200/40',
  'border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-900 shadow-indigo-200/40',
]

export function TrustedMarquee() {
  const row = [...logos, ...logos]
  return (
    <div className="border-y border-violet-200/50 bg-gradient-to-r from-violet-50/80 via-white to-cyan-50/60 py-10">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
        Trusted by revenue teams worldwide
      </p>
      <div className="leadflow-mask-x relative overflow-hidden">
        <div className="flex w-max animate-lf-marquee gap-4 pr-10 sm:gap-6">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className={`shrink-0 rounded-full border px-5 py-2 text-sm font-semibold shadow-sm ${CHIP[i % CHIP.length]}`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-6 text-center text-xs font-medium text-slate-600">
        <span className="text-fuchsia-600">★★★★★</span> “Finally one place for pipeline, inbox, and automation.” —{' '}
        <span className="text-violet-700">G2</span> review snippet
      </p>
    </div>
  )
}
