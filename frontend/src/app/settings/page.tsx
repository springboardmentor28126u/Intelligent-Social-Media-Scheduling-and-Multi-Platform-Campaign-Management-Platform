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
  const [error, setError] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  const [activeSection, setActiveSection] = useState("profile");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

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

  async function handleProfileSave(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSavingProfile(true);
    setProfileMessage("");
    setError("");

    try {
      const updated = await updateProfile(name.trim());

      setProfile(updated);

      localStorage.setItem("user_name", name.trim());

      setProfileMessage("Profile updated successfully.");
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

  async function handlePasswordChange(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setPasswordMessage("");
    setError("");

    if (newPassword.length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
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

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");

    router.push("/");
  }

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
        background: "#07080C",
        color: "#E8E9F5",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >
      {/* TOP BAR */}

      <header
        className="border-b px-6 py-5 md:px-10"
        style={{
          borderColor:
            "rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3"
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                color: "#05060A",
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
                }}
              >
                SocialPilot
              </p>

              <p
                className="text-[9px] uppercase tracking-[0.2em]"
                style={{
                  color: "#55596B",
                }}
              >
                Workspace settings
              </p>
            </div>
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-xl px-4 py-2 text-xs transition hover:bg-white/5"
            style={{
              color: "#85889A",
              border:
                "1px solid rgba(255,255,255,0.08)",
            }}
          >
            ← Dashboard
          </button>

        </div>
      </header>

      {/* PAGE */}

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">

        <div className="mb-10">
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{
              color: "#00E5FF",
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
            }}
          >
            Settings
          </h1>

          <p
            className="mt-2 max-w-xl text-sm"
            style={{
              color: "#686B7D",
            }}
          >
            Shape how SocialPilot works for you.
            Manage your identity, security and
            workspace experience.
          </p>
        </div>

        {error && (
          <div
            className="mb-6 rounded-xl p-4 text-sm"
            style={{
              background:
                "rgba(255,61,110,0.08)",
              border:
                "1px solid rgba(255,61,110,0.2)",
              color: "#FF6B8B",
            }}
          >
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">

          {/* SETTINGS NAV */}

          <aside
            className="h-fit rounded-2xl p-3"
            style={{
              background:
                "rgba(255,255,255,0.025)",
              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p
              className="px-3 pb-3 pt-2 text-[9px] uppercase tracking-[0.2em]"
              style={{
                color: "#505365",
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
                      setActiveSection(section.id)
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all"
                    style={{
                      background: active
                        ? "rgba(0,229,255,0.08)"
                        : "transparent",
                      color: active
                        ? "#00E5FF"
                        : "#777A8D",
                    }}
                  >
                    <span className="text-lg">
                      {section.icon}
                    </span>

                    <span>
                      <span className="block text-xs font-medium">
                        {section.title}
                      </span>

                      <span
                        className="mt-0.5 block text-[9px]"
                        style={{
                          color: active
                            ? "#6E9BA3"
                            : "#505365",
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
                  "rgba(255,255,255,0.06)",
              }}
            />

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition hover:bg-red-500/5"
              style={{
                color: "#777A8D",
              }}
            >
              <span>↪</span>
              Sign out
            </button>
          </aside>

          {/* CONTENT */}

          <section>

            {/* PROFILE */}

            {activeSection === "profile" && (
              <div
                className="rounded-2xl p-6 md:p-8"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="mb-8">
                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: "#55596B",
                    }}
                  >
                    Identity
                  </p>

                  <h2
                    className="mt-2 text-xl"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), serif",
                    }}
                  >
                    Your profile
                  </h2>
                </div>

                <div className="mb-8 flex items-center gap-4">

                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold"
                    style={{
                      background:
                        "linear-gradient(135deg,rgba(0,229,255,0.12),rgba(155,92,255,0.18))",
                      border:
                        "1px solid rgba(155,92,255,0.2)",
                      color: "#B58CFF",
                    }}
                  >
                    {name
                      ? name
                          .charAt(0)
                          .toUpperCase()
                      : "U"}
                  </div>

                  <div>
                    <p className="font-medium">
                      {name || "Your name"}
                    </p>

                    <p
                      className="mt-1 text-xs"
                      style={{
                        color: "#646879",
                      }}
                    >
                      {profile?.role || "Creator"}
                    </p>
                  </div>

                </div>

                <form
                  onSubmit={handleProfileSave}
                  className="space-y-5"
                >

                  <div>
                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#85889A",
                      }}
                    >
                      Display name
                    </label>

                    <input
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "#0B0C12",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                        color: "#E8E9F5",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#85889A",
                      }}
                    >
                      Email address
                    </label>

                    <input
                      value={email}
                      disabled
                      className="w-full rounded-xl px-4 py-3 text-sm opacity-60"
                      style={{
                        background: "#0B0C12",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                        color: "#E8E9F5",
                      }}
                    />

                    <p
                      className="mt-2 text-[10px]"
                      style={{
                        color: "#505365",
                      }}
                    >
                      Email changes are currently
                      managed by your account system.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl px-5 py-3 text-xs font-semibold disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                      color: "#05060A",
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
                        color: "#35E6A1",
                      }}
                    >
                      ✓ {profileMessage}
                    </p>
                  )}

                </form>
              </div>
            )}

            {/* SECURITY */}

            {activeSection === "security" && (
              <div
                className="rounded-2xl p-6 md:p-8"
                style={{
                  background:
                    "rgba(255,255,255,0.025)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div className="mb-8">
                  <p
                    className="text-[10px] uppercase tracking-widest"
                    style={{
                      color: "#55596B",
                    }}
                  >
                    Protection
                  </p>

                  <h2
                    className="mt-2 text-xl"
                    style={{
                      fontFamily:
                        "var(--font-fraunces), serif",
                    }}
                  >
                    Account security
                  </h2>
                </div>

                <form
                  onSubmit={handlePasswordChange}
                  className="max-w-xl space-y-5"
                >

                  <div>
                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#85889A",
                      }}
                    >
                      Current password
                    </label>

                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) =>
                        setCurrentPassword(
                          e.target.value
                        )
                      }
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "#0B0C12",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                        color: "#E8E9F5",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#85889A",
                      }}
                    >
                      New password
                    </label>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(
                          e.target.value
                        )
                      }
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "#0B0C12",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                        color: "#E8E9F5",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      className="mb-2 block text-xs"
                      style={{
                        color: "#85889A",
                      }}
                    >
                      Confirm new password
                    </label>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      required
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "#0B0C12",
                        border:
                          "1px solid rgba(255,255,255,0.08)",
                        color: "#E8E9F5",
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="rounded-xl px-5 py-3 text-xs font-semibold disabled:opacity-50"
                    style={{
                      background:
                        "rgba(0,229,255,0.1)",
                      color: "#00E5FF",
                      border:
                        "1px solid rgba(0,229,255,0.2)",
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
                        color: "#35E6A1",
                      }}
                    >
                      ✓ {passwordMessage}
                    </p>
                  )}

                </form>
              </div>
            )}

            {/* NOTIFICATIONS */}

            {activeSection === "notifications" && (
              <SettingsCard
                eyebrow="Signal control"
                title="Notifications"
                description="Choose which signals SocialPilot should send your way."
              >
                <Toggle
                  title="Email notifications"
                  description="Receive important account and workspace updates."
                  enabled={emailNotifications}
                  onChange={setEmailNotifications}
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

            {/* APPEARANCE */}

            {activeSection === "appearance" && (
              <SettingsCard
                eyebrow="Workspace"
                title="Appearance"
                description="Customize the visual environment of your SocialPilot workspace."
              >
                <div
                  className="rounded-2xl p-5"
                  style={{
                    background:
                      "rgba(0,229,255,0.04)",
                    border:
                      "1px solid rgba(0,229,255,0.12)",
                  }}
                >
                  <div className="flex items-center justify-between">

                    <div>
                      <p className="text-sm font-medium">
                        Dark workspace
                      </p>

                      <p
                        className="mt-1 text-xs"
                        style={{
                          color: "#686B7D",
                        }}
                      >
                        SocialPilot&apos;s focused
                        command-center experience.
                      </p>
                    </div>

                    <div
                      className="rounded-full px-4 py-2 text-[10px]"
                      style={{
                        background:
                          "rgba(53,230,161,0.08)",
                        color: "#35E6A1",
                      }}
                    >
                      Active
                    </div>

                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  <div
                    className="rounded-2xl p-5"
                    style={{
                      background:
                        "rgba(255,255,255,0.025)",
                      border:
                        "1px solid rgba(0,229,255,0.2)",
                    }}
                  >
                    <div
                      className="mb-4 h-20 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#07080C,#161126)",
                      }}
                    />

                    <p className="text-xs font-medium">
                      Midnight
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Current workspace
                    </p>
                  </div>

                  <div
                    className="rounded-2xl p-5 opacity-50"
                    style={{
                      background:
                        "rgba(255,255,255,0.025)",
                      border:
                        "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="mb-4 h-20 rounded-xl"
                      style={{
                        background:
                          "linear-gradient(135deg,#DDE4EA,#FFFFFF)",
                      }}
                    />

                    <p className="text-xs font-medium">
                      Light
                    </p>

                    <p
                      className="mt-1 text-[10px]"
                      style={{
                        color: "#55596B",
                      }}
                    >
                      Coming later
                    </p>
                  </div>

                </div>
              </SettingsCard>
            )}

            {/* PLATFORMS */}

            {activeSection === "platforms" && (
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
                  ].map(([platformName, icon]) => (

                    <div
                      key={platformName}
                      className="flex items-center justify-between rounded-xl p-4"
                      style={{
                        background:
                          "rgba(255,255,255,0.025)",
                        border:
                          "1px solid rgba(255,255,255,0.06)",
                      }}
                    >

                      <div className="flex items-center gap-3">

                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold"
                          style={{
                            background:
                              "rgba(255,255,255,0.06)",
                            color: "#A7A9B7",
                          }}
                        >
                          {icon}
                        </div>

                        <span className="text-xs">
                          {platformName}
                        </span>

                      </div>

                      <span
                        className="rounded-full px-2 py-1 text-[9px]"
                        style={{
                          background:
                            "rgba(255,255,255,0.04)",
                          color: "#55596B",
                        }}
                      >
                        Manage
                      </span>

                    </div>

                  ))}

                </div>
              </SettingsCard>
            )}

            {/* DANGER */}

            <div
              className="mt-6 rounded-2xl p-6"
              style={{
                background:
                  "rgba(255,61,110,0.025)",
                border:
                  "1px solid rgba(255,61,110,0.12)",
              }}
            >
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: "#8A5361",
                }}
              >
                Account
              </p>

              <h3 className="mt-2 text-sm font-medium">
                Sign out of SocialPilot
              </h3>

              <p
                className="mt-1 text-xs"
                style={{
                  color: "#68606A",
                }}
              >
                Your account remains intact. You can
                sign in again whenever you want.
              </p>

              <button
                onClick={handleLogout}
                className="mt-4 rounded-xl px-4 py-2.5 text-xs"
                style={{
                  background:
                    "rgba(255,61,110,0.08)",
                  color: "#FF6B8B",
                  border:
                    "1px solid rgba(255,61,110,0.15)",
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

/* ===================================================== */
/* SETTINGS CARD */
/* ===================================================== */

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
      className="rounded-2xl p-6 md:p-8"
      style={{
        background:
          "rgba(255,255,255,0.025)",
        border:
          "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="mb-8">

        <p
          className="text-[10px] uppercase tracking-widest"
          style={{
            color: "#55596B",
          }}
        >
          {eyebrow}
        </p>

        <h2
          className="mt-2 text-xl"
          style={{
            fontFamily:
              "var(--font-fraunces), serif",
          }}
        >
          {title}
        </h2>

        <p
          className="mt-2 text-xs leading-5"
          style={{
            color: "#686B7D",
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

/* ===================================================== */
/* TOGGLE */
/* ===================================================== */

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
      className="flex w-full items-center justify-between rounded-2xl p-5 text-left transition-all hover:bg-white/[0.02]"
      style={{
        background:
          "rgba(255,255,255,0.025)",
        border:
          "1px solid rgba(255,255,255,0.06)",
      }}
    >

      <div className="pr-5">

        <p className="text-sm font-medium">
          {title}
        </p>

        <p
          className="mt-1 text-xs leading-5"
          style={{
            color: "#686B7D",
          }}
        >
          {description}
        </p>

      </div>

      <div
        className="relative h-6 w-11 shrink-0 rounded-full transition-all"
        style={{
          background: enabled
            ? "#00E5FF"
            : "rgba(255,255,255,0.1)",
        }}
      >
        <div
          className="absolute top-1 h-4 w-4 rounded-full transition-all"
          style={{
            left: enabled
              ? "24px"
              : "4px",
            background: enabled
              ? "#05060A"
              : "#777A8D",
          }}
        />
      </div>

    </button>
  );
}