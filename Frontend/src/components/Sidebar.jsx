import {
  LayoutDashboard,
  PlusCircle,
  Clock,
  Calendar,
  Megaphone,
  Share2,
  BarChart3,
  Bell,
  CheckSquare,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Globe,
  MessageCircle,
  LogOut,
  Compass,
} from 'lucide-react'
import { ROLES, ROLE_CONFIG } from '../config/roles'

const ICON_MAP = {
  LayoutDashboard,
  PlusCircle,
  Clock,
  Calendar,
  Megaphone,
  Share2,
  BarChart3,
  Bell,
  CheckSquare,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Globe,
  MessageCircle,
}

export const Sidebar = ({
  isTeam = false,
  activePage,
  onNavigate,
  currentRole,
  onLogout,
  onOpenCreateCampaign,
  canCreateCampaign,
  isMobileOpen,
  onCloseMobile,
}) => {
  const roleConfig = ROLE_CONFIG[currentRole] || ROLE_CONFIG[ROLES.CONTENT_CREATOR]

  const handleNavClick = (item) => {
    onNavigate(item)
    if (onCloseMobile) onCloseMobile()
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`app-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="brand-logo-wrap">
            <div className="brand-icon">
              <Compass size={22} className="brand-compass" />
            </div>
            <div className="brand-text">
              <span className="brand-name">SocialPilot</span>
              <span className="brand-tagline">SaaS Platform</span>
            </div>
          </div>
        </div>

        {/* Authenticated user's role (read-only) */}
        <div className="role-switcher-card">
          <div className="role-switcher-header">
            <span className="role-switcher-label">Workspace Role</span>
            <span className={`role-pill ${roleConfig.badgeClass}`}>
              {roleConfig.label}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation list */}
        <nav className="sidebar-navigation">
          <div className="nav-section-title">Navigation</div>
          <ul className="nav-menu">
            {roleConfig.nav.filter(item => !isTeam || !['adminUsers', 'rolesMatrix'].includes(item.page)).map((item) => {
              const IconComp = ICON_MAP[item.icon] || LayoutDashboard
              const isActive = activePage === item.id

              return (
                <li key={item.id} className="nav-menu-item">
                  <button
                    type="button"
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item)}
                  >
                    <span className="nav-icon">
                      <IconComp size={18} />
                    </span>
                    <span className="nav-label">{item.label}</span>
                    {item.page === 'placeholder' && (
                      <span className="nav-badge-pill">Milestone</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Quick Action Button */}
        {canCreateCampaign && (
          <div className="sidebar-action-box">
            <button
              type="button"
              className="btn-create-post-sidebar"
              onClick={() => {
                if (onOpenCreateCampaign) onOpenCreateCampaign()
                if (onCloseMobile) onCloseMobile()
              }}
            >
              <PlusCircle size={17} />
              <span>New Post</span>
            </button>
          </div>
        )}

        {/* Sidebar Footer with Logout */}
        <div className="sidebar-footer">
          <button type="button" className="btn-logout" onClick={onLogout}>
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
