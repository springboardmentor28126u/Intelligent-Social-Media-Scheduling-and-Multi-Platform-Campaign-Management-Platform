import { useState } from 'react';
import { Upload, Search, LayoutGrid, List, Image as ImageIcon, Filter } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';

export default function MediaLibrary() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Media Library"
        description="Manage your images, videos, and creative assets."
        action={
          <Button variant="secondary" size="md" leftIcon={<Upload className="h-4 w-4" />}>
            Upload
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search media..."
              className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <button className="flex items-center gap-1.5 rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-50">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
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

      {/* Upload area / empty state */}
      <Card className="border-dashed">
        <EmptyState
          icon={<ImageIcon className="h-7 w-7" />}
          title="Your media library is empty."
          description="Upload your first asset to start using it in your posts and campaigns."
          action={
            <Button variant="secondary" size="md" leftIcon={<Upload className="h-4 w-4" />}>
              Upload your first asset
            </Button>
          }
        />
      </Card>

      {/* Upload zone (interactive) */}
      <button className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/30 py-16 transition-all hover:border-brand-300 hover:bg-brand-50/30">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-ink-400 shadow-soft">
          <Upload className="h-7 w-7" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-ink-700">Drag & drop files here</p>
          <p className="mt-1 text-xs text-ink-400">Supports images and videos up to 50MB</p>
        </div>
      </button>
    </div>
  );
}
