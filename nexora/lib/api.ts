import { getStoredToken } from "./auth";

const API_BASE_URLS = [
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api",
  "http://localhost:8000/api",
  "http://127.0.0.1:8001/api",
  "http://localhost:8001/api",
];

interface ApiErrorPayload {
  detail?: unknown;
  message?: unknown;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let lastError: unknown = null;

  // Try available API ports seamlessly
  for (const baseUrl of API_BASE_URLS) {
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      if (!res.ok) {
        let errorDetail = `Request failed with status ${res.status}`;
        try {
          const errJson = await res.json() as ApiErrorPayload;
          const detail = errJson.detail ?? errJson.message;
          if (typeof detail === "string") errorDetail = detail;
        } catch {}
        throw new Error(errorDetail);
      }

      return await res.json();
    } catch (err: unknown) {
      lastError = err;
      // If network error, continue to next port
      if (err instanceof TypeError || (err instanceof Error && err.message.includes("fetch"))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to connect to backend server.");
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
}

export interface CalendarPostItem {
  id: number;
  content: string;
  platforms: string[];
  status: string;
  scheduled_at?: string | null;
  published_at?: string | null;
  media_url?: string | null;
}

export const authApi = {
  login: (data: { email: string; password: string }) => request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  register: (data: { name: string; email: string; password: string; role: string }) => request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  }),
};

// -------------------------------------------------------------
// POSTS & SCHEDULING
// -------------------------------------------------------------
export interface PostItem {
  id: number;
  user_id: number;
  campaign_id?: number | null;
  content: string;
  instagram_content?: string | null;
  linkedin_content?: string | null;
  twitter_content?: string | null;
  facebook_content?: string | null;
  youtube_content?: string | null;
  pinterest_content?: string | null;
  media_url?: string | null;
  media_type?: string;
  platforms: string; // "instagram,facebook"
  status: "Draft" | "Scheduled" | "Published" | "Failed" | "Cancelled" | "Pending Approval";
  scheduled_at?: string | null;
  published_at?: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  clicks_count: number;
  reach_count: number;
  is_ai_generated?: boolean;
  failure_reason?: string | null;
  created_at: string;
}

export interface CreatePostPayload {
  content: string;
  platforms: string;
  media_url?: string | null;
  media_type?: string;
  campaign_id?: number | null;
  instagram_content?: string | null;
  linkedin_content?: string | null;
  twitter_content?: string | null;
  facebook_content?: string | null;
  youtube_content?: string | null;
  pinterest_content?: string | null;
  status?: string;
  scheduled_at?: string | null;
  is_ai_generated?: boolean;
}

export const postsApi = {
  list: (params?: { status?: string; platform?: string; campaign_id?: number }) => {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.platform) search.set("platform", params.platform);
    if (params?.campaign_id) search.set("campaign_id", params.campaign_id.toString());
    const query = search.toString() ? `?${search.toString()}` : "";
    return request<PostItem[]>(`/posts${query}`);
  },
  get: (id: number) => request<PostItem>(`/posts/${id}`),
  create: (data: CreatePostPayload) => request<PostItem>("/posts", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<CreatePostPayload>) => request<PostItem>(`/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => request<{ success: boolean; message: string }>(`/posts/${id}`, {
    method: "DELETE",
  }),
  publishNow: (id: number) => request<PostItem>(`/posts/${id}/publish`, {
    method: "POST",
  }),
  schedule: (id: number, scheduled_at: string) => request<PostItem>(`/posts/${id}/schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduled_at }),
  }),
  calendar: () => request<CalendarPostItem[]>("/posts/calendar"),
};

// -------------------------------------------------------------
// CAMPAIGNS
// -------------------------------------------------------------
export interface CampaignItem {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  platforms: string;
  start_date: string;
  end_date: string;
  budget: number;
  objective: string;
  status: "Active" | "Scheduled" | "Completed" | "Paused";
  progress_percent: number;
  target_reach: number;
  actual_reach: number;
  target_engagement: number;
  actual_engagement: number;
  posts_count: number;
  created_at: string;
}

export interface CreateCampaignPayload {
  name: string;
  description?: string;
  platforms: string;
  start_date: string;
  end_date: string;
  budget?: number;
  objective?: string;
  status?: string;
  target_reach?: number;
  target_engagement?: number;
}

