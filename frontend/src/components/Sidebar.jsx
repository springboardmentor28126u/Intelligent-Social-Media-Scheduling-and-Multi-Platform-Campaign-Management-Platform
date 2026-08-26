import React, { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  SquarePlus,
  Megaphone,
  Share2,
  BarChart3,
  FolderOpen,
  Bell,
  Settings,
  Sparkles,
  ChevronRight,
  UserCheck,
  LogOut,
  Shield
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, onOpenCreateModal, user, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'create', label: 'Create Post', icon: SquarePlus, action: true },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'accounts', label: 'Social Accounts', icon: Share2 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'media', label: 'Media Library', icon: FolderOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(user?.role === 'Administrator' ? [{ id: 'admin', label: 'Admin Users', icon: Shield }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];


  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none transition-all duration-200">
      {/* Top Header & Brand */}
      <div>
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-600/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-slate-900 font-sans block leading-none">
                Social<span className="text-indigo-600">Pilot</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                SaaS Dashboard
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    onOpenCreateModal();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Pro Badge Card */}
      <div className="px-4 py-3">
        <div className="p-3.5 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-sm border border-indigo-800/30 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-400/30">
              Pro Plan
            </span>
            <span className="text-[11px] text-slate-300">28 days left</span>
          </div>
          <p className="text-xs text-slate-200 font-medium mb-3">
            0 connected channels active
          </p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-400 to-violet-400 h-full w-0" />
          </div>
        </div>
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-indigo-200">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'US'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate max-w-[100px]">
                  {user?.name || 'User'}
                </span>
                <UserCheck className="w-3 h-3 text-indigo-500 shrink-0" />
              </div>
              <span className="text-xs text-slate-500 block">{user?.role || 'Creator'}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
