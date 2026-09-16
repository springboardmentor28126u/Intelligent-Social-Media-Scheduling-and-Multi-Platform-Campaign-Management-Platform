// src/hooks/usePostsInRange.ts
//
// Shared hook for fetching posts scheduled within a date range, via
// GET /posts/calendar?start_date=...&end_date=... (Milestone 2 backend
// route). Reusable by the Calendar page and Overview's Upcoming Schedule.

"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

// Matches the backend's PostPublic schema.
export interface CalendarPost {
  id: string;
  post_type: string;
  platforms: string[];
  content: string;
  scheduled_at: string | null;
  status: string;
  campaign_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  retry_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePostsInRangeResult {
  posts: CalendarPost[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePostsInRange(
  startDate: Date,
  endDate: Date
): UsePostsInRangeResult {
  const { token } = useAuth();

  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date objects are a new reference every render, so we use their ISO
  // string form as the stable dependency for useCallback/useEffect.
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const fetchPosts = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/posts/calendar?start_date=${encodeURIComponent(
        startIso
      )}&end_date=${encodeURIComponent(endIso)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to load scheduled posts.");
      }

      const data: CalendarPost[] = await response.json();
      setPosts(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load scheduled posts."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, startIso, endIso]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, isLoading, error, refetch: fetchPosts };
}