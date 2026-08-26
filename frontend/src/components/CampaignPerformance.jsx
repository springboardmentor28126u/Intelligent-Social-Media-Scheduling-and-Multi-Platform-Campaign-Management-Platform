import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Eye, Heart, MousePointer, Target, Calendar } from 'lucide-react';

const CampaignPerformance = () => {
  const [timeRange, setTimeRange] = useState('30D');

  // Empty data sets for 7D, 30D, 90D
  const data30D = [];
  const data7D = [];
  const data90D = [];

  const currentData =
    timeRange === '7D' ? data7D : timeRange === '90D' ? data90D : data30D;

  const metrics = [
    {
      label: 'Impressions',
      value: '0',
      change: '0%',
      icon: Eye,
      color: 'text-indigo-600',
    },
    {
      label: 'Engagement',
      value: '0',
      change: '0%',
      icon: Heart,
      color: 'text-violet-600',
    },
    {
      label: 'Clicks',
      value: '0',
      change: '0%',
      icon: MousePointer,
      color: 'text-sky-600',
    },
    {
      label: 'Conversion',
      value: '0.0%',
      change: '0%',
      icon: Target,
      color: 'text-emerald-600',
    },
  ];

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg text-xs space-y-1.5 border border-slate-800">
          <p className="font-semibold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-indigo-400">Campaign Peak</span>
          </p>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> Impressions
              </span>
              <span className="font-bold text-white">
                {payload[0].value.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-400" /> Engagement
              </span>
              <span className="font-bold text-white">
                {payload[1]?.value.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header with Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Campaign Performance
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                No data
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Multi-platform engagement & conversion analytics
            </p>
          </div>

          {/* Time range selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 self-start sm:self-auto">
            {['7D', '30D', '90D'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Small Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {metrics.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50/60 border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-medium">{m.label}</span>
                  <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-slate-900">
                    {m.value}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600">
                    {m.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recharts Area Chart / Empty State Overlay */}
        <div className="h-64 w-full relative">
          {currentData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={currentData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorImpressions)"
                />
                <Area
                  type="monotone"
                  dataKey="engagement"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEngagement)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-50/20 border border-dashed border-slate-200 rounded-2xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                <TrendingUp className="w-5 h-5 stroke-[2]" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">No performance analytics</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Connect your social channels and publish posts to track impressions, click-through rates, and audience interactions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignPerformance;
