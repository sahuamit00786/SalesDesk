function Block({ w, h = 'h-3', rounded = 'rounded-md', className = '' }) {
  return (
    <div className={`${h} ${rounded} ${w} bg-purple-200 ${className}`} />
  )
}

/** Wraps children in the shared skeleton base card */
function SkeletonCard({ children, className = '' }) {
  return (
    <div className={`animate-pulse rounded-2xl p-4 bg-purple-50 border border-purple-300 ${className}`}>
      {children}
    </div>
  )
}

/** Single table-row skeleton inside a wrapper table */
function TableRowSkeleton({ cols = 5, delay = 0 }) {
  return (
    <tr
      className="animate-pulse border-b border-purple-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 rounded-md bg-purple-200 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
          {i === 0 && (
            <div className="mt-1.5 h-2.5 w-20 rounded bg-purple-200" />
          )}
        </td>
      ))}
    </tr>
  )
}

/**
 * Full-page table skeleton — header bar + N rows.
 * Usage: <SkeletonTable cols={5} rows={8} />
 */
export function SkeletonTable({ cols = 5, rows = 8, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-purple-50 border border-purple-300 ${className}`}>
      {/* Header */}
      <div className="animate-pulse flex items-center gap-4 px-4 py-3 border-b border-purple-300 bg-purple-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className={`h-2.5 rounded bg-purple-200 ${i === 0 ? 'w-24' : 'w-16'}`}
          />
        ))}
      </div>
      {/* Rows */}
      <table className="w-full border-collapse">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} delay={i * 50} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Grid of skeleton cards.
 * Usage: <SkeletonCards count={6} cols="grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" />
 */
export function SkeletonCards({ count = 6, cols = 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3', cardHeight = 'h-36' }) {
  return (
    <div className={`grid gap-4 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className={cardHeight} style={{ animationDelay: `${i * 60}ms` }}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-purple-200" />
            <div className="flex-1 space-y-2.5">
              <Block w="w-32" h="h-3.5" />
              <Block w="w-48" />
              <Block w="w-24" h="h-2.5" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Block w="w-16" h="h-5" rounded="rounded-full" />
            <Block w="w-20" h="h-5" rounded="rounded-full" />
          </div>
        </SkeletonCard>
      ))}
    </div>
  )
}

/**
 * List of skeleton rows (no table — just div rows).
 * Good for activity feeds, email threads, task lists.
 */
export function SkeletonList({ rows = 6 }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-purple-50 border border-purple-300">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse flex items-center gap-4 px-4 py-3.5 ${i < rows - 1 ? 'border-b border-purple-300' : ''}`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-purple-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <Block w="w-40" h="h-3.5" />
            <Block w="w-56" />
          </div>
          <Block w="w-16" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for a detail/profile page with a header + tabs + body.
 */
export function SkeletonDetail() {
  return (
    <div className="space-y-4">
      {/* Header card */}
      <SkeletonCard>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 shrink-0 rounded-2xl bg-purple-200" />
          <div className="flex-1 space-y-2.5">
            <Block w="w-40" h="h-4" />
            <Block w="w-28" />
            <Block w="w-48" h="h-2.5" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 rounded-xl bg-purple-200" />
            <div className="h-9 w-24 rounded-xl bg-purple-200" />
          </div>
        </div>
      </SkeletonCard>
      {/* Tabs */}
      <div className="flex gap-2">
        {[80, 64, 72, 56, 80].map((w, i) => (
          <div
            key={i}
            className={`animate-pulse h-9 rounded-xl border border-purple-300 ${i === 0 ? 'bg-purple-200' : 'bg-purple-100'}`}
            style={{ width: w }}
          />
        ))}
      </div>
      {/* Body */}
      <SkeletonTable cols={4} rows={5} />
    </div>
  )
}

/**
 * KPI stat card skeletons in a row.
 */
export function SkeletonStatCards({ count = 6, cols = 'md:grid-cols-3 xl:grid-cols-6' }) {
  return (
    <div className={`grid gap-3 ${cols}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl px-4 py-4 bg-purple-50 border border-purple-300"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Block w="w-20" h="h-2.5" />
          <div className="mt-3 h-8 w-16 rounded-lg bg-purple-200" />
          <div className="mt-2.5 h-px w-full bg-purple-300" />
          <Block w="w-24" h="h-2" className="mt-3" />
        </div>
      ))}
    </div>
  )
}

/**
 * Two-column form/settings skeleton.
 */
export function SkeletonForm({ rows = 5 }) {
  return (
    <SkeletonCard>
      <div className="space-y-5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-1.5" style={{ animationDelay: `${i * 50}ms` }}>
            <Block w="w-24" h="h-2.5" />
            <div className="h-9 w-full rounded-xl bg-purple-200 border border-purple-300" />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <div className="h-9 w-20 rounded-xl bg-purple-200" />
          <div className="h-9 w-28 rounded-xl bg-purple-200" />
        </div>
      </div>
    </SkeletonCard>
  )
}

/**
 * Timeline/feed skeleton (icon + content cards).
 */
export function SkeletonTimeline({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse grid grid-cols-[160px_36px_minmax(0,1fr)] gap-2 py-1"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <Block w="w-28" />
          <div className="flex justify-center">
            <div className="h-7 w-7 rounded-full bg-purple-200 border border-purple-300" />
          </div>
          <div className="rounded-xl p-3 space-y-2 bg-purple-50 border border-purple-300">
            <Block w="w-40" h="h-3.5" />
            <Block w="w-56" />
            <Block w="w-32" h="h-2.5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Email thread list skeleton.
 */
export function SkeletonEmailList({ rows = 8 }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-purple-50 border border-purple-300">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse flex items-center gap-3 px-4 py-3 ${i < rows - 1 ? 'border-b border-purple-300' : ''}`}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-purple-200" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <Block w="w-32" h="h-3" />
              <Block w="w-16" h="h-2.5" />
            </div>
            <Block w="w-48" />
            <Block w="w-56" h="h-2.5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Calendar skeleton (month grid).
 */
export function SkeletonCalendar() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl p-4 bg-purple-50 border border-purple-300">
      {/* Month header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-32 rounded-lg bg-purple-200" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-purple-200" />
          <div className="h-8 w-8 rounded-lg bg-purple-200" />
        </div>
      </div>
      {/* Day headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {['S','M','T','W','T','F','S'].map((d) => (
          <div key={d} className="h-6 rounded bg-purple-200" />
        ))}
      </div>
      {/* Weeks */}
      {Array.from({ length: 5 }).map((_, w) => (
        <div key={w} className="mb-1 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, d) => (
            <div key={d} className={`h-10 rounded-lg ${d % 3 === 0 ? 'bg-purple-200' : 'bg-purple-100'}`} />
          ))}
        </div>
      ))}
    </div>
  )
}
