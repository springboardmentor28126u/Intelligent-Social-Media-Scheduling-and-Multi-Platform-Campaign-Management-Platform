import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts'

export const Sparkline = ({ data = [], dataKey = 'value', color = '#6366f1', height = 42, label }) => {
  if (!data.length) return null
  const id = `spark-${dataKey}-${color.replace('#', '')}`
  return <div className="sparkline" style={{ height }} aria-hidden="true">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
        <Tooltip cursor={false} contentStyle={{ fontSize: 11, padding: '2px 8px' }} labelFormatter={(_, p) => p?.[0]?.payload?.date || ''} formatter={v => [v, label || dataKey]} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
}

export default Sparkline
