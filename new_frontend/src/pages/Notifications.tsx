import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/services/notifications';
import { formatRelativeTime, type NotificationItem } from '@/types/notification';

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'published' | 'failed'>('all');
  const [markingAll, setMarkingAll] = useState(false);
  const navigate = useNavigate();

  const fetchNotificationList = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(50, 0);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationList();
  }, []);

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

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'published') return n.type === 'post_published';
    if (activeFilter === 'failed') return n.type === 'post_failed';
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Notifications"
        description="Stay updated on publishing status, schedule alerts, and system events."
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNotificationList}
              disabled={loading}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                leftIcon={markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              >
                Mark all as read
              </Button>
            )}
          </div>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
        {[
          { key: 'all', label: 'All', count: total },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'published', label: 'Published' },
          { key: 'failed', label: 'Failed' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key as any)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeFilter === f.key
                ? 'bg-ink-900 text-white shadow-soft'
                : 'bg-white text-ink-600 border border-ink-100 hover:bg-ink-50'
            }`}
          >
            <span>{f.label}</span>
            {f.count !== undefined && f.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                  activeFilter === f.key ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-700'
                }`}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-dashed p-12">
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            title="You're all caught up."
            description={
              activeFilter === 'unread'
                ? 'No unread notifications at the moment.'
                : 'No notifications matching this filter.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y divide-ink-100">
          {filteredNotifications.map((notif) => {
            const isPublished = notif.type === 'post_published';
            const isFailed = notif.type === 'post_failed';

            return (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-start gap-4 p-5 transition-all cursor-pointer hover:bg-ink-50/70 ${
                  !notif.is_read ? 'bg-brand-50/25 border-l-4 border-l-brand-600' : ''
                }`}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    isPublished
                      ? 'bg-emerald-100 text-emerald-600'
                      : isFailed
                      ? 'bg-danger-100 text-danger-600'
                      : 'bg-brand-100 text-brand-600'
                  }`}
                >
                  {isPublished ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isFailed ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <Info className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-ink-900">{notif.title}</h4>
                      <Badge variant={isPublished ? 'success' : isFailed ? 'danger' : 'neutral'}>
                        {isPublished ? 'Published' : isFailed ? 'Failed' : notif.type}
                      </Badge>
                    </div>
                    <span className="text-xs text-ink-400 shrink-0">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>

                  <p className="text-sm text-ink-600 leading-relaxed">{notif.message}</p>

                  {(notif.related_post_id || notif.related_campaign_id) && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800">
                        {notif.related_post_id ? `Go to Post #${notif.related_post_id}` : `Go to Campaign #${notif.related_campaign_id}`}
                        <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  )}
                </div>

                {!notif.is_read && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600 mt-2" />
                )}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
