import { useState } from 'react';
import { Plus, FolderKanban, Search, LayoutGrid, List } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import Badge from '@/components/common/Badge';

const filters = ['All', 'Active', 'Draft', 'Scheduled', 'Completed'];

export default function Campaigns() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Campaigns"
        description="Create, organize, and monitor your social media campaigns."
        action={
          <Button variant="secondary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            Create Campaign
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                activeFilter === f
                  ? 'bg-ink-900 text-white'
                  : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search campaigns..."
              className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 sm:w-56"
            />
          </div>
          <div className="flex items-center rounded-lg border border-ink-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-ink-100 text-ink-900' : 'text-ink-400'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-all ${
                viewMode === 'list' ? 'bg-ink-100 text-ink-900' : 'text-ink-400'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <Card className="border-dashed">
        <EmptyState
          icon={<FolderKanban className="h-7 w-7" />}
          title="No campaigns created yet"
          description="Create your first campaign to organize posts, track progress, and measure results across platforms."
          action={
            <Button variant="secondary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
              Create Campaign
            </Button>
          }
        />
      </Card>

      {/* Campaign structure preview (hidden until data exists) */}
      <div className="hidden">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card hover className="p-5">
            <div className="flex items-center justify-between">
              <Badge variant="brand" dot>Active</Badge>
              <span className="text-xs text-ink-400">0 posts</span>
            </div>
            <h3 className="mt-3 text-base font-semibold text-ink-900">Campaign name</h3>
            <p className="mt-1 text-sm text-ink-500">Description</p>
            <div className="mt-4 h-1.5 w-full rounded-full bg-ink-100">
              <div className="h-1.5 rounded-full bg-brand-600" style={{ width: '0%' }} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
