// src/hooks/usePostCounts.ts
//
// Shared post-count logic so Posts page and Overview page don't each
// duplicate their own fetch-and-count code. Both call this one hook.
//
// It calls GET /posts (with the JWT), then counts how many posts have
// each status. Also exposes `refetch` so a page can trigger a fresh
// fetch right after creating a post — otherwise counts only update on
// page load, not immediately after scheduling/saving.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

interface PostCounts {
  total: number;
  scheduled: number;
  draft: number;
  published: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Minimal shape we need from each post — matches PostPublic's `status` field.
interface PostSummary {
  status: string;
}

export function usePostCounts(): PostCounts {
  const { token } = useAuth();

  const [counts, setCounts] = useState({
    total: 0,
    scheduled: 0,
    draft: 0,
    published: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wrapped in useCallback so it has a stable identity and can safely
  // be called both from the effect below AND from outside (refetch).
  const fetchCounts = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load post counts.");
      }

      const posts: PostSummary[] = await response.json();

      setCounts({
        total: posts.length,
        scheduled: posts.filter((post) => post.status === "scheduled").length,
        draft: posts.filter((post) => post.status === "draft").length,
        published: posts.filter((post) => post.status === "published").length,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load post counts."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch once automatically when the page loads (or token becomes available).
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { ...counts, isLoading, error, refetch: fetchCounts };
}