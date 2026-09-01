"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getMe,
  updateProfile,
  changePassword,
} from "@/lib/api";

type UserProfile = {
  user_id: number;
  name: string;
  email: string;
  role: string;
};

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [error, setError] = useState("");

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [aiSuggestions, setAiSuggestions] =
    useState(true);

  const [weeklyReport, setWeeklyReport] =
    useState(true);

  const [activeSection, setActiveSection] =
    useState("profile");

  /* =====================================================
     LOAD PROFILE
  ===================================================== */

  useEffect(() => {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      router.push("/login");
      return;
    }

    async function loadProfile() {
      try {
        const data = await getMe();

        setProfile(data);
        setName(data.name || "");
        setEmail(data.email || "");
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load profile"
        );
      }
    }

    loadProfile();
  }, [router]);

  /* =====================================================
     SAVE PROFILE
  ===================================================== */

  async function handleProfileSave(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSavingProfile(true);
    setProfileMessage("");
    setError("");

    try {
      const updated =
        await updateProfile(name.trim());

      setProfile(updated);

      localStorage.setItem(
        "user_name",
        name.trim()
      );

      setProfileMessage(
        "Profile updated successfully."
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update profile"
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /* =====================================================
     CHANGE PASSWORD
  ===================================================== */

  async function handlePasswordChange(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setPasswordMessage("");
    setError("");

    if (newPassword.length < 6) {
      setError(
        "New password must contain at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New passwords do not match."
      );
      return;
    }

    setChangingPassword(true);

    try {
      await changePassword(
        currentPassword,
        newPassword
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage(
        "Password changed successfully."
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to change password"
      );
    } finally {
      setChangingPassword(false);
    }
  }

  /* =====================================================
     LOGOUT
  ===================================================== */

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");

    router.push("/");
  }

  /* =====================================================
     SETTINGS SECTIONS
  ===================================================== */

  const sections = [
    {
      id: "profile",
      icon: "◎",
      title: "Profile",
      description: "Personal information",
    },
    {
      id: "security",
      icon: "◇",
      title: "Security",
      description: "Password & access",
    },
    {
      id: "notifications",
      icon: "◌",
      title: "Notifications",
      description: "Control your alerts",
    },
    {
      id: "appearance",
      icon: "◐",
      title: "Appearance",
      description: "Workspace experience",
    },
    {
      id: "platforms",
      icon: "◈",
      title: "Platforms",
      description: "Social connections",
    },
  ];

  return (
    <main
      className="min-h-screen"
      style={{
        background: "#F7F9FC",
        color: "#172033",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >

      {/* =================================================
          TOP BAR
      ================================================= */}

      <header
        className="border-b bg-white"
        style={{
          borderColor: "#E7EAF0",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">

          {/* BRAND */}

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="flex items-center gap-3"
          >

            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                color: "#071018",
              }}
            >
              S
            </div>

            <div className="text-left">

              <p
                className="font-semibold"
                style={{
                  fontFamily:
                    "var(--font-fraunces), serif",
                  color: "#172033",
                }}
              >
                SocialPilot
              </p>

              <p
                className="text-[9px] uppercase tracking-[0.2em]"
                style={{
                  color: "#8A91A3",
                }}
              >
                Workspace settings
              </p>

            </div>

          </button>

          {/* DASHBOARD */}

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="rounded-xl px-4 py-2 text-xs transition hover:bg-slate-50"
            style={{
              color: "#657086",
              border:
                "1px solid #E1E5EC",
              background: "#FFFFFF",
            }}
          >
            ← Dashboard
          </button>

        </div>
      </header>

      {/* =================================================
          PAGE
      ================================================= */}

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">

        {/* PAGE HEADER */}

        <div className="mb-10">

          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{
              color: "#008FA8",
            }}
          >
            Control room
          </p>

          <h1
            className="mt-2 text-3xl md:text-4xl"
            style={{
              fontFamily:
                "var(--font-fraunces), serif",
              fontWeight: 600,
              color: "#172033",
            }}
          >
            Settings
          </h1>

          <p
            className="mt-2 max-w-xl text-sm"
            style={{
              color: "#737C8F",
            }}
          >
            Shape how SocialPilot works for you.
            Manage your identity, security and
            workspace experience.
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div
            className="mb-6 rounded-xl p-4 text-sm"
            style={{
              background: "#FFF1F4",
              border:
                "1px solid #FFD2DC",
              color: "#D64564",
            }}
          >
            {error}
          </div>
        )}

        {/* =================================================
            SETTINGS GRID
        ================================================= */}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* =================================================
              SETTINGS NAV
          ================================================= */}

          <aside
            className="h-fit rounded-2xl bg-white p-3"
            style={{
              border:
                "1px solid #E7EAF0",
              boxShadow:
                "0 8px 30px rgba(23,32,51,0.04)",
            }}
          >

            <p
              className="px-3 pb-3 pt-2 text-[9px] uppercase tracking-[0.2em]"
              style={{
                color: "#9AA1B0",
              }}
            >
              Preferences
            </p>

            <div className="space-y-1">

              {sections.map((section) => {

                const active =
                  activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() =>
                      setActiveSection(
                        section.id
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all"
                    style={{
                      background: active
                        ? "#ECFBFE"
                        : "transparent",

                      color: active
                        ? "#008FA8"
                        : "#697386",
                    }}
                  >

                    <span className="text-lg">
                      {section.icon}
                    </span>

                    <span>

                      <span
                        className="block text-xs font-medium"
                        style={{
                          color: active
                            ? "#008FA8"
                            : "#3C4659",
                        }}
                      >
                        {section.title}
                      </span>

                      <span
                        className="mt-0.5 block text-[9px]"
                        style={{
                          color: active
                            ? "#5E9EAA"
                            : "#9AA1B0",
                        }}
                      >
                        {section.description}
                      </span>

                    </span>

                  </button>
                );
              })}

            </div>

            <div
              className="my-4 h-px"
              style={{
                background:
                  "#ECEEF3",
              }}
            />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition hover:bg-red-50"
              style={{
                color: "#737C8F",
              }}
            >
              <span>↪</span>
              Sign out
            </button>

          </aside>

          {/* =================================================
              CONTENT
          ================================================= */}

          <section>

            {/* =================================================
                PROFILE
            ================================================= */}

            {activeSection === "profile" && (

              <div
                className="rounded-2xl bg-white p-6 md:p-8"
                style={{
                  border:
                    "1px solid #E7EAF0",
                  boxShadow:
                    "0 8px 30px rgba(23,32,51,0.04)",
                }}
              >

                <div className="mb-8">

                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: "#9AA1B0",
                    }}
                  >
                    Identity
                  </p>

                  <h2
                    className="mt-2 text-xl"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), serif",
                      color: "#172033",
                    }}
                  >
                    Your profile
                  </h2>

                </div>

                {/* PROFILE PREVIEW */}

                <div className="mb-8 flex items-center gap-4">

                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold"
                    style={{
                      background:
                        "linear-gradient(135deg,#E7FBFF,#F0E9FF)",
                      border:
                        "1px solid #D9E3F0",
                      color: "#7650C7",
                    }}
                  >
                    {name
                      ? name
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </div>

                  <div>

                    <p
                      className="font-medium"
                      style={{
                        color: "#172033",
                      }}
                    >
                      {name || "Your name"}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: "#7B8496",
                      }}
                    >
                      {profile?.role ||
                        "Creator"}
                    </p>

                  </div>

                </div>

                <form
                  onSubmit={handleProfileSave}
                  className="space-y-5"
                >

                  {/* NAME */}

                  <div>

                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#657086",
                      }}
                    >
                      Display name
                    </label>

                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition focus:ring-2"
                      style={{
                        background: "#FBFCFE",
                        border:
                          "1px solid #DDE2EA",
                        color: "#172033",
                      }}
                    />

                  </div>

                  {/* EMAIL */}

                  <div>

                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#657086",
                      }}
                    >
                      Email address
                    </label>

                    <input
                      value={email}
                      disabled
                      className="w-full rounded-xl px-4 py-3 text-sm opacity-70"
                      style={{
                        background: "#F1F3F6",
                        border:
                          "1px solid #E0E4EA",
                        color: "#596477",
                      }}
                    />

                    <p
                      className="mt-2 text-[10px]"
                      style={{
                        color: "#9AA1B0",
                      }}
                    >
                      Email changes are currently
                      managed by your account system.
                    </p>

                  </div>

                  {/* SAVE */}

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl px-5 py-3 text-xs font-semibold transition hover:opacity-90 disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg,#00CFEA,#8D55E8)",
                      color: "#FFFFFF",
                    }}
                  >
                    {savingProfile
                      ? "Saving..."
                      : "Save changes"}
                  </button>

                  {profileMessage && (
                    <p
                      className="text-xs"
                      style={{
                        color: "#159765",
                      }}
                    >
                      ✓ {profileMessage}
                    </p>
                  )}

                </form>

              </div>
            )}

            {/* =================================================
                SECURITY
            ================================================= */}

            {activeSection === "security" && (

              <div
                className="rounded-2xl bg-white p-6 md:p-8"
                style={{
                  border:
                    "1px solid #E7EAF0",
                  boxShadow:
                    "0 8px 30px rgba(23,32,51,0.04)",
                }}
              >

                <div className="mb-8">

                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: "#9AA1B0",
                    }}
                  >
                    Protection
                  </p>

                  <h2
                    className="mt-2 text-xl"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), serif",
                      color: "#172033",
                    }}
                  >
                    Account security
                  </h2>

                </div>

                <form
                  onSubmit={handlePasswordChange}
                  className="max-w-xl space-y-5"
                >

                  <PasswordInput
                    label="Current password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                  />

                  <PasswordInput
                    label="New password"
                    value={newPassword}
                    onChange={setNewPassword}
                  />

                  <PasswordInput
                    label="Confirm new password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                  />

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-xl px-5 py-3 text-xs font-semibold transition hover:bg-cyan-50 disabled:opacity-50"
                    style={{
                      background: "#ECFBFE",
                      color: "#008FA8",
                      border:
                        "1px solid #BCECF3",
                    }}
                  >
                    {changingPassword
                      ? "Updating..."
                      : "Update password"}
                  </button>

                  {passwordMessage && (
                    <p
                      className="text-xs"
                      style={{
                        color: "#159765",
                      }}
                    >
                      ✓ {passwordMessage}
                    </p>
                  )}

                </form>

              </div>
            )}

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            {activeSection ===
              "notifications" && (

              <SettingsCard
                eyebrow="Signal control"
                title="Notifications"
                description="Choose which signals SocialPilot should send your way."
              >

                <Toggle
                  title="Email notifications"
                  description="Receive important account and workspace updates."
                  enabled={emailNotifications}
                  onChange={
                    setEmailNotifications
                  }
                />

                <Toggle
                  title="AI recommendations"
                  description="Allow SocialPilot to surface content and audience suggestions."
                  enabled={aiSuggestions}
                  onChange={setAiSuggestions}
                />

                <Toggle
                  title="Weekly performance report"
                  description="Receive a weekly summary of your social activity."
                  enabled={weeklyReport}
                  onChange={setWeeklyReport}
                />

              </SettingsCard>
            )}

            {/* =================================================
                APPEARANCE
            ================================================= */}

            {activeSection ===
              "appearance" && (

              <SettingsCard
                eyebrow="Workspace"
                title="Appearance"
                description="Customize the visual environment of your SocialPilot workspace."
              >

                {/* LIGHT ACTIVE */}

                <div
                  className="rounded-2xl p-5"
                  style={{
                    background: "#F5FBFC",
                    border:
                      "1px solid #BCECF3",
                  }}
                >

                  <div className="flex items-center justify-between">

                    <div>

                      <p
                        className="text-sm font-medium"
                        style={{
                          color: "#172033",
                        }}
                      >
                        Light workspace
                      </p>

                      <p
                        className="mt-1 text-xs"
                        style={{
                          color: "#7B8496",
                        }}
                      >
                        Clean and bright
                        SocialPilot workspace.
                      </p>

                    </div>

                    <div
                      className="rounded-full px-4 py-2 text-[10px]"
                      style={{
                        background:
                          "#E9F9F1",
                        color: "#159765",
                      }}
                    >
                      Active
                    </div>

                  </div>

                </div>

                {/* THEMES */}

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* LIGHT */}

                  <div
                    className="rounded-2xl bg-white p-5"
                    style={{
                      border:
                        "1px solid #BCECF3",
                    }}
                  >

                    <div
                      className="mb-4 h-20 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#F7F9FC,#FFFFFF)",
                        border:
                          "1px solid #E5E9EF",
                      }}
                    />

                    <p
                      className="text-xs font-medium"
                      style={{
                        color: "#172033",
                      }}
                    >
                      Light
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color: "#8A91A3",
                      }}
                    >
                      Current workspace
                    </p>

                  </div>

                  {/* MIDNIGHT */}

                  <div
                    className="rounded-2xl bg-white p-5"
                    style={{
                      border:
                        "1px solid #E7EAF0",
                    }}
                  >

                    <div
                      className="mb-4 h-20 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#07080C,#161126)",
                      }}
                    />

                    <p
                      className="text-xs font-medium"
                      style={{
                        color: "#172033",
                      }}
                    >
                      Midnight
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color: "#9AA1B0",
                      }}
                    >
                      Available later
                    </p>

                  </div>

                </div>

              </SettingsCard>
            )}

            {/* =================================================
                PLATFORMS
            ================================================= */}

            {activeSection ===
              "platforms" && (

              <SettingsCard
                eyebrow="Network"
                title="Connected platforms"
                description="Your connected social destinations appear here."
              >

                <div className="grid gap-3 sm:grid-cols-2">

                  {[
                    ["LinkedIn", "in"],
                    ["Instagram", "◎"],
                    ["Facebook", "f"],
                    ["X", "𝕏"],
                    ["YouTube", "▶"],
                    ["Pinterest", "P"],
                  ].map(
                    ([platformName, icon]) => (

                      <div
                        key={platformName}
                        className="flex items-center justify-between rounded-xl bg-white p-4"
                        style={{
                          border:
                            "1px solid #E7EAF0",
                        }}
                      >

                        <div className="flex items-center gap-3">

                          <div
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold"
                            style={{
                              background:
                                "#F1F4F8",
                              color: "#697386",
                            }}
                          >
                            {icon}
                          </div>

                          <span
                            className="text-xs"
                            style={{
                              color: "#354055",
                            }}
                          >
                            {platformName}
                          </span>

                        </div>

                        <span
                          className="rounded-full px-2 py-1 text-[9px]"
                          style={{
                            background:
                              "#F4F6F9",
                            color: "#8A91A3",
                          }}
                        >
                          Manage
                        </span>

                      </div>

                    )
                  )}

                </div>

              </SettingsCard>
            )}

            {/* =================================================
                SIGN OUT
            ================================================= */}

            <div
              className="mt-6 rounded-2xl p-6"
              style={{
                background: "#FFF8FA",
                border:
                  "1px solid #FFDCE4",
              }}
            >

              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: "#B26A7B",
                }}
              >
                Account
              </p>

              <h3
                className="mt-2 text-sm font-medium"
                style={{
                  color: "#273246",
                }}
              >
                Sign out of SocialPilot
              </h3>

              <p
                className="mt-1 text-xs"
                style={{
                  color: "#7C6870",
                }}
              >
                Your account remains intact.
                You can sign in again whenever
                you want.
              </p>

              <button
                onClick={handleLogout}
                className="mt-4 rounded-xl px-4 py-2.5 text-xs transition hover:bg-red-100"
                style={{
                  background: "#FFF0F3",
                  color: "#D64564",
                  border:
                    "1px solid #FFD5DE",
                }}
              >
                Sign out
              </button>

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}

