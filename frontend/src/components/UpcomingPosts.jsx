import React, { useState } from 'react';
import { Calendar, MoreHorizontal, ArrowRight, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { InstagramIcon, LinkedinIcon, FacebookIcon } from './SocialIcons';

const UpcomingPosts = ({ onViewCalendar, onOpenCreateModal }) => {
  const [posts, setPosts] = useState([]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Upcoming Posts
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Your next scheduled content
            </p>
          </div>

          <button
            onClick={onViewCalendar}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            <span>View Calendar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Post Rows / Empty State */}
        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => {
              const PlatformIcon = post.platformIcon;

              return (
                <div
                  key={post.id}
                  className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-200 transition-all duration-150"
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative shrink-0">
                      <img
                        src={post.thumbnail}
                        alt={post.title}
                        className="w-11 h-11 rounded-lg object-cover ring-1 ring-slate-200/80"
                      />
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border border-white ${post.platformBg}`}
                      >
                        <PlatformIcon className="w-3 h-3" />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {post.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{post.platform}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {post.date} · {post.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badge & Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      {post.status}
                    </span>

                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-200">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/20">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
              <Calendar className="w-5 h-5 stroke-[2]" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">No posts scheduled</h4>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Your queue is currently empty. Schedule a new post to engage your audience.
            </p>
            {onOpenCreateModal && (
              <button
                onClick={onOpenCreateModal}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl transition-all shadow-xs active:scale-95 duration-100"
              >
                <span>Schedule Post</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Showing 0 of 0 scheduled posts
        </span>
        <button
          onClick={onViewCalendar}
          className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
        >
          View Calendar →
        </button>
      </div>
    </div>
  );
};

export default UpcomingPosts;
