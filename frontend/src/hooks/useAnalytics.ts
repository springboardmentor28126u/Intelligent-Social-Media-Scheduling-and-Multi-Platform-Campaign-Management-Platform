"use client";

// Fetches content + audience analytics from the backend.
// Same pattern as usePostCounts: reads the JWT from AuthContext.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

// Shapes copied from your Swagger responses
export interface ContentTotals {
  likes: number;
  shares: number;
  comments: number;
  reach: number;
  impressions: number;
  clicks: number;
  engagement_rate: number;
  ctr: number;
}

export interface PlatformContent extends ContentTotals {
  platform: string;
  posts: number;
}

// One day in the trend series
export interface TrendPoint {
  date: string;
  likes: number;
  shares: number;
  comments: number;
  reach: number;
  impressions: number;
  clicks: number;
}

// One entry in the top-posts list (content is cut to 80 chars by the backend)
export interface TopPost {
  post_id: string;
  content: string;
  interactions: number;
  likes: number;
  shares: number;
  comments: number;
  reach: number;
  impressions: number;
  clicks: number;
  engagement_rate: number;
  ctr: number;
}

export interface ContentAnalytics {
  period_days: number;
  totals: ContentTotals;
  by_platform: PlatformContent[];
  trend: TrendPoint[];
  top_posts: TopPost[];
}

export interface AudiencePlatform {
  platform: string;
  followers: number;
  growth_last_7_days: { date: string; followers: number }[];
}

export interface AudienceAnalytics {
  total_followers: number;
  by_platform: AudiencePlatform[];
}

export function useAnalytics(days: number = 30) {
  const { token } = useAuth();
  const [content, setContent] = useState<ContentAnalytics | null>(null);
  const [audience, setAudience] = useState<AudienceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!token) return; // not logged in yet
    setIsLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [contentRes, audienceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/content?days=${days}`, { headers }),
        fetch(`${API_BASE_URL}/analytics/audience`, { headers }),
      ]);
      if (!contentRes.ok || !audienceRes.ok) {
        throw new Error("Could not load analytics.");
      }
      setContent(await contentRes.json());
      setAudience(await audienceRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load analytics.");
    } finally {
      setIsLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { content, audience, isLoading, error, refetch: fetchAll };
}