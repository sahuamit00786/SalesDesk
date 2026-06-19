import { NAV_SECTIONS } from '@/components/layout/navConfig'

const modules = NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.label))
const row = [...modules, ...modules]

export function ModulesMarquee() {
  return (
    <div className="relative border-y border-violet-100 bg-[#f5f3ff] py-12">
      <p className="relative mb-6 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-violet-500">
        Modules included in Connexify CRM
      </p>
      <div className="leadflow-mask-x relative overflow-hidden">
        <div className="flex w-max animate-lf-marquee gap-3 pr-8 sm:gap-4">
          {row.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 rounded-full border border-violet-200 bg-white px-5 py-2 text-xs font-semibold text-violet-700 shadow-sm"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
