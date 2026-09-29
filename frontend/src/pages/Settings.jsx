import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/UI";
import "./Settings.css";

const DEFAULT_PREFERENCES = { email: true, campaigns: true, posts: true };

function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("socialpilot-theme") || "light");
  const [preferences, setPreferences] = useState(() => {
    try {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(localStorage.getItem("socialpilot-notification-preferences") || "{}") };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    fetch("http://127.0.0.1:8000/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => {
        if (response.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login", { replace: true });
          return null;
        }
        return response.ok ? response.json() : null;
      })
      .then(setUser)
      .catch(() => setUser(null));
  }, [navigate]);

  useEffect(() => {
    const syncTheme = (event) => setTheme(event.detail);
    window.addEventListener("socialpilot-theme-change", syncTheme);
    return () => window.removeEventListener("socialpilot-theme-change", syncTheme);
  }, []);

  function changeTheme(nextTheme) {
    localStorage.setItem("socialpilot-theme", nextTheme);
    window.dispatchEvent(new CustomEvent("socialpilot-theme-change", { detail: nextTheme }));
  }

  function updatePreference(event) {
    const nextPreferences = { ...preferences, [event.target.name]: event.target.checked };
    setPreferences(nextPreferences);
    localStorage.setItem("socialpilot-notification-preferences", JSON.stringify(nextPreferences));
  }

  return <div className="workspace-page settings-page">
    <PageHeader eyebrow="PREFERENCES" title="Settings" description="Manage your account and workspace preferences." />
    <div className="settings-grid">
      <section className="settings-section"><div><p className="eyebrow">PROFILE</p><h2>Account details</h2></div>
        <dl className="settings-details"><div><dt>Name</dt><dd>{user?.name || "Loading"}</dd></div><div><dt>Email</dt><dd>{user?.email || "Loading"}</dd></div><div><dt>Role</dt><dd>{user?.role || "Loading"}</dd></div></dl>
        <p className="settings-note">Profile editing is not available through the current account API.</p>
      </section>
      <section className="settings-section"><div><p className="eyebrow">APPEARANCE</p><h2>Color theme</h2></div>
        <div className="theme-options" role="group" aria-label="Color theme"><button className={theme === "light" ? "selected" : ""} onClick={() => changeTheme("light")}>Light</button><button className={theme === "dark" ? "selected" : ""} onClick={() => changeTheme("dark")}>Dark</button></div>
      </section>
      <section className="settings-section"><div><p className="eyebrow">NOTIFICATIONS</p><h2>Notification preferences</h2></div>
        <label className="settings-toggle"><span><strong>Email notifications</strong><small>Preference saved on this device</small></span><input type="checkbox" name="email" checked={preferences.email} onChange={updatePreference} /></label>
        <label className="settings-toggle"><span><strong>Campaign notifications</strong><small>Campaign activity updates</small></span><input type="checkbox" name="campaigns" checked={preferences.campaigns} onChange={updatePreference} /></label>
        <label className="settings-toggle"><span><strong>Post notifications</strong><small>Scheduling and publishing updates</small></span><input type="checkbox" name="posts" checked={preferences.posts} onChange={updatePreference} /></label>
      </section>
      <section className="settings-section"><div><p className="eyebrow">CONNECTED CHANNELS</p><h2>Social accounts</h2></div><p className="settings-note">Manage platform connections and permissions.</p><button className="settings-link-button" onClick={() => navigate("/social-accounts")}>Manage connected accounts →</button></section>
      <section className="settings-section"><div><p className="eyebrow">SECURITY</p><h2>Sign-in and security</h2></div><p className="settings-note">Password changes use the existing account authentication flow.</p><button className="settings-link-button" onClick={() => { localStorage.removeItem("access_token"); localStorage.removeItem("role"); navigate("/login", { replace: true }); }}>Log out of SocialPilot</button></section>
    </div>
  </div>;
}

export default Settings;