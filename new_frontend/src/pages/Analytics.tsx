import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Eye,
  MousePointerClick,
  Heart,
  BarChart3,
  Share2,
  Users,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { platforms } from '@/components/common/PlatformIcons';

const metrics = [
  { icon: TrendingUp, label: 'Engagement Rate', value: null },
  { icon: Eye, label: 'Reach', value: null },
  { icon: MousePointerClick, label: 'Clicks', value: null },
  { icon: Heart, label: 'Likes', value: null },
  { icon: Share2, label: 'Shares', value: null },
  { icon: Users, label: 'Followers', value: null },
];

export default function Analytics() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Analytics"
        description="Track and understand your social media performance."
        action={
          <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-white p-0.5">
            {['7D', '30D', '90D', 'All'].map((t, i) => (
              <button
                key={t}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                  i === 1 ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />

      {/* Metric cards — skeleton state */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="flex items-center gap-2 text-ink-400">
              <m.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{m.label}</span>
            </div>
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-2 w-full" />
          </Card>
        ))}
      </div>

      {/* Performance chart — empty state */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="h-5 w-5 text-ink-700" />
            <h3 className="text-base font-semibold text-ink-900">Performance Overview</h3>
          </div>
        </div>
        <div className="relative p-5">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#8492a8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#8492a8' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#perfGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <EmptyState
              icon={<BarChart3 className="h-7 w-7" />}
              title="Analytics will appear here once you connect a social account."
              action={<Button to="/app/accounts" size="sm" variant="secondary">Connect account</Button>}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Engagement chart */}
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 p-5">
            <h3 className="text-base font-semibold text-ink-900">Engagement</h3>
          </div>
          <div className="relative p-5">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                  <XAxis dataKey="x" tick={{ fontSize: 12, fill: '#8492a8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#8492a8' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <p className="text-sm text-ink-400">No engagement data yet</p>
            </div>
          </div>
        </Card>

        {/* Platform comparison */}
        <Card className="overflow-hidden">
          <div className="border-b border-ink-100 p-5">
            <h3 className="text-base font-semibold text-ink-900">Platform Comparison</h3>
          </div>
          <div className="relative p-5">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                  <XAxis dataKey="platform" tick={{ fontSize: 12, fill: '#8492a8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#8492a8' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {platforms.slice(0, 4).map((p) => (
                  <div key={p.key} className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.bg} ${p.color} opacity-40`}>
                    <p.Icon className="h-4 w-4" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-ink-400">No platform data yet</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Campaign performance */}
      <Card className="p-5">
        <h3 className="text-base font-semibold text-ink-900">Campaign Performance</h3>
        <EmptyState
          compact
          icon={<BarChart3 className="h-6 w-6" />}
          title="No campaign performance data"
          description="Create and run campaigns to see performance metrics here."
          action={<Button to="/app/campaigns" size="sm" variant="outline">Go to campaigns</Button>}
        />
      </Card>
    </div>
  );
}
