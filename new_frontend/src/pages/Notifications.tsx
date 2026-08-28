import { Bell, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';

export default function Notifications() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        description="Stay updated on your social media activity."
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {['All', 'Unread', 'Mentions', 'Scheduled'].map((f, i) => (
          <button
            key={f}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              i === 0 ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="border-dashed">
        <EmptyState
          icon={<CheckCircle2 className="h-7 w-7" />}
          title="You're all caught up."
          description="No new notifications. You'll be notified about scheduled posts, engagement, and account activity here."
        />
      </Card>

      {/* Hidden notification structure preview */}
      <div className="hidden">
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Bell className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-900">Notification title</p>
              <p className="mt-0.5 text-sm text-ink-500">Notification description</p>
              <p className="mt-1 text-xs text-ink-400">Time</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
