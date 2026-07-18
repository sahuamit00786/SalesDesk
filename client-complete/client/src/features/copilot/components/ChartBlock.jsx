import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DashboardChartCard } from '@/features/dashboard/components/DashboardChartCard'
import { CHART_COLORS } from '@/features/dashboard/dummyDashboardData'

export function ChartBlock({ block }) {
  const { chartType, title, data, xKey, yKeys } = block

  return (
    <DashboardChartCard title={title || 'Chart'}>
      <ResponsiveContainer width="100%" height={220}>
        {chartType === 'pie' ? (
          <PieChart>
            <Tooltip />
            <Pie data={data} dataKey={yKeys?.[0]} nameKey={xKey} outerRadius={80}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : chartType === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {(yKeys || []).map((k, i) => (
              <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            {(yKeys || []).map((k, i) => (
              <Bar key={k} dataKey={k} fill={CHART_COLORS.slices[i % CHART_COLORS.slices.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </DashboardChartCard>
  )
}
