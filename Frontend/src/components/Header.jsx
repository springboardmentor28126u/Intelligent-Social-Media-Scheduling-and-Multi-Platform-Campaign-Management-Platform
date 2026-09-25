import { useState, useRef, useEffect } from 'react'
import {
  Menu,
  Plus,
  Bell,
  ChevronDown,
  User,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock3,
} from 'lucide-react'
import { ROLE_CONFIG, ROLES } from '../config/roles'

export const Header = ({
  activePage,
  pageTitle,
  userName,
  userEmail,
  currentRole,
  onLogout,
  onOpenCreateCampaign,
  canCreateCampaign,
  onToggleMobileSidebar,
  notifications = [],
  onOpenProfile,
  onOpenNotification,
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const profileRef = useRef(null)
  const notifRef = useRef(null)

  const roleConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG[ROLES.CONTENT_CREATOR]

  const userInitial = (userName || 'User').trim().charAt(0).toUpperCase()
  const seenKey = `notifications_seen_${userEmail || 'user'}`
  const [seenAt, setSeenAt] = useState(() => { try { return Number(localStorage.getItem(seenKey) || 0) } catch { return 0 } })
  const isNew = n => n.tone !== 'pending' && new Date(n.at).getTime() > seenAt
  const unread = notifications.filter(isNew).length
  const toggleNotifications = () => {
    if (!showNotifications) {
      const now = Date.now()
      setSeenAt(now)
      try { localStorage.setItem(seenKey, String(now)) } catch { /* storage unavailable */ }
    }
    setShowNotifications(!showNotifications)
  }

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className="app-header">
      {/* Left side: Hamburger & Breadcrumbs */}
      <div className="header-left">
        <button
          type="button"
          className="mobile-sidebar-toggle"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation"
        >
          <Menu size={20} />
        </button>

        <div className="breadcrumb-nav">
          <span className="breadcrumb-root">SocialPilot</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">
            {pageTitle || (activePage ? activePage.charAt(0).toUpperCase() + activePage.slice(1) : 'Dashboard')}
          </span>
        </div>
      </div>

      {/* Right side: Actions, Notifications, Profile */}
      <div className="header-right">
        {/* Quick Action */}
        {canCreateCampaign && (
          <button
            type="button"
            className="btn btn-primary btn-sm header-action-btn"
            onClick={onOpenCreateCampaign}
          >
            <Plus size={16} />
            <span>New Post</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="header-dropdown-wrap" ref={notifRef}>
          <button
            type="button"
            className="icon-btn-header"
            onClick={toggleNotifications}
            aria-label={`Notifications${unread ? ` (${unread} new)` : ''}`}
          >
            <Bell size={18} />
            {unread > 0 && <span className="notification-dot" />}
          </button>

          {showNotifications && (
            <div className="header-popover notifications-popover">
              <div className="popover-header">
                <span className="popover-title">Publishing updates</span>
                {unread > 0 && <span className="badge badge-primary">{unread} New</span>}
              </div>
              <div className="popover-list">
                {notifications.length === 0 ? (
                  <div className="notification-item">
                    <div className="notif-content">
                      <p className="notif-text">No publishing activity yet</p>
                      <span className="notif-time">Published, failed and upcoming posts appear here.</span>
                    </div>
                  </div>
                ) : notifications.map(n => {
                  const Icon = n.tone === 'success' ? CheckCircle2 : n.tone === 'danger' ? AlertTriangle : Clock3
                  return (
                    <button type="button" key={n.id} className={`notification-item notif-button ${isNew(n) ? 'unread' : ''}`} onClick={() => { setShowNotifications(false); if (onOpenNotification) onOpenNotification(n) }}>
                      <div className={`notif-icon ${n.tone === 'success' ? 'bg-emerald-light' : n.tone === 'danger' ? 'bg-rose-light' : 'bg-indigo-light'}`}>
                        <Icon size={16} className={n.tone === 'success' ? 'text-emerald' : n.tone === 'danger' ? 'text-rose' : 'text-indigo'} />
                      </div>
                      <div className="notif-content">
                        <p className="notif-text">{n.title}</p>
                        <span className="notif-time">{n.detail}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="header-dropdown-wrap" ref={profileRef}>
          <button
            type="button"
            className="user-profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="user-avatar-gradient">
              {userInitial}
            </div>
            <div className="user-info-text">
              <span className="user-full-name">{userName || 'Account'}</span>
              <span className="user-role-label">{roleConfig.label}</span>
            </div>
            <ChevronDown size={14} className="user-chevron" />
          </button>

          {showProfileMenu && (
            <div className="header-popover profile-popover">
              <div className="profile-popover-header">
                <div className="user-avatar-large">
                  {userInitial}
                </div>
                <div className="profile-details">
                  <div className="profile-name">{userName || 'User'}</div>
                  <div className="profile-email">{userEmail || 'user@example.com'}</div>
                  <span className={`role-pill mt-1 ${roleConfig.badgeClass}`}>
                    {roleConfig.label}
                  </span>
                </div>
              </div>

              <div className="popover-divider" />

              <div className="profile-menu-actions">
                <button
                  type="button"
                  className="popover-action-item"
                  onClick={() => {
                    setShowProfileMenu(false)
                    if (onOpenProfile) onOpenProfile()
                  }}
                >
                  <User size={16} />
                  <span>Profile & account settings</span>
                </button>
                <button
                  type="button"
                  className="popover-action-item text-danger"
                  onClick={() => {
                    setShowProfileMenu(false)
                    onLogout()
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
