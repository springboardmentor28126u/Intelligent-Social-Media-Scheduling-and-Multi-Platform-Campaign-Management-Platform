"use client";

// Loads the user's real social connections and starts the LinkedIn OAuth flow.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

// Shape of GET /social/connections (tokens are never returned)
export interface SocialConnection {
  platform: string; // e.g. "linkedin"
  display_name: string | null;
  expires_at: string | null;
}

export function useSocialConnections() {
  const { token } = useAuth();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchConnections = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/social/connections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not load connections.");
      setConnections(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load connections.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Re-check status when the user returns from the LinkedIn tab
  useEffect(() => {
    const onFocus = () => fetchConnections();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchConnections]);

  // Gets the LinkedIn URL from the backend and opens it in a NEW tab
  // (new tab keeps this tab's in-memory login alive).
  const startLinkedIn = useCallback(async () => {
    if (!token) return;
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/linkedin/start`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not start LinkedIn connection.");
      const data = await res.json();
      window.open(data.auth_url, "_blank");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not start LinkedIn connection."
      );
    }
  }, [token]);

  return { connections, isLoading, error, refetch: fetchConnections, startLinkedIn };
}