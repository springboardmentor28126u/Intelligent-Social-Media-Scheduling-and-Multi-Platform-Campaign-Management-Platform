import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart3, TrendingUp, Eye, MousePointerClick, Heart } from 'lucide-react';
import Reveal from '@/components/common/Reveal';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/common/Button';

export default function AnalyticsSection() {
  return (
    <section id="analytics" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">Analytics</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            Understand what's working. Double down on it.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            Performance analytics appear here once you connect a social account.
          </p>
        </Reveal>

        <Reveal delay={100} variant="scale" className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-lift">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-900 text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-ink-900">Performance Overview</h3>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-ink-200 bg-ink-50 p-0.5">
                {['7D', '30D', '90D', 'All'].map((t, i) => (
                  <button
                    key={t}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                      i === 1 ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric cards — empty skeleton state */}
            <div className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
              {[
                { icon: TrendingUp, label: 'Engagement' },
                { icon: Eye, label: 'Reach' },
                { icon: MousePointerClick, label: 'Clicks' },
                { icon: Heart, label: 'Likes' },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-ink-100 p-4"
                >
                  <div className="flex items-center gap-2 text-ink-400">
                    <m.icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{m.label}</span>
                  </div>
                  <div className="mt-3 h-7 w-20 rounded-md skeleton" />
                  <div className="mt-2 h-2 w-full rounded-full bg-ink-50" />
                </div>
              ))}
            </div>

            {/* Chart — empty state with Recharts structure */}
            <div className="relative border-t border-ink-100 p-5">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emptyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
                    <XAxis
                      dataKey="x"
                      tick={{ fontSize: 12, fill: '#8492a8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#8492a8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#emptyGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Empty overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <EmptyState
                  icon={<BarChart3 className="h-7 w-7" />}
                  title="Connect an account to see analytics"
                  description="Once you connect a social account, your performance data will appear here."
                  action={<Button to="/signup" size="sm" variant="secondary">Connect account</Button>}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
