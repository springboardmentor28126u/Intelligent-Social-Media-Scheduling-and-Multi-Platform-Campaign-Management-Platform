import { Inbox, Plus } from 'lucide-react'

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  description = 'Get started by creating your first item.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="empty-state-card">
      <div className="empty-state-icon">
        <Icon size={32} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <button className="btn btn-primary btn-sm mt-3" onClick={onAction}>
          <Plus size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  )
}

export default EmptyState
