import { Shield, Briefcase, PenTool, BarChart3, type LucideIcon } from 'lucide-react';

export const ADMIN = 'Administrator';
export const MANAGER = 'Social Media Manager';
export const CREATOR = 'Content Creator';
export const ANALYST = 'Analyst';

export const ALL_ROLES = [ADMIN, MANAGER, CREATOR, ANALYST] as const;
export type RoleName = (typeof ALL_ROLES)[number];

export const SIGNUP_ROLES = [CREATOR, MANAGER, ANALYST] as const;
export type SignupRoleName = (typeof SIGNUP_ROLES)[number];

export const ROLE_ALIASES: Record<string, RoleName> = {
  admin: ADMIN,
  administrator: ADMIN,
  manager: MANAGER,
  creator: CREATOR,
  analyst: ANALYST,
};

export type Permission =
  | 'users:manage'
  | 'settings:manage'
  | 'accounts:manage'
  | 'posts:write'
  | 'posts:read_all'
  | 'posts:write_any'
  | 'campaigns:write'
  | 'campaigns:read'
  | 'analytics:read'
  | 'analytics:read_all'
  | 'reports:export'
  | 'ai:use';

export const ALL_PERMISSIONS: Permission[] = [
  'users:manage',
  'settings:manage',
  'accounts:manage',
  'posts:write',
  'posts:read_all',
  'posts:write_any',
  'campaigns:write',
  'campaigns:read',
  'analytics:read',
  'analytics:read_all',
  'reports:export',
  'ai:use',
];

export const PERMISSIONS: Record<RoleName, Set<Permission>> = {
  [ADMIN]: new Set<Permission>(ALL_PERMISSIONS),
  [MANAGER]: new Set<Permission>([
    'accounts:manage',
    'posts:write',
    'posts:read_all',
    'posts:write_any',
    'campaigns:write',
    'campaigns:read',
    'analytics:read',
    'analytics:read_all',
    'reports:export',
    'ai:use',
  ]),
  [CREATOR]: new Set<Permission>([
    'accounts:manage',
    'posts:write',
    'campaigns:read',
    'analytics:read',
    'reports:export',
    'ai:use',
  ]),
  [ANALYST]: new Set<Permission>([
    'posts:read_all',
    'campaigns:read',
    'analytics:read',
    'analytics:read_all',
    'reports:export',
  ]),
};

export function normalizeRole(role?: string | null): RoleName {
  if (!role) return CREATOR;
  const trimmed = role.trim();
  if ((ALL_ROLES as readonly string[]).includes(trimmed)) {
    return trimmed as RoleName;
  }
  const lower = trimmed.toLowerCase();
  if (ROLE_ALIASES[lower]) {
    return ROLE_ALIASES[lower];
  }
  return CREATOR;
}

export function hasPermission(role: string | null | undefined, perm: Permission): boolean {
  const norm = normalizeRole(role);
  return PERMISSIONS[norm]?.has(perm) ?? false;
}

export function isAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === ADMIN;
}

export interface RoleConfig {
  name: RoleName;
  label: string;
  description: string;
  icon: LucideIcon;
  badgeVariant: 'brand' | 'success' | 'warning' | 'neutral' | 'danger';
  colorClass: string;
  bgClass: string;
  permissionCount: number;
}

export const ROLE_CONFIGS: Record<RoleName, RoleConfig> = {
  [ADMIN]: {
    name: ADMIN,
    label: 'Administrator',
    description: 'Full platform administration, user management, and system settings.',
    icon: Shield,
    badgeVariant: 'brand',
    colorClass: 'text-brand-700',
    bgClass: 'bg-brand-50 border-brand-200',
    permissionCount: 12,
  },
  [MANAGER]: {
    name: MANAGER,
    label: 'Social Media Manager',
    description: 'Create & manage campaigns, publish to accounts, and supervise all posts.',
    icon: Briefcase,
    badgeVariant: 'neutral',
    colorClass: 'text-sky-700',
    bgClass: 'bg-sky-50 border-sky-200',
    permissionCount: 10,
  },
  [CREATOR]: {
    name: CREATOR,
    label: 'Content Creator',
    description: 'Author and schedule social posts, upload media, and generate AI captions.',
    icon: PenTool,
    badgeVariant: 'success',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 border-emerald-200',
    permissionCount: 6,
  },
  [ANALYST]: {
    name: ANALYST,
    label: 'Analyst',
    description: 'Read-only access to campaign performance, post engagement, and exported reports.',
    icon: BarChart3,
    badgeVariant: 'warning',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50 border-amber-200',
    permissionCount: 5,
  },
};

export type PermissionCategory =
  | 'Platform Administration'
  | 'Accounts & Channels'
  | 'Publishing & Content'
  | 'Campaigns'
  | 'Analytics & Reports'
  | 'AI Intelligence';

export interface PermissionConfig {
  key: Permission;
  label: string;
  category: PermissionCategory;
  description: string;
}

export const PERMISSION_CONFIGS: PermissionConfig[] = [
  {
    key: 'users:manage',
    label: 'Manage Platform Users',
    category: 'Platform Administration',
    description: 'Create, update, assign roles, and remove platform user accounts.',
  },
  {
    key: 'settings:manage',
    label: 'Manage System Settings',
    category: 'Platform Administration',
    description: 'Configure registration policies, upload limits, and platform-wide options.',
  },
  {
    key: 'accounts:manage',
    label: 'Connect & Manage Accounts',
    category: 'Accounts & Channels',
    description: 'Link, unlink, and manage OAuth social channels (YouTube, LinkedIn, etc.).',
  },
  {
    key: 'posts:write',
    label: 'Create & Schedule Posts',
    category: 'Publishing & Content',
    description: 'Draft, schedule, edit, and publish posts to connected accounts.',
  },
  {
    key: 'posts:read_all',
    label: 'View All Team Posts',
    category: 'Publishing & Content',
    description: 'Review drafts, scheduled items, and published posts across all team creators.',
  },
  {
    key: 'posts:write_any',
    label: 'Supervise & Edit Any Post',
    category: 'Publishing & Content',
    description: 'Edit, reschedule, or cancel posts authored by other team members.',
  },
  {
    key: 'campaigns:write',
    label: 'Create & Manage Campaigns',
    category: 'Campaigns',
    description: 'Plan campaigns, define objectives, set budgets, and organize multi-platform content.',
  },
  {
    key: 'campaigns:read',
    label: 'View Campaigns',
    category: 'Campaigns',
    description: 'Read-only access to campaign targets, timeline, and associated content.',
  },
  {
    key: 'analytics:read',
    label: 'View Workspace Analytics',
    category: 'Analytics & Reports',
    description: 'Access engagement and reach metrics for posts in your workspace.',
  },
  {
    key: 'analytics:read_all',
    label: 'Organization-wide Analytics',
    category: 'Analytics & Reports',
    description: 'Full comparative performance analysis across all users and channels.',
  },
  {
    key: 'reports:export',
    label: 'Export Analytics Reports',
    category: 'Analytics & Reports',
    description: 'Generate and download CSV and PDF analytics reports.',
  },
  {
    key: 'ai:use',
    label: 'AI Content Assistant',
    category: 'AI Intelligence',
    description: 'Utilize AI for caption suggestions, hashtag generation, and sentiment analysis.',
  },
];

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  'Platform Administration',
  'Accounts & Channels',
  'Publishing & Content',
  'Campaigns',
  'Analytics & Reports',
  'AI Intelligence',
];
