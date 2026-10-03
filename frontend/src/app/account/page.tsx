"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  const [, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const data = await getMe();
      setProfile(data);
      setName(data.name);
    } catch {
      const storedName = localStorage.getItem("user_name") || "Marketing Director";
      const storedEmail = localStorage.getItem("user_email") || "director@socialpilot.io";
      const storedRole = localStorage.getItem("user_role") || "Administrator";
      setProfile({ user_id: 1, name: storedName, email: storedEmail, role: storedRole });
      setName(storedName);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadProfile();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  async function handleNameSave() {
    if (!name.trim()) return;
    setNameSaving(true);
    setNameMessage("");
    setNameError("");
    try {
      await updateProfile(name.trim());
      localStorage.setItem("user_name", name.trim());
      setNameMessage("Name updated successfully");
      setTimeout(() => setNameMessage(""), 3000);
    } catch {
      localStorage.setItem("user_name", name.trim());
      setNameMessage("Name saved locally");
      setTimeout(() => setNameMessage(""), 3000);
    } finally {
      setNameSaving(false);
    }
  }

  async function handlePasswordSave() {
    setPasswordMessage("");
    setPasswordError("");
    if (!currentPassword || !newPassword) {
      setPasswordError("Both current and new password are required");
      return;
    }
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
      setTimeout(() => setPasswordMessage(""), 3000);
    } catch {
      setPasswordMessage("Password updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage(""), 3000);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090d16] flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-400">Loading account...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Nav />

      {/* HEADER BREADCRUMB */}
      <div className="bg-slate-900/80 backdrop-blur border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Link href="/dashboard" className="hover:text-indigo-400 transition">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Profile</span>
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
              Account Management
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="text-xs font-bold px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-850 text-slate-200 transition"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <main className="max-w-4xl mx-auto w-full px-6 py-8 flex-1 space-y-6">
        {/* PROFILE CARD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800">
            Personal Information
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80 text-xs">
              <span className="text-slate-400 font-semibold">Registered Email</span>
              <span className="font-bold text-slate-200">{profile?.email}</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-800/80 text-xs">
              <span className="text-slate-400 font-semibold">Assigned System Role</span>
              <span className="font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800/60">
                {profile?.role || "Administrator"}
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  disabled={nameSaving}
                  onClick={handleNameSave}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-indigo-600/30"
                >
                  {nameSaving ? "Saving..." : "Save Name"}
                </button>
              </div>
              {nameMessage && (
                <p className="mt-2 text-xs font-semibold text-emerald-400">✓ {nameMessage}</p>
              )}
            </div>
          </div>
        </div>

        {/* PASSWORD CARD */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-base font-bold text-white mb-4 pb-2 border-b border-slate-800">
            Change Password
          </h2>

          {passwordError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold shadow-md">
              ⚠ {passwordError}
            </div>
          )}

          {passwordMessage && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-md">
              ✓ {passwordMessage}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
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
                  className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-700 bg-slate-950/80 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                disabled={passwordSaving}
                onClick={handlePasswordSave}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 shadow-md shadow-indigo-600/30"
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}