import { TrendingUp, TrendingDown } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { Sparkline } from './Sparkline'

function AnimatedValue({ value }) {
  const numeric = typeof value === 'number'
  const shown = useCountUp(numeric ? value : 0)
  if (!numeric) return value
  return Math.round(shown).toLocaleString()
}

export const MetricCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendUp = true,
  accent = 'indigo',
  subtitle,
  onClick,
  spark,
  sparkKey = 'value',
  sparkColor,
}) => {
  const colors = { indigo: '#6366f1', emerald: '#10b981', amber: '#f59e0b', sky: '#0ea5e9', violet: '#8b5cf6' }
  return (
    <div className={`metric-card accent-${accent} ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-box">
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="metric-body">
        <div className="metric-value"><AnimatedValue value={value} /></div>
        {(trend !== undefined || subtitle) && (
          <div className="metric-footer">
            {trend !== undefined && (
              <span className={`metric-trend ${trendUp ? 'trend-up' : 'trend-down'}`}>
                {trendUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span>{trend}</span>
              </span>
            )}
            {trendLabel && <span className="metric-trend-label">{trendLabel}</span>}
            {subtitle && !trendLabel && <span className="metric-subtitle">{subtitle}</span>}
          </div>
        )}
        {spark && spark.length > 1 && <Sparkline data={spark} dataKey={sparkKey} color={sparkColor || colors[accent] || '#6366f1'} label={title} />}
      </div>
    </div>
  )
}

export default MetricCard
