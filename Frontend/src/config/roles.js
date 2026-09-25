export const ROLES = {
  CONTENT_CREATOR: 'content_creator',
  MARKETING_MANAGER: 'marketing_manager',
  BUSINESS_USER: 'business_user',
  ADMINISTRATOR: 'administrator',
}

export const ROLE_CONFIG = {
  [ROLES.CONTENT_CREATOR]: {
    id: ROLES.CONTENT_CREATOR,
    label: 'Content Creator',
    badgeClass: 'badge-creator',
    description: 'Create, schedule, and analyze content performance across channels.',
    nav: [
      { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', page: 'dashboard' },
      { id: 'campaign-hub', label: 'Campaigns', icon: 'Megaphone', page: 'campaignHub' },
      { id: 'campaigns', label: 'Posts', icon: 'PlusCircle', page: 'campaigns' },
      { id: 'schedule', label: 'Schedule', icon: 'Clock', page: 'schedule' },
      { id: 'calendar', label: 'Calendar', icon: 'Calendar', page: 'schedule' },
      { id: 'accounts', label: 'Social Accounts', icon: 'Share2', page: 'accounts' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', page: 'analytics' },
      { id: 'engagement', label: 'Engagement', icon: 'MessageCircle', page: 'engagement' },
      { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet', page: 'reports' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell', page: 'notifications' },
    ],
  },
  [ROLES.MARKETING_MANAGER]: {
    id: ROLES.MARKETING_MANAGER,
    label: 'Marketing Manager',
    badgeClass: 'badge-manager',
    description: 'Orchestrate campaigns, content approvals, team workflows, and comprehensive reports.',
    nav: [
      { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', page: 'dashboard' },
      { id: 'campaign-hub', label: 'Campaigns', icon: 'Megaphone', page: 'campaignHub' },
      { id: 'campaigns', label: 'Posts', icon: 'PlusCircle', page: 'campaigns' },
      { id: 'content-approval', label: 'Content Approval', icon: 'CheckSquare', page: 'placeholder', title: 'Content Approval Workflow', description: 'Reviewing creator drafts before they are scheduled (Pending Approval status) is not part of Milestones 1–3.' },
      { id: 'schedule', label: 'Schedule', icon: 'Clock', page: 'schedule' },
      { id: 'calendar', label: 'Calendar', icon: 'Calendar', page: 'schedule' },
      { id: 'accounts', label: 'Social Accounts', icon: 'Share2', page: 'accounts' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', page: 'analytics' },
      { id: 'engagement', label: 'Engagement', icon: 'MessageCircle', page: 'engagement' },
      { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet', page: 'reports' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell', page: 'notifications' },
    ],
  },
  [ROLES.BUSINESS_USER]: {
    id: ROLES.BUSINESS_USER,
    label: 'Business User',
    badgeClass: 'badge-business',
    description: 'Track business ROI, campaign reach, and overall brand footprint.',
    nav: [
      { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', page: 'dashboard' },
      { id: 'campaign-hub', label: 'Campaigns', icon: 'Megaphone', page: 'campaignHub' },
      { id: 'campaigns', label: 'Posts', icon: 'PlusCircle', page: 'campaigns' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', page: 'analytics' },
      { id: 'engagement', label: 'Engagement', icon: 'MessageCircle', page: 'engagement' },
      { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet', page: 'reports' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell', page: 'notifications' },
    ],
  },
  [ROLES.ADMINISTRATOR]: {
    id: ROLES.ADMINISTRATOR,
    label: 'Administrator',
    badgeClass: 'badge-admin',
    description: 'System administration, RBAC, platform API keys, and audit logs.',
    nav: [
      { id: 'overview', label: 'Overview', icon: 'LayoutDashboard', page: 'dashboard' },
      { id: 'users', label: 'Users', icon: 'Users', page: 'adminUsers' },
      { id: 'campaign-hub', label: 'Campaigns', icon: 'Megaphone', page: 'campaignHub' },
      { id: 'campaigns', label: 'Posts', icon: 'PlusCircle', page: 'campaigns' },
      { id: 'schedule', label: 'Schedule', icon: 'Clock', page: 'schedule' },
      { id: 'calendar', label: 'Calendar', icon: 'Calendar', page: 'schedule' },
      { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'ShieldCheck', page: 'rolesMatrix' },
      { id: 'social-platforms', label: 'Social Platforms', icon: 'Globe', page: 'accounts' },
      { id: 'analytics', label: 'Analytics', icon: 'BarChart3', page: 'analytics' },
      { id: 'engagement', label: 'Engagement', icon: 'MessageCircle', page: 'engagement' },
      { id: 'reports', label: 'Reports', icon: 'FileSpreadsheet', page: 'reports' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell', page: 'notifications' },
    ],
  },
}

export function getRoleConfig(roleKey) {
  if (!roleKey) return ROLE_CONFIG[ROLES.CONTENT_CREATOR]
  
  const normalized = String(roleKey).toLowerCase().replace(/[\s-]+/g, '_')
  
  if (ROLE_CONFIG[normalized]) {
    return ROLE_CONFIG[normalized]
  }

  // Safely map the backend's generic "user" role and all unknown values to the
  // least-privileged frontend workspace. Never infer elevated access.
  return ROLE_CONFIG[ROLES.CONTENT_CREATOR]
}
