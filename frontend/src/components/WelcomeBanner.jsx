import React from 'react';
import { Plus, Calendar, Sparkles, TrendingUp } from 'lucide-react';

const WelcomeBanner = ({ onOpenCreateModal, onOpenScheduleModal, user }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs mb-6">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-indigo-50/80 via-indigo-50/20 to-transparent pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Text Area */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Good evening, {user?.name || 'User'} <span className="inline-block animate-bounce">👋</span>
            </h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Here's what's happening across your social channels.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Post</span>
          </button>

          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 hover:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs transition-all"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Schedule Content</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
