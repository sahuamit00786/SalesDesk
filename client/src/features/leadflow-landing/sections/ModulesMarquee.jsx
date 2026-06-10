import { NAV_SECTIONS } from '@/components/layout/navConfig'

const modules = NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.label))
const row = [...modules, ...modules]

export function ModulesMarquee() {
  return (
    <div className="relative border-y border-white/[0.05] bg-[#080820] py-12">
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(139,92,246,0.04), transparent)' }}
        aria-hidden
      />
      <p className="relative mb-6 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400/70">
        Modules included in Connexify CRM
      </p>
      <div className="leadflow-mask-x relative overflow-hidden">
        <div className="flex w-max animate-lf-marquee gap-3 pr-8 sm:gap-4">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 rounded-full border border-violet-500/20 bg-violet-500/[0.07] px-5 py-2 text-xs font-semibold text-violet-300/70 backdrop-blur-sm"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
