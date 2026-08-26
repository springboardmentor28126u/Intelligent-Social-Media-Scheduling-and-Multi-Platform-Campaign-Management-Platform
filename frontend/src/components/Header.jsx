import React, { useState } from 'react';
import { Search, Bell, Plus, Sparkles, Command } from 'lucide-react';

const Header = ({ onOpenCreateModal }) => {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20 transition-all duration-200">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          Dashboard
          <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
            Live Updates
          </span>
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage your social presence from one place.
        </p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div
          className={`relative flex items-center transition-all duration-200 ${
            searchFocused ? 'w-72' : 'w-60'
          }`}
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search campaigns, posts..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 placeholder-slate-400 pl-9 pr-12 py-2 rounded-xl border border-transparent focus:border-indigo-300 focus:outline-none focus:ring-3 focus:ring-indigo-500/10 transition-all"
          />
          <div className="absolute right-2.5 flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded border border-slate-300/40 pointer-events-none">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>

        {/* Notification Bell Button */}
        <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all border border-transparent hover:border-slate-200">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full ring-2 ring-white" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User Quick Profile Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-indigo-200 cursor-pointer hover:ring-indigo-600/50 transition-all">
            AD
          </div>

          {/* Primary Create Post Button */}
          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-600/30 transition-all duration-150"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create Post</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
