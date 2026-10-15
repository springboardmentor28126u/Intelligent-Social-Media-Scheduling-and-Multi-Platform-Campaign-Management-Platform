import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import "./WorkspaceLayout.css";

const navigation = [
  { label: "Dashboard", path: "/dashboard", key: "dashboard", icon: "⌂" },
  { label: "Analytics", path: "/analytics", key: "analytics", icon: "▥" },
  { label: "Campaigns", path: "/campaigns", key: "campaigns", icon: "◎" },
  { label: "Posts", path: "/posts", key: "posts", icon: "▤" },
  { label: "Content Calendar", path: "/calendar", key: "calendar", icon: "▦" },
  { label: "Publishing Queue", path: "/publishing-queue", key: "publishing-queue", icon: "↻" },
  { label: "Social Accounts", path: "/social-accounts", key: "accounts", icon: "◉" },
  { label: "Reports", path: "/reports", key: "reports", icon: "↗" },
  { label: "Notifications", path: "/notifications", key: "notifications", icon: "♧" },
  { label: "Settings", path: "/settings", key: "settings", icon: "⚙" },
];

const adminNavigation = [
  { label: "Dashboard", path: "/admin", key: "admin", icon: "⌂" },
  { label: "Users", path: "/admin/users", key: "admin-users", icon: "♙" },
  { label: "Campaigns", path: "/admin/campaigns", key: "admin-campaigns", icon: "◎" },
  { label: "Posts", path: "/admin/posts", key: "admin-posts", icon: "▤" },
  { label: "Publishing Queue", path: "/admin/publishing-queue", key: "admin-publishing-queue", icon: "↻" },
  { label: "Publishing Logs", path: "/admin/publishing-logs", key: "admin-publishing-logs", icon: "≡" },
  { label: "Social Accounts", path: "/admin/social-accounts", key: "admin-social-accounts", icon: "◉" },
  { label: "Analytics", path: "/admin/analytics", key: "admin-analytics", icon: "▥" },
  { label: "Reports", path: "/admin/reports", key: "admin-reports", icon: "↗" },
  { label: "Notifications", path: "/admin/notifications", key: "admin-notifications", icon: "♧" },
  { label: "Settings", path: "/admin/settings", key: "admin-settings", icon: "⚙" },
];

const titles = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  campaigns: "Campaigns",
  posts: "Posts",
  calendar: "Content Calendar",
  "publishing-queue": "Publishing Queue",
  accounts: "Social Accounts",
  reports: "Reports",
  notifications: "Notifications",
  settings: "Settings",
  "admin-users": "User management",
  "admin-campaigns": "Campaigns",
  "admin-posts": "Posts",
  "admin-publishing-queue": "Publishing queue",
  "admin-publishing-logs": "Publishing logs",
  "admin-social-accounts": "Social accounts",
  "admin-analytics": "Global analytics",
  "admin-reports": "Admin reports",
  "admin-notifications": "Notifications",
  "admin-settings": "System status",
};

function WorkspaceLayout({ active, children, admin = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminSearch, setAdminSearch] = useState("");
  const { theme, setTheme } = useTheme();
  const links = admin && localStorage.getItem("role") === "ADMIN" ? adminNavigation : navigation;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("http://127.0.0.1:8000/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then(setUser)
      .catch(() => setUser(null));
  }, [location.pathname]);

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
  }

  const pageTitle = titles[active] || (active === "admin" ? "Platform overview" : "SocialPilot");

  return <div className={`workspace-shell${admin ? " is-admin-workspace" : ""}`}>
    {menuOpen && <button className="workspace-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`workspace-sidebar${menuOpen ? " is-open" : ""}`}>
      <button className="workspace-brand" onClick={() => navigate(admin ? "/admin" : "/dashboard")} aria-label={admin ? "SocialPilot admin dashboard" : "SocialPilot dashboard"}>
        <span className="brand-mark">S</span><span>SocialPilot</span>
      </button>
      <p className="sidebar-caption">{admin ? "ADMINISTRATION" : "WORKSPACE"}</p>
      <nav className="workspace-nav" aria-label="Main navigation">
        {links.map((item) => <NavLink
          key={item.key}
          to={item.path}
          className={`workspace-nav-link${active === item.key ? " is-active" : ""}`}
          aria-current={active === item.key ? "page" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
        </NavLink>)}
      </nav>
      <div className="workspace-profile">
        <button className="profile-summary" onClick={() => { setMenuOpen(false); navigate(admin ? "/admin/settings" : "/settings"); }}>
          <span className="profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "U"}</span>
          <span className="profile-copy"><strong>{user?.name || "Your account"}</strong><small>{admin ? "Administrator" : user?.email || "Account settings"}</small></span>
        </button>
        <button className="workspace-logout" onClick={logout}><span aria-hidden="true">↪</span> Log out</button>
      </div>
    </aside>
    <div className="workspace-content">
      <header className="workspace-topbar">
        <button className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>☰</button>
        <div className="topbar-title"><span>{admin ? "SocialPilot admin" : "SocialPilot workspace"}</span><h1>{pageTitle}</h1></div>
        <div className="topbar-actions">
          {admin && <form className="topbar-search" onSubmit={(event) => { event.preventDefault(); navigate(`/admin/users?search=${encodeURIComponent(adminSearch)}`); }}><span aria-hidden="true">⌕</span><input value={adminSearch} onChange={(event) => setAdminSearch(event.target.value)} aria-label="Search admin records" placeholder="Search users..." /></form>}
          <NavLink className="topbar-icon-button" to={admin ? "/admin/notifications" : "/notifications"} aria-label="Notifications" title="Notifications">♧</NavLink>
          <button className="topbar-theme-button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀" : "☾"}</button>
          {admin ? <div className="topbar-profile-wrap"><button className="topbar-user" onClick={() => setProfileOpen((open) => !open)} aria-label="Open admin profile menu" aria-expanded={profileOpen}><span className="profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "A"}</span><span className="topbar-user-copy"><strong>{user?.name || "Admin"}</strong><small>Administrator</small></span><span aria-hidden="true">⌄</span></button>{profileOpen && <div className="topbar-profile-menu"><strong>{user?.name || "Administrator"}</strong><span>{user?.email || "Admin account"}</span><NavLink to="/admin/settings" onClick={() => setProfileOpen(false)}>System status</NavLink><button type="button" onClick={logout}>Log out</button></div>}</div> : <button className="topbar-user" onClick={() => navigate("/settings")} aria-label="Open account settings"><span className="profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "U"}</span><span>{user?.name || "Account"}</span></button>}
        </div>
      </header>
      <div className="workspace-page-content">{children}</div>
    </div>
  </div>;
}

export default WorkspaceLayout;