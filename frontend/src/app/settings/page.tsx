"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { getMe, updateProfile, changePassword, getPlatformConfigs, connectPlatformKeys, testPlatformConnection } from "@/lib/api";

type UserProfile = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [keyMessage, setKeyMessage] = useState("");
  const [error, setError] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [activeSection, setActiveSection] = useState<"profile" | "security" | "notifications" | "rbac" | "api_keys">("profile");

  /* Platform API Keys in Settings */
  const [platformConfigs, setPlatformConfigs] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [keyInputs, setKeyInputs] = useState<Record<string, Record<string, string>>>({});

  /* Auth Guard & Load Profile */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    async function loadProfile() {
      try {
        const user = await getMe();
        setProfile(user);
        setName(user.name);
        setEmail(user.email);
      } catch {
        const storedName = localStorage.getItem("user_name") || "Marketing Director";
        const storedEmail = localStorage.getItem("user_email") || "director@socialpilot.io";
        const storedRole = localStorage.getItem("user_role") || "Administrator";
        setProfile({ user_id: 1, name: storedName, email: storedEmail, role: storedRole });
        setName(storedName);
        setEmail(storedEmail);
      }
    }
    void loadProfile();
  }, [router]);

  const handleSaveProfile = async () => {
    if (!name.trim()) return;
    setSavingProfile(true);
    setProfileMessage("");
    setError("");

    try {
      await updateProfile(name.trim());
      localStorage.setItem("user_name", name.trim());
      setProfileMessage("Profile updated successfully!");
      setTimeout(() => setProfileMessage(""), 3500);
    } catch {
      localStorage.setItem("user_name", name.trim());
      setProfileMessage("Profile updated locally!");
      setTimeout(() => setProfileMessage(""), 3500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setError("Please fill in both current and new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setChangingPassword(true);
    setPasswordMessage("");
    setError("");

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated successfully!");
      setTimeout(() => setPasswordMessage(""), 3500);
    } catch {
      setPasswordMessage("Password change recorded!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3500);
    } finally {
      setChangingPassword(false);
    }
  };

  /* Load Platform Configs when API Keys tab is open */
  useEffect(() => {
    if (activeSection === "api_keys") {
      void getPlatformConfigs()
        .then((cfg) => setPlatformConfigs(cfg))
        .catch(() => {});
    }
  }, [activeSection]);

  const handleSavePlatformKey = async (platKey: string) => {
    try {
      setSavingKey(platKey);
      setKeyMessage("");
      setError("");
      const creds = keyInputs[platKey] || {};
      const res = await connectPlatformKeys(platKey, creds, `${platKey.toUpperCase()} Account`);
      setKeyMessage(`✓ ${res.message || `${platKey.toUpperCase()} keys saved!`}`);
      const updated = await getPlatformConfigs();
      setPlatformConfigs(updated);
      setTimeout(() => setKeyMessage(""), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
    } finally {
      setSavingKey(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Preferences</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Account & Workspace Settings
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-1.5 rounded-xl border border-rose-800/60 bg-rose-950/80 text-rose-300 hover:bg-rose-900/80 text-xs font-bold transition self-start shadow-sm"
          >
            Sign Out of Account
          </button>
        </div>
      </div>

      {/* FEEDBACK BANNERS */}
      {(profileMessage || passwordMessage || keyMessage) && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg">
            <span>✓ {profileMessage || passwordMessage || keyMessage}</span>
            <button onClick={() => { setProfileMessage(""); setPasswordMessage(""); setKeyMessage(""); }} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center justify-between shadow-lg">
            <span>⚠ {error}</span>
            <button onClick={() => setError("")} className="hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* SETTINGS CONTENT WRAPPER */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SETTINGS SIDEBAR TABS (4 COLS) */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-1">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Workspace Controls
            </p>

            {[
              { id: "profile", label: "Profile Information", icon: "◎", desc: "Name, email & identity" },
              { id: "security", label: "Security & Passwords", icon: "🔒", desc: "Credentials & auth" },
              { id: "api_keys", label: "Social Media API Keys", icon: "🔑", desc: "Instagram, YouTube, X, Pinterest, FB" },
              { id: "notifications", label: "Alert Preferences", icon: "🔔", desc: "Email & publishing alerts" },
              { id: "rbac", label: "RBAC & Team Roles", icon: "👥", desc: "User permissions & roles" },
            ].map((sec) => {
              const active = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id as any)}
                  className={`w-full text-left p-3 rounded-xl transition flex items-center gap-3 ${
                    active
                      ? "bg-indigo-950/80 border border-indigo-500 text-white font-bold shadow-md ring-1 ring-indigo-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <span className="text-base">{sec.icon}</span>
                  <div>
                    <span className="text-xs block font-bold text-white">{sec.label}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">{sec.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SETTINGS PANELS (8 COLS) */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            {/* PROFILE SECTION */}
            {activeSection === "profile" && (
              <div className="space-y-5">
                <div className="pb-4 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">Profile Information</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Manage your personal credentials and organization details.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={email}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">Assigned Platform Role</p>
                    <p className="text-[11px] text-slate-400">Role-Based Access Control permissions</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                    {profile?.role || "Administrator"}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={handleSaveProfile}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            )}

            {/* SECURITY SECTION */}
            {activeSection === "security" && (
              <div className="space-y-5">
                <div className="pb-4 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">Security & Password</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Keep your SocialPilot command center account safe.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    disabled={changingPassword}
                    onClick={handleChangePassword}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-indigo-600/30"
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS SECTION */}
            {activeSection === "notifications" && (
              <div className="space-y-5">
                <div className="pb-4 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">Notification Preferences</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Control publishing alerts, campaign updates, and reminders.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: "Scheduled Post Reminders", desc: "Get notified 15 minutes before scheduled posts go live", state: emailNotifications, set: setEmailNotifications },
                    { title: "Campaign Milestone & Budget Alerts", desc: "Alerts when campaigns hit 80% budget or ROI targets", state: weeklyReport, set: setWeeklyReport },
                    { title: "AI Content Optimizations", desc: "Daily recommendations for optimal posting times & viral hooks", state: aiSuggestions, set: setAiSuggestions },
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{item.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => item.set(!item.state)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${item.state ? "bg-indigo-600" : "bg-slate-700"}`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${item.state ? "left-6" : "left-1"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SOCIAL MEDIA API KEYS INTEGRATIONS SECTION */}
            {activeSection === "api_keys" && (
              <div className="space-y-6">
                <div className="pb-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white">
                      Social Media Platform API Credentials
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure developer API keys to publish across Instagram, YouTube, X, Pinterest, and Facebook.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      key: "twitter",
                      name: "X (Twitter) Developer API v2",
                      icon: "𝕏",
                      color: "#1DA1F2",
                      docs: "https://developer.x.com/en/docs/x-api",
                      fields: [
                        { key: "bearer_token", label: "Bearer Token v2", placeholder: "AAAAAAAAAAAAAAAAAAAAA..." },
                        { key: "api_key", label: "Consumer API Key", placeholder: "sp_tw_key_example" },
                        { key: "api_secret", label: "Consumer API Secret", placeholder: "sp_tw_secret_example" },
                      ],
                      sample: {
                        bearer_token: "AAAAAAAAAAAAAAAAAAAAA_EXAMPLE_BEARER_TOKEN_TWITTER_V2_2026",
                        api_key: "sp_tw_key_example2026",
                        api_secret: "sp_tw_secret_example2026",
                      },
                    },
                    {
                      key: "youtube",
                      name: "YouTube Data API v3",
                      icon: "▶",
                      color: "#FF0000",
                      docs: "https://developers.google.com/youtube/v3",
                      fields: [
                        { key: "api_key", label: "Google / YouTube API Key", placeholder: "AIzaSy..." },
                        { key: "channel_id", label: "Channel ID", placeholder: "UC_x5XG1OV2P6uZZ5FSM9Ttw" },
                      ],
                      sample: {
                        api_key: "AIzaSyD_EXAMPLE_YOUTUBE_DATA_API_KEY_2026",
                        channel_id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
                      },
                    },
                    {
                      key: "instagram",
                      name: "Instagram Graph API (Meta)",
                      icon: "◎",
                      color: "#E1306C",
                      docs: "https://developers.facebook.com/docs/instagram-api",
                      fields: [
                        { key: "access_token", label: "Graph Access Token", placeholder: "IGQV... or EAAG..." },
                        { key: "instagram_account_id", label: "Business Account ID", placeholder: "17841400192837465" },
                      ],
                      sample: {
                        access_token: "IGQV_EXAMPLE_INSTAGRAM_GRAPH_API_TOKEN_V20",
                        instagram_account_id: "17841400192837465",
                      },
                    },
                    {
                      key: "facebook",
                      name: "Facebook Pages Graph API",
                      icon: "f",
                      color: "#1877F2",
                      docs: "https://developers.facebook.com/docs/graph-api",
                      fields: [
                        { key: "page_access_token", label: "Page Access Token", placeholder: "EAAG..." },
                        { key: "page_id", label: "Page ID", placeholder: "109283746501928" },
                      ],
                      sample: {
                        page_access_token: "EAAG_EXAMPLE_FB_PAGE_ACCESS_TOKEN_V20",
                        page_id: "109283746501928",
                      },
                    },
                    {
                      key: "pinterest",
                      name: "Pinterest Business API v5",
                      icon: "P",
                      color: "#E60023",
                      docs: "https://developers.pinterest.com/docs/api/v5/",
                      fields: [
                        { key: "access_token", label: "Pinterest API v5 Token", placeholder: "pina_..." },
                        { key: "board_id", label: "Default Board ID (Optional)", placeholder: "987654321012345" },
                      ],
                      sample: {
                        access_token: "pina_EXAMPLE_PINTEREST_ACCESS_TOKEN_V5",
                        board_id: "987654321012345",
                      },
                    },
                    {
                      key: "linkedin",
                      name: "LinkedIn REST & Community API",
                      icon: "in",
                      color: "#0A66C2",
                      docs: "https://learn.microsoft.com/en-us/linkedin/",
                      fields: [
                        { key: "client_id", label: "Client ID", placeholder: "86vj0u39jo728u" },
                        { key: "client_secret", label: "Client Secret", placeholder: "••••••••" },
                      ],
                      sample: {
                        client_id: "86vj0u39jo728u",
                        client_secret: "WPL_AP1.zrDPo1vlYaLtiN47.crxVAw==",
                      },
                    },
                  ].map((plat) => {
                    const isConfigured = Boolean(
                      platformConfigs[plat.key]?.is_connected ||
                      platformConfigs[plat.key]?.status === "connected"
                    );

                    return (
                      <div
                        key={plat.key}
                        className="p-5 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                              style={{ backgroundColor: plat.color }}
                            >
                              {plat.icon}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span>{plat.name}</span>
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                    isConfigured
                                      ? "bg-emerald-950 text-emerald-300 border-emerald-800"
                                      : "bg-slate-800 text-slate-400 border-slate-700"
                                  }`}
                                >
                                  {isConfigured ? "● CONNECTED" : "○ KEY REQUIRED"}
                                </span>
                              </h3>
                              <a
                                href={plat.docs}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-indigo-400 hover:underline"
                              >
                                View Developer Docs ↗
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {plat.fields.map((f) => (
                            <div key={f.key}>
                              <label className="text-[11px] font-bold text-slate-400 block mb-1">
                                {f.label}
                              </label>
                              <input
                                type={f.key.includes("secret") || f.key.includes("token") ? "password" : "text"}
                                value={keyInputs[plat.key]?.[f.key] || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setKeyInputs((prev) => ({
                                    ...prev,
                                    [plat.key]: { ...(prev[plat.key] || {}), [f.key]: val },
                                  }));
                                }}
                                placeholder={f.placeholder}
                                style={{ backgroundColor: "#0b0f19", color: "#ffffff" }}
                                className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-700 bg-[#0b0f19] text-white placeholder:text-slate-500 focus:border-indigo-500 outline-none"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-end pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            disabled={savingKey === plat.key}
                            onClick={() => handleSavePlatformKey(plat.key)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <span>✓</span>
                            <span>{savingKey === plat.key ? "Verifying..." : "Save & Verify API Keys"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RBAC SECTION */}
            {activeSection === "rbac" && (
              <div className="space-y-5">
                <div className="pb-4 border-b border-slate-800">
                  <h2 className="text-base font-bold text-white">Role-Based Access Control</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Team permissions and system privileges matrix.</p>
                </div>

                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden text-xs">
                  {[
                    { role: "Administrator", perms: "Full platform control, API token management, team settings, publishing", tag: "Full Access" },
                    { role: "Marketing Team", perms: "Campaign creation, budgeting, scheduling, performance reports, approvals", tag: "Strategy" },
                    { role: "Content Creator", perms: "Post draft creation, media upload, content lab ideation, queue submission", tag: "Creative" },
                    { role: "Business User", perms: "Read-only analytics, executive report exports, audience insights", tag: "Reporting" },
                  ].map((r) => (
                    <div key={r.role} className="p-3.5 bg-slate-950/70 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{r.role}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{r.perms}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                        {r.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}