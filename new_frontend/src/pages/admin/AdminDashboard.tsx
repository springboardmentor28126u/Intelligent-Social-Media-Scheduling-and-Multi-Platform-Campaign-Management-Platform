import { Link } from 'react-router-dom';
import {
  Users,
  Shield,
  PenTool,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  Link2,
  FolderKanban,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboard() {
  const { profile, users } = useAuth();

  const adminCount = users.filter((u) => u.role === 'admin').length;
  const creatorCount = users.filter((u) => u.role === 'creator').length;

  const stats = [
    { icon: Users, label: 'Total Users', value: users.length },
    { icon: PenTool, label: 'Content Creators', value: creatorCount },
    { icon: Shield, label: 'Admins', value: adminCount },
    { icon: TrendingUp, label: 'New This Week', value: 0 },
  ];

  const quickActions = [
    { icon: Users, label: 'Manage Users', to: '/admin/users', desc: 'View and manage all users' },
    { icon: TrendingUp, label: 'Platform Analytics', to: '/admin/analytics', desc: 'View platform-wide stats' },
    { icon: FolderKanban, label: 'View Campaigns', to: '/app/campaigns', desc: 'See all campaigns' },
    { icon: CalendarDays, label: 'Global Calendar', to: '/app/calendar', desc: 'See all scheduled posts' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Admin Dashboard"
        description={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}. Here's an overview of your platform.`}
        action={
          <Button to="/admin/users" variant="secondary" size="md" leftIcon={<Users className="h-4 w-4" />}>
            Manage Users
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-700">
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-ink-900">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Recent Users</h3>
              </div>
              <Link to="/admin/users" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>

            {users.length === 0 ? (
              <EmptyState
                compact
                icon={<Users className="h-6 w-6" />}
                title="No users yet"
                description="Users will appear here once they sign up."
              />
            ) : (
              <div className="mt-5 space-y-2">
                {users.slice(0, 6).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-colors hover:bg-ink-50/50"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold ${
                        u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {u.full_name || 'Unnamed user'}
                      </p>
                      <p className="truncate text-xs text-ink-400">{u.email || 'No email'}</p>
                    </div>
                    <Badge variant={u.role === 'admin' ? 'brand' : 'neutral'} dot>
                      {u.role === 'admin' ? 'Admin' : 'Creator'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-ink-900">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-all hover:border-ink-200 hover:bg-ink-50/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white transition-transform group-hover:scale-110">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-900">{a.label}</p>
                    <p className="text-xs text-ink-400">{a.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-ink-900">Platform Status</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <Link2 className="h-4 w-4 text-ink-400" />
                  Connected accounts
                </div>
                <Badge variant="neutral">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <CalendarDays className="h-4 w-4 text-ink-400" />
                  Scheduled posts
                </div>
                <Badge variant="neutral">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <FolderKanban className="h-4 w-4 text-ink-400" />
                  Active campaigns
                </div>
                <Badge variant="neutral">0</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
