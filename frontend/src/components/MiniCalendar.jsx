import React from 'react';
import { Calendar as CalendarIcon, ArrowRight, Plus } from 'lucide-react';

const MiniCalendar = ({ onOpenCalendar, onOpenCreateModal }) => {
  const weekDays = [
    { day: 'MON', date: 'Aug 24', count: 0, posts: [] },
    { day: 'TUE', date: 'Aug 25', count: 0, posts: [] },
    { day: 'WED', date: 'Aug 26', count: 0, posts: [], isToday: true },
    { day: 'THU', date: 'Aug 27', count: 0, posts: [] },
    { day: 'FRI', date: 'Aug 28', count: 0, posts: [] },
    { day: 'SAT', date: 'Aug 29', count: 0, posts: [] },
    { day: 'SUN', date: 'Aug 30', count: 0, posts: [] },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Mini Content Calendar
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              This Week
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Weekly content distribution across all connected platforms
          </p>
        </div>

        <button
          onClick={onOpenCalendar}
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-xl transition-colors self-start sm:self-auto"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Open Calendar</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((item) => (
          <div
            key={item.day}
            className={`group p-3.5 rounded-xl border transition-all duration-150 relative flex flex-col justify-between min-h-[110px] ${
              item.isToday
                ? 'bg-indigo-50/60 border-indigo-200 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-slate-50/40 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {/* Top: Day & Date */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-[11px] font-bold tracking-wider ${
                    item.isToday ? 'text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  {item.day}
                </span>

                {item.isToday && (
                  <span className="text-[9px] font-bold text-white bg-indigo-600 px-1.5 py-0.2 rounded">
                    TODAY
                  </span>
                )}
              </div>

              <span className="text-xs font-semibold text-slate-900 block mb-2">
                {item.date}
              </span>
            </div>

            {/* Bottom: Count Pill or Empty State */}
            <div>
              {item.count > 0 ? (
                <div className="space-y-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      item.isToday
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-indigo-700 border border-indigo-200/80'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    {item.count} {item.count === 1 ? 'post' : 'posts'}
                  </span>

                  <p className="text-[10px] text-slate-500 font-medium truncate pt-1">
                    {item.posts[0]}
                  </p>
                </div>
              ) : (
                <button
                  onClick={onOpenCreateModal}
                  className="w-full py-1 text-[11px] font-medium text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 bg-white hover:bg-slate-100/80 rounded-md border border-slate-200/60 border-dashed transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniCalendar;