/* =====================================================
   SETTINGS CARD
===================================================== */

function SettingsCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6 md:p-8"
      style={{
        border:
          "1px solid #E7EAF0",
        boxShadow:
          "0 8px 30px rgba(23,32,51,0.04)",
      }}
    >

      <div className="mb-8">

        <p
          className="text-[10px] uppercase tracking-widest"
          style={{
            color: "#9AA1B0",
          }}
        >
          {eyebrow}
        </p>

        <h2
          className="mt-2 text-xl"
          style={{
            fontFamily:
              "var(--font-fraunces), serif",
            color: "#172033",
          }}
        >
          {title}
        </h2>

        <p
          className="mt-2 text-xs leading-5"
          style={{
            color: "#737C8F",
          }}
        >
          {description}
        </p>

      </div>

      <div className="space-y-3">
        {children}
      </div>

    </div>
  );
}

/* =====================================================
   PASSWORD INPUT
===================================================== */

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>

      <label
        className="mb-2 block text-xs"
        style={{
          color: "#657086",
        }}
      >
        {label}
      </label>

      <input
        type="password"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        required
        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
        style={{
          background: "#FBFCFE",
          border:
            "1px solid #DDE2EA",
          color: "#172033",
        }}
      />

    </div>
  );
}

/* =====================================================
   TOGGLE
===================================================== */

function Toggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-slate-50"
      style={{
        background: "#FFFFFF",
        border:
          "1px solid #E5E8EE",
      }}
    >

      <div className="pr-5">

        <p
          className="text-sm font-medium"
          style={{
            color: "#263247",
          }}
        >
          {title}
        </p>

        <p
          className="mt-1 text-xs leading-5"
          style={{
            color: "#7B8496",
          }}
        >
          {description}
        </p>

      </div>

      <div
        className="relative h-6 w-11 shrink-0 rounded-full transition-all"
        style={{
          background: enabled
            ? "#00CFEA"
            : "#D5DAE2",
        }}
      >

        <div
          className="absolute top-1 h-4 w-4 rounded-full transition-all"
          style={{
            left: enabled
              ? "24px"
              : "4px",
            background: enabled
              ? "#FFFFFF"
              : "#FFFFFF",
            boxShadow:
              "0 1px 4px rgba(0,0,0,0.18)",
          }}
        />

      </div>

    </button>
  );
}