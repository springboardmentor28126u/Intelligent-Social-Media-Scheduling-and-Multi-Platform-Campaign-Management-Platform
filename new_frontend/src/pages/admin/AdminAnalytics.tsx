import { Users, Shield, PenTool, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';

const stats = [
  { icon: Users, label: 'Total Users' },
  { icon: PenTool, label: 'Creators' },
  { icon: Shield, label: 'Admins' },
  { icon: TrendingUp, label: 'Active Users (7d)' },
];

export default function AdminAnalytics() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Platform Analytics"
        description="Platform-wide statistics and user engagement."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-50 text-ink-700">
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-ink-500">{s.label}</p>
            <Skeleton className="mt-1.5 h-7 w-16" />
            <Skeleton className="mt-3 h-2 w-full" />
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink-900">User Growth</h3>
        <EmptyState
          compact
          icon={<TrendingUp className="h-6 w-6" />}
          title="Analytics will appear here once users start signing up."
          description="Track user growth, engagement, and platform activity over time."
        />
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink-900">Role Distribution</h3>
        <EmptyState
          compact
          icon={<Users className="h-6 w-6" />}
          title="No role distribution data yet"
          description="See the breakdown of admins and creators on your platform."
        />
      </Card>
    </div>
  );
}
