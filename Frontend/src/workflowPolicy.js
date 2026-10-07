export const canPublish = role => role === 'content_creator'
export const approvalLabel = status => ({ draft: 'Draft', pending: 'Awaiting manager', awaiting_creator: 'Awaiting creator', approved: 'Creator approved', rejected: 'Changes requested' }[status] || 'Draft')
export function reviewActions(role, status) {
  if (canPublish(role)) return status === 'awaiting_creator' ? ['approve', 'reject'] : []
  if (role === 'marketing_manager') {
    return ['draft', 'pending', 'rejected'].includes(status) ? ['approve', 'reject'] : []
  }
  return []
}
export const publishingMessage = 'Only content creators can connect accounts, schedule, publish or retry. Ask a creator to publish approved content.'
