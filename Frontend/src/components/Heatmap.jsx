import { Sparkles } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const label = h => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`)

/** Weekday × hour grid shaded by average engagement per post. */
export const Heatmap = ({ cells = [], best, timezone }) => {
  const max = Math.max(0, ...cells.map(c => c.avg_engagement))
  const lookup = new Map(cells.map(c => [`${c.day}-${c.hour}`, c]))
  const posted = cells.filter(c => c.posts).length
  return <div className="heatmap-wrap">
    {best && <div className="heatmap-callout"><Sparkles size={16} /><span>Best time to post: <strong>{best.label}</strong> — {best.avg_engagement} avg engagements per post</span></div>}
    <div className="heatmap-scroll">
      <div className="heatmap-grid" role="table" aria-label="Average engagement by weekday and hour">
        <div className="hm-corner" />
        {Array.from({ length: 24 }, (_, h) => <div key={h} className="hm-hour">{h % 3 === 0 ? label(h) : ''}</div>)}
        {DAYS.map((day, d) => <div key={day} className="hm-row" role="row">
          <div className="hm-day" role="rowheader">{day}</div>
          {Array.from({ length: 24 }, (_, h) => {
            const cell = lookup.get(`${d}-${h}`) || { posts: 0, avg_engagement: 0 }
            const level = max && cell.posts ? 0.15 + 0.85 * (cell.avg_engagement / max) : 0
            const isBest = best && best.weekday === day && best.hour === h
            return <div key={h} role="cell" className={`hm-cell ${cell.posts ? 'has-data' : ''} ${isBest ? 'is-best' : ''}`}
              style={level ? { '--level': level } : undefined}
              title={cell.posts ? `${day} ${label(h)}: ${cell.posts} post(s), ${cell.avg_engagement} avg engagement` : `${day} ${label(h)}: no posts`} />
          })}
        </div>)}
      </div>
    </div>
    <div className="heatmap-legend"><span>Less</span>{[0.15, 0.35, 0.55, 0.75, 1].map(l => <i key={l} style={{ '--level': l }} />)}<span>More engagement</span>{timezone && <em>{posted} active slots · {timezone}</em>}</div>
  </div>
}

export default Heatmap
