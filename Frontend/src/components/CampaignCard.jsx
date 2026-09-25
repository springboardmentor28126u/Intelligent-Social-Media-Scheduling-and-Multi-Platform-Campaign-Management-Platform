import { Calendar, Clock, Edit3, Trash2, CheckCircle2, Clock3, AlertTriangle, CircleDashed } from 'lucide-react'
import { PlatformBadge } from './PlatformBadge'
import { statusLabel, statusTone } from '../postUtils'

export const CampaignCard = ({
  campaign,
  index,
  onEdit,
  onDelete,
  onDetails, canManage,
}) => {
  if (!campaign) return null

  const tone = statusTone(campaign.status)
  const ToneIcon = { success: CheckCircle2, danger: AlertTriangle, muted: CircleDashed, pending: Clock3 }[tone]

  return (
    <div className="campaign-card-modern">
      <div className="campaign-card-top">
        <div className="campaign-title-wrap">
          <h3 className="campaign-title">{campaign.name} {campaign.is_demo && <span className="demo-chip">Sample</span>}</h3>
          <span className={`status-pill tone-${tone}`}>
            <ToneIcon size={12} />
            <span>{statusLabel(campaign.status)}</span>
          </span>
        </div>
        <PlatformBadge platform={campaign.platform} />
      </div>

      <div className="campaign-card-content">
        <p className="post-text-preview">{campaign.content}</p>
      </div>

      <div className="campaign-card-footer">
        <div className="campaign-meta-info">
          <div className="meta-item">
            <Calendar size={14} className="meta-icon" />
            <span>{campaign.date || 'No date'}</span>
          </div>
          <div className="meta-item">
            <Clock size={14} className="meta-icon" />
            <span>{campaign.time || 'No time'}</span>
          </div>
        </div>

        <div className="campaign-actions"><button className="btn btn-ghost btn-xs" onClick={() => onDetails(campaign.id)}>Details</button>
          <button
            type="button"
            className="action-icon-btn btn-edit"
            onClick={() => onEdit(index)} disabled={!canManage}
            title={campaign.status === 'draft' ? 'Edit draft' : 'Scheduled/published posts: open details to reschedule, cancel or change campaign'}
          >
            <Edit3 size={15} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            className="action-icon-btn btn-delete"
            onClick={() => onDelete(index)} disabled={!canManage || campaign.status !== 'draft' || campaign.jobs.length > 0}
            title={campaign.status === 'draft' && campaign.jobs.length === 0 ? 'Delete draft' : 'Only unscheduled drafts can be deleted'}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CampaignCard

