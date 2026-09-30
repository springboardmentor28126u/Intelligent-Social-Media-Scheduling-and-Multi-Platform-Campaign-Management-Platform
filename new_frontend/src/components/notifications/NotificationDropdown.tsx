import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notifications';
import { formatRelativeTime, type NotificationItem } from '@/types/notification';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications(10, 0);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifs();
    // Poll every 30 seconds while app is open
    const interval = setInterval(() => {
      fetchNotifs();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    }

    setIsOpen(false);

    if (notif.related_post_id) {
      navigate('/app/calendar');
    } else if (notif.related_campaign_id) {
      navigate('/app/campaigns');
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-ink-600 transition-colors hover:bg-ink-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-ink-100 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-ink-900">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-800 disabled:opacity-50"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-ink-100">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-ink-300" />
                <p className="mt-2 text-sm font-semibold text-ink-700">All caught up!</p>
                <p className="mt-0.5 text-xs text-ink-400">No recent notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isPublished = notif.type === 'post_published';
                const isFailed = notif.type === 'post_failed';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-ink-50/80 ${
                      !notif.is_read ? 'bg-brand-50/30' : ''
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        isPublished
                          ? 'bg-emerald-100 text-emerald-600'
                          : isFailed
                          ? 'bg-danger-100 text-danger-600'
                          : 'bg-brand-100 text-brand-600'
                      }`}
                    >
                      {isPublished ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isFailed ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-ink-900 truncate">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-ink-400 shrink-0">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-600 line-clamp-2">
                        {notif.message}
                      </p>
                      {(notif.related_post_id || notif.related_campaign_id) && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600">
                          View details <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>

                    {!notif.is_read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600 mt-1" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-ink-100 bg-ink-50/30 p-2 text-center">
            <Link
              to="/app/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-ink-600 hover:text-ink-900 block py-1"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
