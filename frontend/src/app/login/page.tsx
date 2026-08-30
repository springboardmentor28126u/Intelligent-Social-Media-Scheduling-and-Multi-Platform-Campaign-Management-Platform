"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_name", data.name);
      localStorage.setItem("user_role", data.role);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ background: "#F3F1F6", minHeight: "100vh" }} className="flex items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: "#FFFFFF", boxShadow: "0 8px 30px rgba(60, 50, 100, 0.08)" }}
      >
        <h1 style={{ fontFamily: "var(--font-fraunces), serif", color: "#241F33" }} className="mb-6 text-2xl font-semibold">
          Login
        </h1>

        {error && <p className="mb-4 text-sm" style={{ color: "#D14A3D" }}>{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mb-3 w-full rounded-lg border p-3 text-sm"
          style={{ borderColor: "#E3DFEC" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-5 w-full rounded-lg border p-3 text-sm"
          style={{ borderColor: "#E3DFEC" }}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg p-3 text-sm font-medium text-white"
          style={{ background: "#3E5C9A" }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </main>
  );
}