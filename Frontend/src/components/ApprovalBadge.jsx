import { approvalLabel } from '../workflowPolicy'

export function ApprovalBadge({ status }) {
  const tone = status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : status === 'draft' ? 'muted' : 'pending'
  return <span className={`status-pill tone-${tone}`}>{approvalLabel(status)}</span>
}
