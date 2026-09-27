/* =========================================================
   SOCIALPILOT - CAMPAIGNS API
========================================================= */

const API_BASE_URL = "http://127.0.0.1:8000";

/* =========================================================
   TYPES
========================================================= */

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type Campaign = {
  id: number;
  user_id?: number | null;

  name: string;
  description?: string | null;

  platform?: string | null;
  status: CampaignStatus;

  start_date?: string | null;
  end_date?: string | null;

  budget?: number | null;
  spent?: number | null;
  currency?: string | null;

  objectives?: string | null;
  target_audience?: string | null;

  target_reach?: number | null;
  target_engagement?: number | null;
  target_clicks?: number | null;

  actual_reach?: number | null;
  actual_engagement?: number | null;
  actual_clicks?: number | null;

  roi?: number | null;

  color?: string | null;
  tags?: string | null;

  metadata_json?: Record<string, unknown> | null;

  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateCampaignPayload = {
  name: string;
  description?: string | null;

  platform?: string | null;
  status?: CampaignStatus;

  start_date?: string | null;
  end_date?: string | null;

  budget?: number;
  spent?: number;
  currency?: string;

  objectives?: string | null;
  target_audience?: string | null;

  target_reach?: number;
  target_engagement?: number;
  target_clicks?: number;

  actual_reach?: number;
  actual_engagement?: number;
  actual_clicks?: number;

  roi?: number;

  color?: string | null;
  tags?: string | null;

  metadata_json?: Record<string, unknown> | null;
};

export type UpdateCampaignPayload =
  Partial<CreateCampaignPayload>;

export type CampaignSummary = {
  total_campaigns: number;
  active_campaigns: number;

  total_reach: number;
  average_roi: number;

  total_budget: number;
  total_spent: number;
};

export type CampaignComparison = {
  campaign_id: number;
  campaign_name: string;

  platform?: string | null;

  budget: number;
  reach: number;
  engagement: number;
  clicks: number;
  roi: number;
};

export type CampaignAnalytics = {
  campaign_id?: number;

  reach: number;
  engagement: number;
  clicks: number;
  roi: number;

  target_reach: number;
  target_engagement: number;
  target_clicks: number;

  reach_progress: number;
  engagement_progress: number;
  clicks_progress: number;

  engagement_rate: number;
  click_through_rate: number;
};

export type AudiencePerformance = {
  campaign_id?: number;

  audience_size: number;
  new_followers: number;
  reach: number;

  engagement?: number;
  engagement_rate?: number;
};

export type EngagementAnalytics = {
  campaign_id?: number;

  engagement: number;
  engagement_rate: number;

  clicks: number;
  click_through_rate: number;

  likes: number;
  comments: number;
  shares: number;
};

export type AudienceGrowth = {
  campaign_id?: number;

  starting_audience: number;
  current_audience: number;

  growth: number;
  growth_rate: number;
};

export type PerformanceHistory = {
  id?: number;
  campaign_id?: number;

  recorded_at: string;

  reach: number;
  engagement: number;
  clicks: number;
  roi: number;
};

export type PerformanceHistoryPayload = {
  recorded_at?: string;
  reach: number;
  engagement: number;
  clicks: number;
  roi: number;
};

export type CampaignPost = {
  id?: number;

  content?: string | null;
  platform?: string | null;
  status?: string | null;

  scheduled_at?: string | null;
  created_at?: string | null;
};

export type CampaignReport = {
  campaign?: Campaign | null;

  analytics?: CampaignAnalytics | null;

  audience?: AudiencePerformance | null;

  audience_growth?: AudienceGrowth | null;

  engagement?: EngagementAnalytics | null;

  posts_count?: number;
};

/* =========================================================
   API HELPER
========================================================= */

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}.`;

    try {
      const errorData: unknown =
        await response.json();

      if (
        typeof errorData === "object" &&
        errorData !== null &&
        "detail" in errorData
      ) {
        const detail =
          (
            errorData as {
              detail?: unknown;
            }
          ).detail;

        if (typeof detail === "string") {
          message = detail;
        }
      }
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/* =========================================================
   CAMPAIGN CRUD
========================================================= */

export async function getCampaigns(): Promise<
  Campaign[]
> {
  return request<Campaign[]>(
    "/campaigns/"
  );
}

export async function getCampaign(
  campaignId: number
): Promise<Campaign> {
  return request<Campaign>(
    `/campaigns/${campaignId}`
  );
}

export async function createCampaign(
  payload: CreateCampaignPayload
): Promise<Campaign> {
  return request<Campaign>(
    "/campaigns/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateCampaign(
  campaignId: number,
  payload: UpdateCampaignPayload
): Promise<Campaign> {
  return request<Campaign>(
    `/campaigns/${campaignId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteCampaign(
  campaignId: number
): Promise<void> {
  await request<unknown>(
    `/campaigns/${campaignId}`,
    {
      method: "DELETE",
    }
  );
}

/* =========================================================
   SUMMARY
========================================================= */

export async function getCampaignSummary(): Promise<
  CampaignSummary
> {
  return request<CampaignSummary>(
    "/campaigns/analytics/summary"
  );
}

/* =========================================================
   COMPARISON
========================================================= */

export async function getCampaignComparison(): Promise<
  CampaignComparison[]
> {
  return request<CampaignComparison[]>(
    "/campaigns/comparison"
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

export async function getCampaignAnalytics(
  campaignId: number
): Promise<CampaignAnalytics> {
  return request<CampaignAnalytics>(
    `/campaigns/${campaignId}/analytics`
  );
}

export async function getAudiencePerformance(
  campaignId: number
): Promise<AudiencePerformance> {
  return request<AudiencePerformance>(
    `/campaigns/${campaignId}/audience-performance`
  );
}

export async function getEngagementAnalytics(
  campaignId: number
): Promise<EngagementAnalytics> {
  return request<EngagementAnalytics>(
    `/campaigns/${campaignId}/engagement-analytics`
  );
}

export async function getAudienceGrowth(
  campaignId: number
): Promise<AudienceGrowth> {
  return request<AudienceGrowth>(
    `/campaigns/${campaignId}/audience-growth`
  );
}

/* =========================================================
   PERFORMANCE
========================================================= */

export async function updateCampaignPerformance(
  campaignId: number,
  payload: {
    reach: number;
    engagement: number;
    clicks: number;
    roi: number;
  }
): Promise<Campaign> {
  return request<Campaign>(
    `/campaigns/${campaignId}/performance`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
}

/* =========================================================
   PERFORMANCE HISTORY
========================================================= */

export async function getPerformanceHistory(
  campaignId: number
): Promise<PerformanceHistory[]> {
  return request<PerformanceHistory[]>(
    `/campaigns/${campaignId}/performance-history`
  );
}

export async function addPerformanceHistory(
  campaignId: number,
  payload: PerformanceHistoryPayload
): Promise<PerformanceHistory> {
  return request<PerformanceHistory>(
    `/campaigns/${campaignId}/performance-history`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

/* =========================================================
   POSTS
========================================================= */

export async function getCampaignPosts(
  campaignId: number
): Promise<CampaignPost[]> {
  return request<CampaignPost[]>(
    `/campaigns/${campaignId}/posts`
  );
}

/* =========================================================
   REPORT
========================================================= */

export async function getCampaignReport(
  campaignId: number
): Promise<CampaignReport> {
  return request<CampaignReport>(
    `/campaigns/${campaignId}/report`
  );
}