export const campaignsApi = {
  list: (status?: string) => {
    const q = status ? `?status=${status}` : "";
    return request<CampaignItem[]>(`/campaigns${q}`);
  },
  get: (id: number) => request<CampaignItem>(`/campaigns/${id}`),
  create: (data: CreateCampaignPayload) => request<CampaignItem>("/campaigns", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  update: (id: number, data: Partial<CreateCampaignPayload>) => request<CampaignItem>(`/campaigns/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),
  delete: (id: number) => request<{ success: boolean; message: string }>(`/campaigns/${id}`, {
    method: "DELETE",
  }),
};

// -------------------------------------------------------------
// ANALYTICS
// -------------------------------------------------------------
export interface AnalyticsOverviewData {
  total_reach: number;
  total_reach_growth: string;
  total_engagement: number;
  total_engagement_growth: string;
  total_impressions: number;
  total_impressions_growth: string;
  total_clicks: number;
  total_clicks_growth: string;
  total_followers: number;
  total_followers_growth: string;
  engagement_rate_avg: number;
  posts_scheduled: number;
  posts_published: number;
  active_campaigns: number;
}

export interface PlatformStat {
  platform: string;
  followers: number;
  growth: string;
  reach: number;
  engagement: number;
  shares: number;
  color: string;
}

export interface TrendPoint {
  date: string;
  engagement: number;
  reach: number;
  impressions: number;
  clicks: number;
}

export interface TopPost {
  id: number;
  content: string;
  platforms: string[];
  published_at?: string;
  reach: number;
  engagement: number;
  engagement_rate: string;
  media_url?: string | null;
}

export const analyticsApi = {
  overview: () => request<AnalyticsOverviewData>("/analytics/overview"),
  platforms: () => request<PlatformStat[]>("/analytics/platforms"),
  trends: (days = 7) => request<TrendPoint[]>(`/analytics/trends?days=${days}`),
  topPosts: () => request<TopPost[]>("/analytics/top-posts"),
};

// -------------------------------------------------------------
// SOCIAL ACCOUNTS
// -------------------------------------------------------------
export interface SocialAccountItem {
  id: number;
  platform: string;
  account_name: string;
  account_handle: string;
  avatar_url?: string | null;
  followers_count: number;
  following_count: number;
  growth_rate: string;
  is_connected: boolean;
  token_status: string;
  connected_at: string;
  last_synced_at?: string | null;
}

export const socialAccountsApi = {
  list: () => request<SocialAccountItem[]>("/social-accounts"),
  connect: (payload: { platform: string; account_handle?: string; account_name?: string }) =>
    request<SocialAccountItem>("/social-accounts/connect", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  disconnect: (id: number) => request<{ success: boolean; message: string }>(`/social-accounts/${id}/disconnect`, {
    method: "POST",
  }),
  sync: (id: number) => request<{ success: boolean; message: string }>(`/social-accounts/${id}/sync`, {
    method: "POST",
  }),
};

// -------------------------------------------------------------
// TEAM MANAGEMENT & RBAC
// -------------------------------------------------------------
export interface TeamMemberItem {
  id: number;
  team_id: number;
  user_id?: number | null;
  name: string;
  email: string;
  role: string;
  avatar_url?: string | null;
  status: string;
  permissions: string;
  created_at: string;
}

export const teamApi = {
  members: () => request<TeamMemberItem[]>("/team/members"),
  invite: (payload: { name: string; email: string; role: string; permissions?: string }) =>
    request<TeamMemberItem>("/team/invite", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: Partial<TeamMemberItem>) =>
    request<TeamMemberItem>(`/team/members/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: number) => request<{ success: boolean; message: string }>(`/team/members/${id}`, {
    method: "DELETE",
  }),
};

// -------------------------------------------------------------
// NOTIFICATIONS
// -------------------------------------------------------------
export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  category: string;
  type: "success" | "warning" | "error" | "info";
  is_read: boolean;
  action_url?: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: (category?: string) => {
    const q = category ? `?category=${category}` : "";
    return request<NotificationItem[]>(`/notifications${q}`);
  },
  markRead: (id: number) => request<NotificationItem>(`/notifications/${id}/read`, {
    method: "PUT",
  }),
  markAllRead: () => request<{ success: boolean; message: string }>("/notifications/mark-all-read", {
    method: "PUT",
  }),
  clearAll: () => request<{ success: boolean; message: string }>("/notifications/clear", {
    method: "DELETE",
  }),
};

// -------------------------------------------------------------
// REPORTS & EXPORT
// -------------------------------------------------------------
export interface ReportItem {
  id: number;
  title: string;
  report_type: string;
  date_range: string;
  platforms: string;
  format: string;
  summary_data?: string | null;
  created_at: string;
}

export const reportsApi = {
  list: () => request<ReportItem[]>("/reports"),
  generate: (payload: { title: string; report_type: string; date_range?: string; platforms?: string; format?: string }) =>
    request<ReportItem>("/reports/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  delete: (id: number) => request<{ success: boolean; message: string }>(`/reports/${id}`, {
    method: "DELETE",
  }),
};

// -------------------------------------------------------------
// AI CONTENT CO-PILOT
// -------------------------------------------------------------
export interface AICaptionResponse {
  primary_caption: string;
  hashtags: string[];
  call_to_action: string;
  best_time_to_post: string;
  recommended_days: string[];
  adaptations: {
    instagram: string;
    linkedin: string;
    twitter: string;
    facebook: string;
    youtube?: string;
    pinterest?: string;
  };
}

export const aiApi = {
  generateCaption: (payload: {
    topic: string;
    tone?: string;
    platform?: string;
    target_audience?: string;
    include_hashtags?: boolean;
    include_cta?: boolean;
  }) => request<AICaptionResponse>("/ai/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  adaptContent: (payload: { content: string; target_platform: string; tone?: string }) =>
    request<{ platform: string; adapted_content: string; hashtags: string[]; character_count: number }>("/ai/adapt", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  suggestHashtags: (payload: { content: string; count?: number }) =>
    request<{ hashtags: string[]; trending_score: string }>("/ai/hashtags", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
