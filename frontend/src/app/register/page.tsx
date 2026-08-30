"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("content_creator");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerUser(name, email, password, role);
      router.push("/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
          Register
        </h1>

        {error && <p className="mb-4 text-sm" style={{ color: "#D14A3D" }}>{error}</p>}

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mb-3 w-full rounded-lg border p-3 text-sm"
          style={{ borderColor: "#E3DFEC" }}
        />
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
          className="mb-3 w-full rounded-lg border p-3 text-sm"
          style={{ borderColor: "#E3DFEC" }}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mb-5 w-full rounded-lg border p-3 text-sm"
          style={{ borderColor: "#E3DFEC" }}
        >
          <option value="content_creator">Content Creator</option>
          <option value="marketing_team">Marketing Team</option>
          <option value="business_user">Business User</option>
          <option value="administrator">Administrator</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg p-3 text-sm font-medium text-white"
          style={{ background: "#3E5C9A" }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </main>
  );
}