import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./WorkspaceLayout.css";

const navigation = [
  { label: "Dashboard", path: "/dashboard", key: "dashboard", icon: "⌂" },
  { label: "Analytics", path: "/analytics", key: "analytics", icon: "▥" },
  { label: "Campaigns", path: "/campaigns", key: "campaigns", icon: "◎" },
  { label: "Posts", path: "/posts", key: "posts", icon: "▤" },
  { label: "Publishing Queue", path: "/publishing-queue", key: "publishing-queue", icon: "↻" },
  { label: "Social Accounts", path: "/social-accounts", key: "accounts", icon: "◉" },
  { label: "Reports", path: "/reports", key: "reports", icon: "↗" },
  { label: "Notifications", path: "/notifications", key: "notifications", icon: "♧" },
  { label: "Settings", path: "/settings", key: "settings", icon: "⚙" },
];

const titles = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  campaigns: "Campaigns",
  posts: "Posts",
  "publishing-queue": "Publishing Queue",
  accounts: "Social Accounts",
  reports: "Reports",
  notifications: "Notifications",
  settings: "Settings",
};

function WorkspaceLayout({ active, children, admin = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("socialpilot-theme") || "light");
  const links = admin && localStorage.getItem("role") === "ADMIN"
    ? [...navigation, { label: "Admin", path: "/admin-dashboard", key: "admin", icon: "⌘" }, { label: "Users", path: "/admin-users", key: "admin-users", icon: "♙" }]
    : navigation;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("socialpilot-theme", theme);
    window.dispatchEvent(new CustomEvent("socialpilot-theme-change", { detail: theme }));
  }, [theme]);

  useEffect(() => {
    const syncTheme = (event) => setTheme(event.detail);
    window.addEventListener("socialpilot-theme-change", syncTheme);
    return () => window.removeEventListener("socialpilot-theme-change", syncTheme);
  }, []);

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

  const pageTitle = titles[active] || (active === "admin" ? "Admin dashboard" : active === "admin-users" ? "User management" : "SocialPilot");

  return <div className="workspace-shell">
    {menuOpen && <button className="workspace-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
    <aside className={`workspace-sidebar${menuOpen ? " is-open" : ""}`}>
      <button className="workspace-brand" onClick={() => navigate("/dashboard")} aria-label="SocialPilot dashboard">
        <span className="brand-mark">S</span><span>SocialPilot</span>
      </button>
      <p className="sidebar-caption">WORKSPACE</p>
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
        <button className="profile-summary" onClick={() => navigate("/settings")}>
          <span className="profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "U"}</span>
          <span className="profile-copy"><strong>{user?.name || "Your account"}</strong><small>{user?.email || "Account settings"}</small></span>
        </button>
        <button className="workspace-logout" onClick={logout}><span aria-hidden="true">↪</span> Log out</button>
      </div>
    </aside>
    <div className="workspace-content">
      <header className="workspace-topbar">
        <button className="mobile-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>☰</button>
        <div className="topbar-title"><span>SocialPilot workspace</span><h1>{pageTitle}</h1></div>
        <div className="topbar-actions">
          <NavLink className="topbar-icon-button" to="/notifications" aria-label="Notifications" title="Notifications">♧</NavLink>
          <button className="topbar-theme-button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀" : "☾"}</button>
          <button className="topbar-user" onClick={() => navigate("/settings")} aria-label="Open account settings"><span className="profile-avatar">{user?.name?.slice(0, 1)?.toUpperCase() || "U"}</span><span>{user?.name || "Account"}</span></button>
        </div>
      </header>
      <div className="workspace-page-content">{children}</div>
    </div>
  </div>;
}

export default WorkspaceLayout;