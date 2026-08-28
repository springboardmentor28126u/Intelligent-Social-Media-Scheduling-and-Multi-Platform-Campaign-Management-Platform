import { useState } from 'react';
import {
  Image as ImageIcon,
  Hash,
  Calendar,
  Clock,
  Save,
  Send,
  FileText,
  Plus,
  X,
  Upload,
  Eye,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { platforms } from '@/components/common/PlatformIcons';

export default function CreatePost() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [content, setContent] = useState('');

  const togglePlatform = (key: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Create Post"
        description="Compose your content, select platforms, and schedule or save as draft."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Editor */}
        <div className="space-y-6">
          {/* Content editor */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">Content</h3>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              rows={6}
              className="mt-4 w-full resize-none rounded-xl border border-ink-100 bg-ink-50/30 p-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
              <span>{content.length} characters</span>
              <span>0 / 2800</span>
            </div>
          </Card>

          {/* Media upload */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">Media</h3>
            </div>
            <div className="mt-4">
              <button className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50/30 py-12 transition-all hover:border-brand-300 hover:bg-brand-50/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-ink-400 shadow-soft">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink-700">Upload media</p>
                  <p className="mt-0.5 text-xs text-ink-400">Drag & drop or click to browse</p>
                </div>
              </button>
            </div>
          </Card>

          {/* Platform selection */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-ink-900">Platforms</h3>
            <p className="mt-0.5 text-sm text-ink-400">Select where to publish this post.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {platforms.map((p) => {
                const selected = selectedPlatforms.includes(p.key);
                return (
                  <button
                    key={p.key}
                    onClick={() => togglePlatform(p.key)}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 transition-all ${
                      selected
                        ? 'border-brand-300 bg-brand-50/50 ring-2 ring-brand-500/10'
                        : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/50'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg ${p.bg} ${p.color}`}
                    >
                      <p.Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-ink-700">{p.name}</span>
                    {selected && (
                      <div className="ml-auto h-4 w-4 rounded-full bg-brand-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Scheduling */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">Schedule</h3>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-ink-500">Date</label>
                <div className="relative mt-1.5">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="date"
                    className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500">Time</label>
                <div className="relative mt-1.5">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="time"
                    className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Hashtags */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Hash className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">Hashtags</h3>
            </div>
            <div className="mt-4">
              <input
                type="text"
                placeholder="Add hashtags separated by commas"
                className="w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" size="md" leftIcon={<Save className="h-4 w-4" />}>
              Save Draft
            </Button>
            <Button variant="primary" size="md" leftIcon={<Calendar className="h-4 w-4" />}>
              Schedule Post
            </Button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-semibold text-ink-700">Live Preview</h3>
            </div>

            {/* Preview cards for selected platforms */}
            {selectedPlatforms.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  compact
                  icon={<Plus className="h-6 w-6" />}
                  title="Select a platform"
                  description="Choose platforms to see how your post will look."
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedPlatforms.map((key) => {
                  const p = platforms.find((x) => x.key === key);
                  if (!p) return null;
                  return (
                    <Card key={key} className="overflow-hidden">
                      <div className="flex items-center gap-2.5 border-b border-ink-100 p-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${p.bg} ${p.color}`}>
                          <p.Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-ink-700">{p.name}</span>
                      </div>
                      <div className="p-4">
                        {content ? (
                          <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
                            {content}
                          </p>
                        ) : (
                          <p className="text-sm text-ink-300">Your content preview will appear here...</p>
                        )}
                        <div className="mt-4 h-32 rounded-xl border-2 border-dashed border-ink-100 bg-ink-50/30" />
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
