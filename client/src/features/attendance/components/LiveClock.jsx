import { useEffect, useState } from 'react'

export function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="hidden text-right lg:block">
      <p className="font-mono text-sm font-semibold tabular-nums text-ink">{time}</p>
      <p className="text-[11px] text-ink-muted">{date}</p>
    </div>
  )
}
