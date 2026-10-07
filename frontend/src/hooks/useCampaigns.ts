"use client";

// Loads campaigns + their analytics (ROI) and handles create / edit / delete.
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const API_BASE_URL = "http://localhost:8000";

export type ApiStatus = "active" | "paused" | "completed";

// Shape of GET /campaigns
export interface Campaign {
  id: string;
  name: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  budget: number;
  objectives: string | null;
  status: ApiStatus;
  created_at: string;
  updated_at: string;
}

// Shape of one item in GET /analytics/campaigns
export interface CampaignStats {
  campaign_id: string;
  likes: number;
  shares: number;
  comments: number;
  reach: number;
  impressions: number;
  clicks: number;
  engagement_rate: number;
  ctr: number;
  budget: number;
  cost_per_click: number;
  estimated_revenue: number;
  roi_percent: number;
}

// Body for POST /campaigns (all fields) and PATCH /campaigns/{id} (any subset)
export interface CampaignPayload {
  name: string;
  platforms: string[];
  start_date: string;
  end_date: string;
  budget: number;
  objectives: string;
  status?: ApiStatus;
}

// Pulls a readable message out of a failed response
async function readError(res: Response, fallback: string) {
  try {
    const body = await res.json();
    if (typeof body.detail === "string") return body.detail;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function useCampaigns() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  // Stats keyed by campaign id for quick lookup
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [campRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/campaigns`, { headers }),
        fetch(`${API_BASE_URL}/analytics/campaigns`, { headers }),
      ]);
      if (!campRes.ok) throw new Error("Could not load campaigns.");
      setCampaigns(await campRes.json());

      // Stats are optional: if they fail, campaigns still show
      if (statsRes.ok) {
        const list: CampaignStats[] = await statsRes.json();
        const map: Record<string, CampaignStats> = {};
        list.forEach((s) => (map[s.campaign_id] = s));
        setStats(map);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load campaigns.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Each action returns an error message, or "" on success
  const createCampaign = async (payload: CampaignPayload): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/campaigns`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return readError(res, "Could not create campaign.");
    await fetchAll();
    return "";
  };

  const updateCampaign = async (
    id: string,
    payload: Partial<CampaignPayload>
  ): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return readError(res, "Could not update campaign.");
    await fetchAll();
    return "";
  };

  const deleteCampaign = async (id: string): Promise<string> => {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return readError(res, "Could not delete campaign.");
    await fetchAll();
    return "";
  };

  return {
    campaigns,
    stats,
    isLoading,
    error,
    refetch: fetchAll,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}