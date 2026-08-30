"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser, forgotPassword } from "@/lib/api";

type AuthModalProps = { onClose: () => void };
type Mode = "login" | "register" | "forgot";

export default function AuthModal({ onClose }: AuthModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("content_creator");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle = { borderColor: "rgba(255,255,255,0.1)", background: "#1A1B22", color: "#E8E9F0" };

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_role", data.role);
      onClose();
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerUser(name, email, password, role);
      setMode("login");
      setError("");
      setPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const data = await forgotPassword(email);
      setInfo(data.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.75)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-full max-w-sm rounded-2xl p-8"
      >
        {mode !== "forgot" && (
          <div className="mb-6 flex gap-2 rounded-lg p-1" style={{ background: "#1A1B22" }}>
            <button
              onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
              style={{
                background: mode === "login" ? "#00D9FF" : "transparent",
                color: mode === "login" ? "#08090D" : "#8A8B9A",
              }}
            >
              Login
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); setInfo(""); }}
              className="flex-1 rounded-md py-2 text-sm font-medium transition-colors"
              style={{
                background: mode === "register" ? "#00D9FF" : "transparent",
                color: mode === "register" ? "#08090D" : "#8A8B9A",
              }}
            >
              Register
            </button>
          </div>
        )}

        <h2 style={{ fontFamily: "var(--font-fraunces), serif", color: "#E8E9F0" }} className="mb-5 text-xl font-semibold">
          {mode === "login" ? "Welcome back" : mode === "register" ? "Create your account" : "Reset your password"}
        </h2>

        {error && (
          <p className="mb-4 rounded-lg p-3 text-sm" style={{ background: "rgba(255,92,92,0.1)", color: "#FF5C5C", border: "1px solid rgba(255,92,92,0.3)" }}>
            {error}
          </p>
        )}

        {info && (
          <p className="mb-4 rounded-lg p-3 text-sm" style={{ background: "rgba(0,217,255,0.1)", color: "#00D9FF", border: "1px solid rgba(0,217,255,0.3)" }}>
            {info}
          </p>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="mb-2 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <button type="button" onClick={() => { setMode("forgot"); setError(""); setInfo(""); }} className="mb-4 text-xs" style={{ color: "#00D9FF" }}>
              Forgot password?
            </button>
            <button type="submit" disabled={loading} className="w-full rounded-lg p-3 text-sm font-medium" style={{ background: "#00D9FF", color: "#08090D" }}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="mb-3 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mb-5 w-full rounded-lg border p-3 text-sm" style={inputStyle}>
              <option value="content_creator">Content Creator</option>
              <option value="marketing_team">Marketing Team</option>
              <option value="business_user">Business User</option>
              <option value="administrator">Administrator</option>
            </select>
            <button type="submit" disabled={loading} className="w-full rounded-lg p-3 text-sm font-medium" style={{ background: "#00D9FF", color: "#08090D" }}>
              {loading ? "Registering..." : "Register"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgot}>
            <p className="mb-4 text-sm" style={{ color: "#8A8B9A" }}>
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="mb-5 w-full rounded-lg border p-3 text-sm"
              style={inputStyle}
            />
            <button type="submit" disabled={loading} className="w-full rounded-lg p-3 text-sm font-medium" style={{ background: "#00D9FF", color: "#08090D" }}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <button type="button" onClick={() => { setMode("login"); setError(""); setInfo(""); }} className="mt-4 w-full text-center text-xs" style={{ color: "#00D9FF" }}>
              Back to login
            </button>
          </form>
        )}

        {mode !== "forgot" && (
          <button onClick={onClose} className="mt-4 w-full text-center text-xs" style={{ color: "#54566A" }}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}