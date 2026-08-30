"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Missing or invalid reset link");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => router.push("/"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{ background: "#0B0C10", color: "#ECECF1", fontFamily: "var(--font-plex-mono), monospace" }}
      className="flex min-h-screen items-center justify-center p-8"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: "#15161E", border: "1px solid #262838" }}
      >
        <h1 style={{ fontFamily: "var(--font-fraunces), serif", color: "#ECECF1" }} className="mb-5 text-xl font-semibold">
          Set a new password
        </h1>

        {success ? (
          <p className="rounded-lg p-3 text-sm" style={{ background: "rgba(198,255,61,0.1)", color: "#C6FF3D", border: "1px solid rgba(198,255,61,0.3)" }}>
            Password reset successful. Redirecting to home...
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <p className="mb-4 rounded-lg p-3 text-sm" style={{ background: "rgba(255,92,92,0.1)", color: "#FF5C5C", border: "1px solid rgba(255,92,92,0.3)" }}>
                {error}
              </p>
            )}

            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={{ borderColor: "#262838", background: "#0B0C10", color: "#ECECF1" }}
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="mb-5 w-full rounded-lg border p-3 text-sm"
              style={{ borderColor: "#262838", background: "#0B0C10", color: "#ECECF1" }}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg p-3 text-sm font-medium"
              style={{ background: "#C6FF3D", color: "#0B0C10" }}
            >
              {loading ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}