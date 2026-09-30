import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  PenSquare,
  FolderKanban,
  Link2,
  BarChart3,
  Image,
  Bell,
  Settings,
  Menu,
  X,
  Search,
  ChevronDown,
  User,
  Briefcase,
  LogOut,
  Shield,
} from 'lucide-react';
import Logo from '@/components/common/Logo';
import { useAuth } from '@/contexts/AuthContext';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';

const navItems = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/create', label: 'Create Post', icon: PenSquare },
  { to: '/app/campaigns', label: 'Campaigns', icon: FolderKanban },
  { to: '/app/accounts', label: 'Social Accounts', icon: Link2 },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/media', label: 'Media Library', icon: Image },
  { to: '/app/notifications', label: 'Notifications', icon: Bell },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const mobileNav = [
  { to: '/app', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/create', label: 'Create', icon: PenSquare },
  { to: '/app/campaigns', label: 'Campaigns', icon: FolderKanban },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (to: string, end?: boolean) => {
    if (end) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-ink-100 bg-white lg:flex">
        <SidebarContent
          isActive={isActive}
          profile={profile}
          onSignOut={handleSignOut}
        />
      </aside>

      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-100 bg-white lg:hidden animate-slide-right">
            <button
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              isActive={isActive}
              profile={profile}
              onSignOut={handleSignOut}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-xl border border-ink-100 bg-ink-50/50 py-2.5 pl-10 pr-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>

          {profile?.role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 transition-colors hover:bg-brand-100"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin Panel</span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <NotificationDropdown />
            <Link
              to="/app/settings"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="mx-1 h-6 w-px bg-ink-100" />
            <button className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white p-1.5 pr-3 transition-colors hover:bg-ink-50">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-900 text-white">
                <User className="h-4 w-4" />
              </div>
              <span className="hidden text-sm font-medium text-ink-700 sm:block">
                {profile?.full_name || 'Your Profile'}
              </span>
              <ChevronDown className="hidden h-4 w-4 text-ink-400 sm:block" />
            </button>
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] pb-20 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-ink-100 bg-white/90 backdrop-blur-xl lg:hidden">
        {mobileNav.map((item) => {
          const active = isActive(item.to, item.end);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1 py-3 px-2 text-[10px] font-medium transition-colors ${
                active ? 'text-brand-600' : 'text-ink-400'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function SidebarContent({
  isActive,
  profile,
  onSignOut,
  onNavigate,
}: {
  isActive: (to: string, end?: boolean) => boolean;
  profile: { full_name: string | null; email: string | null; role: string } | null;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <div className="px-3 pb-2">
        <button className="flex w-full items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-3 py-2.5 text-left transition-colors hover:bg-ink-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">My Workspace</p>
              <p className="text-xs text-ink-400">Free plan</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-ink-400" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.to, item.end);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-ink-900 text-white shadow-sm'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  }`}
                >
                  <item.icon
                    className={`h-[18px] w-[18px] transition-colors ${
                      active ? 'text-white' : 'text-ink-400 group-hover:text-ink-600'
                    }`}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {profile?.role === 'admin' && (
          <>
            <div className="my-4 border-t border-ink-100" />
            <Link
              to="/admin"
              onClick={onNavigate}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-700 transition-all hover:bg-brand-50"
            >
              <Shield className="h-[18px] w-[18px] text-brand-600" />
              Admin Panel
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-ink-100 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
            <User className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-ink-800">
              {profile?.full_name || 'Your Profile'}
            </p>
            <p className="truncate text-xs text-ink-400">
              {profile?.role === 'admin' ? 'Administrator' : 'Content Creator'}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
