"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, updateProfile, changePassword } from "@/lib/api";
import Nav from "@/components/Nav";

type UserProfile = { user_id: number; name: string; email: string; role: string };

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState("");
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      const data = await getMe();
      setProfile(data);
      setName(data.name);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Invalid or expired")) {
        localStorage.removeItem("access_token");
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/");
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional data fetch on mount
    loadProfile();
  }, [router, loadProfile]);

  useEffect(() => {
    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        const token = localStorage.getItem("access_token");
        if (!token) {
          router.push("/");
        }
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault();
    setNameError("");
    setNameMessage("");
    setNameSaving(true);
    try {
      const data = await updateProfile(name);
      setProfile((prev) => (prev ? { ...prev, name: data.name } : prev));
      localStorage.setItem("user_name", data.name);
      setNameMessage("Name updated successfully");
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  }

  const inputStyle = { borderColor: "rgba(255,255,255,0.1)", background: "#1A1B22", color: "#E8E9F0" };

  if (loading) {
    return (
      <main style={{ background: "#08090D", minHeight: "100vh" }} className="flex items-center justify-center">
        <p style={{ color: "#8A8B9A", fontFamily: "var(--font-plex-mono), monospace" }}>Loading account...</p>
      </main>
    );
  }

  return (
    <main
      style={{ background: "#08090D", color: "#E8E9F0", fontFamily: "var(--font-plex-mono), monospace" }}
      className="min-h-screen p-8"
    >
      <div className="mx-auto max-w-2xl">
        <Nav
          rightSlot={
            <button
              onClick={() => router.push("/dashboard")}
              className="glass-panel rounded-lg px-4 py-2 text-sm font-medium"
              style={{ color: "#8A8B9A" }}
            >
              Back to Dashboard
            </button>
          }
        />

        <div className="mb-8">
          <p className="mb-1 text-xs tracking-[0.25em] uppercase" style={{ color: "#00D9FF" }}>Account</p>
          <h1 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600 }} className="text-3xl">
            Account Settings
          </h1>
        </div>

        {/* PROFILE */}
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="mb-4 text-lg">
            Profile
          </h2>

          <div className="mb-4 flex justify-between border-b pb-3 text-sm" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <span style={{ color: "#8A8B9A" }}>Email</span>
            <span>{profile?.email}</span>
          </div>

          {nameError && (
            <p className="mb-3 rounded-lg p-3 text-sm" style={{ background: "rgba(255,92,92,0.1)", color: "#FF5C5C", border: "1px solid rgba(255,92,92,0.3)" }}>
              {nameError}
            </p>
          )}
          {nameMessage && (
            <p className="mb-3 rounded-lg p-3 text-sm" style={{ background: "rgba(0,217,255,0.1)", color: "#00D9FF", border: "1px solid rgba(0,217,255,0.3)" }}>
              {nameMessage}
            </p>
          )}

          <form onSubmit={handleNameSave} className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="flex-1 rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={nameSaving}
              className="rounded-lg px-5 py-3 text-sm font-medium"
              style={{ background: "#00D9FF", color: "#08090D" }}
            >
              {nameSaving ? "Saving..." : "Save"}
            </button>
          </form>
        </div>

        {/* CHANGE PASSWORD */}
        <div className="glass-panel mb-6 rounded-2xl p-6">
          <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="mb-4 text-lg">
            Change Password
          </h2>

          {passwordError && (
            <p className="mb-3 rounded-lg p-3 text-sm" style={{ background: "rgba(255,92,92,0.1)", color: "#FF5C5C", border: "1px solid rgba(255,92,92,0.3)" }}>
              {passwordError}
            </p>
          )}
          {passwordMessage && (
            <p className="mb-3 rounded-lg p-3 text-sm" style={{ background: "rgba(0,217,255,0.1)", color: "#00D9FF", border: "1px solid rgba(0,217,255,0.3)" }}>
              {passwordMessage}
            </p>
          )}

          <form onSubmit={handlePasswordSave}>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mb-4 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <button
              type="submit"
              disabled={passwordSaving}
              className="w-full rounded-lg p-3 text-sm font-medium"
              style={{ background: "#00D9FF", color: "#08090D" }}
            >
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </form>
        </div>

        {/* LINKED ACCOUNTS */}
        <div className="glass-panel rounded-2xl p-6">
          <h2 style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 500 }} className="mb-4 text-lg">
            Linked Accounts
          </h2>

          <div className="flex items-center justify-between rounded-xl p-4" style={{ background: "#1A1B22" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl">🔵</span>
              <div>
                <p className="text-sm font-medium">Google</p>
                <p className="text-xs" style={{ color: "#8A8B9A" }}>Sign in faster with your Google account</p>
              </div>
            </div>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ background: "rgba(138,139,154,0.15)", color: "#8A8B9A" }}
            >
              Coming soon
            </span>
          </div>
        </div>

      </div>
    </main>
  );
}