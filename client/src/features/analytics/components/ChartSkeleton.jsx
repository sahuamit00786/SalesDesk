export function ChartSkeleton({ height = 260 }) {
  return (
    <div
      className="flex items-center justify-center animate-pulse rounded-xl bg-[#F9F7FC]"
      style={{ height }}
    >
      <div className="h-24 w-24 rounded-full bg-[#DDD5F0]" />
    </div>
  )
}

export function KpiSkeleton() {
  return <div className="h-20 animate-pulse rounded-xl bg-[#F9F7FC] border border-[#C9BDE8]" />
}
