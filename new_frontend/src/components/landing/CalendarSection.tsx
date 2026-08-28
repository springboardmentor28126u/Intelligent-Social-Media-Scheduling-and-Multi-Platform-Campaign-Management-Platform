import { ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import Reveal from '@/components/common/Reveal';
import { platforms } from '@/components/common/PlatformIcons';

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarSection() {
  // Empty calendar grid — no fake dates or posts
  const cells = Array.from({ length: 35 });

  return (
    <section id="calendar" className="relative bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
            Content Calendar
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            See your entire publishing schedule at a glance.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            Switch between month, week, and day views. Filter by platform. Plan with clarity.
          </p>
        </Reveal>

        <Reveal delay={100} variant="scale" className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
            {/* Calendar header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 p-5">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-ink-900">Calendar</h3>
                <div className="flex items-center gap-1">
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 p-0.5">
                  {['Day', 'Week', 'Month'].map((v, i) => (
                    <button
                      key={v}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        i === 2 ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>

                {/* Platform filter */}
                <button className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50">
                  <Filter className="h-3.5 w-3.5" />
                  All platforms
                </button>

                <button className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-800">
                  <Plus className="h-3.5 w-3.5" />
                  Create
                </button>
              </div>
            </div>

            {/* Platform filter chips */}
            <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
              {platforms.map((p) => (
                <div
                  key={p.key}
                  className={`flex items-center gap-1.5 rounded-full ${p.bg} ${p.color} px-2.5 py-1 text-xs font-medium opacity-50 transition-opacity hover:opacity-100`}
                >
                  <p.Icon className="h-3.5 w-3.5" />
                  <span>{p.name}</span>
                </div>
              ))}
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-ink-100">
              {days.map((d) => (
                <div
                  key={d}
                  className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid — empty state */}
            <div className="grid grid-cols-7">
              {cells.map((_, i) => (
                <div
                  key={i}
                  className="group min-h-[88px] border-b border-r border-ink-50 p-2 transition-colors hover:bg-ink-50/50"
                >
                  <span className="text-xs text-ink-300 group-hover:text-ink-500">
                    {''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
