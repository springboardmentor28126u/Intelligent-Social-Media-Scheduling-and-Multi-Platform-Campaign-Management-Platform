import {
  CalendarDays,
  FolderKanban,
  Link2,
  BarChart3,
  PenSquare,
  Plus,
  TrendingUp,
  Eye,
  Heart,
  MousePointerClick,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { Skeleton, SkeletonCard } from '@/components/common/Skeleton';

const stats = [
  { icon: TrendingUp, label: 'Engagement', loading: true },
  { icon: Eye, label: 'Reach', loading: true },
  { icon: Heart, label: 'Likes', loading: true },
  { icon: MousePointerClick, label: 'Clicks', loading: true },
];

const quickActions = [
  { icon: PenSquare, label: 'Create Post', to: '/app/create', desc: 'Compose and schedule' },
  { icon: FolderKanban, label: 'New Campaign', to: '/app/campaigns', desc: 'Start a campaign' },
  { icon: Link2, label: 'Connect Account', to: '/app/accounts', desc: 'Link a platform' },
  { icon: CalendarDays, label: 'View Calendar', to: '/app/calendar', desc: 'See schedule' },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        description="An overview of your social media activity and performance."
        action={
          <Button to="/app/create" variant="secondary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            Create Post
          </Button>
        }
      />

      {/* Welcome banner */}
      <Card className="relative overflow-hidden border-ink-100 bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <Sparkles className="h-3 w-3 text-brand-300" />
              Welcome to SocialPilot
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              Let's get your social presence organized.
            </h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/60">
              Connect your first account, create a post, or explore the calendar to get started.
            </p>
          </div>
          <Button
            to="/app/accounts"
            variant="secondary"
            size="md"
            leftIcon={<Link2 className="h-4 w-4" />}
          >
            Connect Account
          </Button>
        </div>
      </Card>

      {/* Stats overview — skeleton/empty state */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
                <s.icon className="h-5 w-5" />
              </div>
              <Badge variant="neutral">—</Badge>
            </div>
            <p className="mt-3 text-sm text-ink-500">{s.label}</p>
            {s.loading ? (
              <Skeleton className="mt-1.5 h-7 w-20" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-ink-900">—</p>
            )}
            <Skeleton className="mt-3 h-2 w-full" />
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — scheduling & upcoming */}
        <div className="space-y-6 lg:col-span-2">
          {/* Scheduling overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Scheduling Overview</h3>
              </div>
              <Link to="/app/calendar" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            <EmptyState
              icon={<CalendarDays className="h-7 w-7" />}
              title="No scheduled posts yet"
              description="Create your first post and schedule it to see it appear here."
              action={<Button to="/app/create" size="sm" variant="secondary">Create your first post</Button>}
            />
          </Card>

          {/* Campaign overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Campaign Overview</h3>
              </div>
              <Link to="/app/campaigns" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            <EmptyState
              icon={<FolderKanban className="h-7 w-7" />}
              title="No active campaigns"
              description="Create a campaign to organize your content and track performance."
              action={<Button to="/app/campaigns" size="sm" variant="secondary">Create a campaign</Button>}
            />
          </Card>

          {/* Performance analytics */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Performance Analytics</h3>
              </div>
              <Link to="/app/analytics" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            <EmptyState
              icon={<BarChart3 className="h-7 w-7" />}
              title="Connect social accounts to see performance"
              description="Analytics will appear here once you connect a social account."
              action={<Button to="/app/accounts" size="sm" variant="secondary">Connect accounts</Button>}
            />
          </Card>
        </div>

        {/* Right column — quick actions & accounts */}
        <div className="space-y-6">
          {/* Quick actions */}
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

          {/* Connected accounts */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink-900">Connected Accounts</h3>
              <Link to="/app/accounts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Manage
              </Link>
            </div>
            <EmptyState
              compact
              icon={<Link2 className="h-6 w-6" />}
              title="No accounts connected"
              action={<Button to="/app/accounts" size="sm" variant="outline">Connect account</Button>}
            />
          </Card>

          {/* Loading skeleton example */}
          <div className="hidden">
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}
