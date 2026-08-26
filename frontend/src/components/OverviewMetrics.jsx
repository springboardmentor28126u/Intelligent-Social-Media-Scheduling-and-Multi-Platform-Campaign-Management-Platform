import React from 'react';
import { Calendar, CheckCircle2, Megaphone, Link2, ArrowUpRight, Clock, ShieldCheck } from 'lucide-react';

const OverviewMetrics = () => {
  const metrics = [
    {
      id: 'scheduled',
      title: 'Scheduled Posts',
      value: '0',
      trend: 'No change',
      trendType: 'neutral',
      icon: Calendar,
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      badgeIcon: Clock,
      subtext: 'No scheduled content',
    },
    {
      id: 'published',
      title: 'Published Posts',
      value: '0',
      trend: 'No change',
      trendType: 'neutral',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      badgeIcon: Clock,
      subtext: 'No published content',
    },
    {
      id: 'campaigns',
      title: 'Active Campaigns',
      value: '0',
      trend: 'No campaigns',
      trendType: 'neutral',
      icon: Megaphone,
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      badgeIcon: Clock,
      subtext: 'Setup campaign to track',
    },
    {
      id: 'accounts',
      title: 'Connected Accounts',
      value: '0',
      trend: 'No accounts',
      trendType: 'neutral',
      icon: Link2,
      iconBg: 'bg-violet-50 text-violet-600 border-violet-100',
      badgeIcon: ShieldCheck,
      subtext: 'Connect accounts to sync',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const BadgeIcon = metric.badgeIcon;

        return (
          <div
            key={metric.id}
            className="group relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200"
          >
            {/* Top row: Icon + Trend Badge */}
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border ${metric.iconBg} transition-transform group-hover:scale-105 duration-200`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </div>

              {/* Trend Pill */}
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  metric.trendType === 'positive'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                    : metric.trendType === 'warning'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200/50'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <BadgeIcon className="w-3 h-3" />
                {metric.trend}
              </span>
            </div>

            {/* Readout */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 block">
                {metric.title}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
                  {metric.value}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {metric.subtext}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewMetrics;
