import { StatDeltaCard } from '@/features/dashboard/components/DashboardChartCard'

export function KpiBlock({ block }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {block.items.map((item, i) => (
        <StatDeltaCard
          key={i}
          label={item.label}
          value={item.value}
          hint={item.hint}
          delta={item.delta}
          deltaPositive={item.deltaPositive}
          compact
        />
      ))}
    </div>
  )
}
