import { Sparkles, ArrowRight } from 'lucide-react'

export const PlaceholderPage = ({
  title = 'Module in Development',
  description = 'This feature is part of the upcoming enterprise release milestone.',
  onNavigateOverview,
}) => {
  return (
    <div className="placeholder-module">
      <div className="placeholder-hero">
        <div className="milestone-badge">
          <Sparkles size={14} />
          <span>Planned for a later milestone</span>
        </div>
        <h2>{title}</h2>
        <p className="placeholder-sub">{description}</p>
      </div>

      <div className="placeholder-footer">
        <button className="btn btn-secondary" onClick={onNavigateOverview}>
          Return to Overview Dashboard
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

export default PlaceholderPage
