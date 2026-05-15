import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const barData = [
  { m: 'Jan', v: 42 },
  { m: 'Feb', v: 55 },
  { m: 'Mar', v: 48 },
  { m: 'Apr', v: 72 },
  { m: 'May', v: 68 },
  { m: 'Jun', v: 88 },
]

const areaData = [
  { w: 'W1', f: 12 },
  { w: 'W2', f: 18 },
  { w: 'W3', f: 15 },
  { w: 'W4', f: 26 },
  { w: 'W5', f: 22 },
  { w: 'W6', f: 31 },
]

export default function ReportingCharts() {
  const bar = useMemo(() => barData, [])
  const area = useMemo(() => areaData, [])
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="h-64 rounded-2xl border border-lf-purple-100 bg-white p-3 shadow-sm">
        <p className="mb-2 px-1 text-xs font-semibold text-lf-muted">Revenue by month</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" vertical={false} />
            <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              cursor={{ fill: 'rgba(147,51,234,0.06)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff' }}
            />
            <Bar dataKey="v" fill="#9333ea" radius={[6, 6, 0, 0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="h-64 rounded-2xl border border-lf-purple-100 bg-white p-3 shadow-sm">
        <p className="mb-2 px-1 text-xs font-semibold text-lf-muted">Pipeline velocity</p>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={area} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="lfArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" vertical={false} />
            <XAxis dataKey="w" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e9d5ff' }} />
            <Area type="monotone" dataKey="f" stroke="#0ea5e9" fill="url(#lfArea)" strokeWidth={2} isAnimationActive />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
