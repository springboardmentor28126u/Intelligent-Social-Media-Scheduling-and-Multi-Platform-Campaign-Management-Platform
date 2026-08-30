// src/context/AuthContext.tsx
//
// This is the app's "coat-check counter" for authentication.
// It holds two things in memory, for as long as the browser tab stays open:
//   1. The logged-in user's info (their name, email, role)
//   2. Their JWT "wristband" (the access_token the backend gave them at login)
//
// Any page in the app can ask "who is logged in?" via the useAuth() hook
// at the bottom of this file, instead of each page tracking it separately.
//
// NOTE: This is IN-MEMORY ONLY (matches the plan) — refreshing the browser
// tab will log you out. That's expected for now; we can add persistence
// (e.g. saving the token to localStorage) later if you want "stay logged in".

"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// The backend's address. Centralized here so we only ever type it once.
const API_BASE_URL = "http://localhost:8000";

// This shape should match your backend's UserPublic Pydantic model.
// ASSUMPTION to verify when we test: field names below are guesses based on
// your snake_case convention elsewhere (hashed_password, full_name, etc).
// If the real response looks different, we'll fix this in one line.
interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }) => Promise<void>;
  logout: () => void;
}

// The context itself starts as "undefined" — the Provider below fills it in.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calls POST /auth/login. Your backend expects email/password as QUERY
  // PARAMS (not a JSON body) — so we build the URL with them attached.
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const url = `${API_BASE_URL}/auth/login?email=${encodeURIComponent(
        email
      )}&password=${encodeURIComponent(password)}`;

      const response = await fetch(url, { method: "POST" });

      if (!response.ok) {
        // Backend sends 401 on wrong email/password.
        throw new Error("Invalid email or password.");
      }

      const data = await response.json();
      // Expected shape: { access_token, token_type, user: {...} }
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  // Calls POST /auth/register. This one DOES expect a JSON body,
  // matching your UserCreate Pydantic model.
  const register = async (payload: {
    full_name: string;
    email: string;
    password: string;
    role: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || "Registration failed.");
      }

      // Registration succeeds but doesn't log you in automatically —
      // that matches typical behavior (register, then log in separately).
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// The hook every page will use to reach the coat-check counter.
// Example: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}