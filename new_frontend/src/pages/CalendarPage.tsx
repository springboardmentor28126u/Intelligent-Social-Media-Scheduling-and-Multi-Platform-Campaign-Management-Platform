import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CalendarDays,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { platforms } from '@/components/common/PlatformIcons';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i);

export default function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Calendar"
        description="Visualize and manage your publishing schedule."
        action={
          <Button to="/app/create" variant="secondary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            Create Post
          </Button>
        }
      />

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-ink-900">Schedule</h2>
            <div className="flex items-center gap-0.5">
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 p-0.5">
              {(['Day', 'Week', 'Month'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v.toLowerCase() as any)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    view === v.toLowerCase()
                      ? 'bg-white text-ink-900 shadow-soft'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">
              <Filter className="h-3.5 w-3.5" />
              All platforms
            </button>
          </div>
        </div>

        {/* Platform filters */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-ink-100 px-4 py-3 scrollbar-hide">
          {platforms.map((p) => (
            <button
              key={p.key}
              className={`flex shrink-0 items-center gap-1.5 rounded-full ${p.bg} ${p.color} px-3 py-1 text-xs font-medium transition-opacity hover:opacity-80`}
            >
              <p.Icon className="h-3.5 w-3.5" />
              {p.name}
            </button>
          ))}
        </div>

        {/* Calendar body */}
        {view === 'month' && <MonthView />}
        {view === 'week' && <WeekView />}
        {view === 'day' && <DayView />}
      </Card>
    </div>
  );
}

function MonthView() {
  const cells = Array.from({ length: 35 });
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-ink-100">
        {dayNames.map((d) => (
          <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((_, i) => (
          <div
            key={i}
            className="group min-h-[100px] border-b border-r border-ink-50 p-2 transition-colors hover:bg-ink-50/50 sm:min-h-[120px]"
          >
            <span className="text-xs text-ink-300 group-hover:text-ink-500">&nbsp;</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekView() {
  return (
    <div className="grid grid-cols-8 text-xs">
      {/* Time column */}
      <div className="border-r border-ink-100">
        <div className="h-12 border-b border-ink-50" />
        {hours.map((h) => (
          <div key={h} className="flex h-14 items-start justify-end pr-2 pt-1 text-ink-300">
            {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
          </div>
        ))}
      </div>
      {/* Day columns */}
      {dayNames.map((d) => (
        <div key={d} className="border-r border-ink-50 last:border-r-0">
          <div className="flex h-12 items-center justify-center border-b border-ink-100 font-semibold text-ink-500">
            {d}
          </div>
          {hours.map((h) => (
            <div
              key={h}
              className="group h-14 border-b border-ink-50 transition-colors hover:bg-brand-50/30"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DayView() {
  return (
    <div className="grid grid-cols-[80px_1fr] text-xs">
      <div className="border-r border-ink-100">
        {hours.map((h) => (
          <div key={h} className="flex h-16 items-start justify-end pr-2 pt-1 text-ink-300">
            {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
          </div>
        ))}
      </div>
      <div>
        {hours.map((h) => (
          <div key={h} className="group h-16 border-b border-ink-50 transition-colors hover:bg-brand-50/30" />
        ))}
      </div>
    </div>
  );
}
