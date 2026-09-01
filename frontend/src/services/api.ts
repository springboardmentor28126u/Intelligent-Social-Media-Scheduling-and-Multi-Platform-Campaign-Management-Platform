// Base API configuration and service methods for SocialPilot SaaS
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const getAuthToken = (): string | null => {
  return localStorage.getItem("socialpilot_token");
};

export const setAuthToken = (token: string) => {
  localStorage.setItem("socialpilot_token", token);
};

export const removeAuthToken = () => {
  localStorage.removeItem("socialpilot_token");
  localStorage.removeItem("socialpilot_user");
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (token) {
      removeAuthToken();
      window.dispatchEvent(new Event("auth_logout"));
    }
  }

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred";
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText;
    }
    throw new Error(errorDetail);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================
// HELPERS
// ============================================================

export const getMediaUrl = (url?: string | null): string => {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const api = {
  // ── Auth ────────────────────────────────────────────────────
  auth: {
    login: (data: any) =>
      apiRequest("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    register: (data: any) =>
      apiRequest("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    getMe: () => apiRequest("/auth/me"),
    forgotPassword: (email: string) =>
      apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    resetPassword: (data: any) =>
      apiRequest("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
    changePassword: (data: any) =>
      apiRequest("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
  },

  // ── Users ───────────────────────────────────────────────────
  users: {
    list: () => apiRequest("/users"),
    get: (id: number) => apiRequest(`/users/${id}`),
    update: (id: number, data: any) =>
      apiRequest(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/users/${id}`, { method: "DELETE" }),
  },

  // ── Roles & RBAC ────────────────────────────────────────────
  roles: {
    list: () => apiRequest("/roles"),
    permissions: () => apiRequest("/roles/permissions"),
    updatePermissions: (roleId: number, permissionIds: number[]) =>
      apiRequest(`/roles/${roleId}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permission_ids: permissionIds }),
      }),
  },

  // ── Teams ───────────────────────────────────────────────────
  teams: {
    list: () => apiRequest("/teams"),
    create: (data: any) =>
      apiRequest("/teams", { method: "POST", body: JSON.stringify(data) }),
    invite: (teamId: number, data: any) =>
      apiRequest(`/teams/${teamId}/invite`, { method: "POST", body: JSON.stringify(data) }),
    removeMember: (teamId: number, userId: number) =>
      apiRequest(`/teams/${teamId}/members/${userId}`, { method: "DELETE" }),
  },

  // ── Team convenience aliases ─────────────────────────────────
  team: {
    listMembers: () => apiRequest("/users"),
    inviteMember: (data: any) =>
      apiRequest("/teams/1/invite", { method: "POST", body: JSON.stringify(data) }),
    removeMember: (userId: number) => apiRequest(`/users/${userId}`, { method: "DELETE" }),
  },

  // ── Social Accounts ─────────────────────────────────────────
  social: {
    getPlatforms: () => apiRequest("/social-accounts/platforms"),
    getAccounts: () => apiRequest("/social-accounts"),
    getConfiguredPlatforms: () => apiRequest("/social-accounts/configured-platforms"),
    getOAuthUrl: (platform: string) =>
      apiRequest(`/social-accounts/oauth/${platform}/url`),
    connectDemo: (platform: string, name?: string, handle?: string) =>
      apiRequest("/social-accounts/connect-demo", {
        method: "POST",
        body: JSON.stringify({ platform, account_name: name, account_handle: handle }),
      }),
    deleteAccount: (id: number) => apiRequest(`/social-accounts/${id}`, { method: "DELETE" }),
    syncAccount: (id: number) =>
      apiRequest(`/social-accounts/${id}/sync`, { method: "POST" }),
  },

  // ── Accounts convenience aliases ────────────────────────────
  accounts: {
    list: () => apiRequest("/social-accounts"),
    connect: (data: {
      platform: string;
      account_name?: string;
      account_id?: string;
      avatar_url?: string | null;
    }) =>
      apiRequest("/social-accounts/connect-demo", {
        method: "POST",
        body: JSON.stringify({
          platform: data.platform,
          account_name: data.account_name,
          account_handle: data.account_id,
        }),
      }),
    sync: (id: number) => apiRequest(`/social-accounts/${id}/sync`, { method: "POST" }),
    disconnect: (id: number) => apiRequest(`/social-accounts/${id}`, { method: "DELETE" }),
    getOAuthUrl: (platform: string) =>
      apiRequest(`/social-accounts/oauth/${platform}/url`),
  },

  // ── Posts & Publishing ──────────────────────────────────────
  posts: {
    list: (params?: {
      status?: string;
      platform?: string;
      campaign_id?: number;
      skip?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params?.status) query.append("status", params.status);
      if (params?.platform) query.append("platform", params.platform);
      if (params?.campaign_id) query.append("campaign_id", params.campaign_id.toString());
      if (params?.skip !== undefined) query.append("skip", params.skip.toString());
      if (params?.limit !== undefined) query.append("limit", params.limit.toString());
      return apiRequest(`/posts?${query.toString()}`);
    },

    calendar: (params: {
      start?: string;
      end?: string;
      status?: string;
      platform?: string;
    }) => {
      const query = new URLSearchParams();
      if (params.start) query.append("start", params.start);
      if (params.end) query.append("end", params.end);
      if (params.status) query.append("status", params.status);
      if (params.platform) query.append("platform", params.platform);
      return apiRequest(`/posts/calendar?${query.toString()}`);
    },

    get: (id: number) => apiRequest(`/posts/${id}`),

    create: (data: any) => {
      if (data instanceof FormData) {
        return apiRequest("/posts", { method: "POST", body: data });
      }
      return apiRequest("/posts", { method: "POST", body: JSON.stringify(data) });
    },

    update: (id: number, data: any) =>
      apiRequest(`/posts/${id}`, { method: "PUT", body: JSON.stringify(data) }),

    delete: (id: number) => apiRequest(`/posts/${id}`, { method: "DELETE" }),

    schedule: (id: number, data: any) =>
      apiRequest(`/posts/${id}/schedule`, { method: "POST", body: JSON.stringify(data) }),

    reschedule: (id: number, data: { scheduled_at: string; reason?: string }) =>
      apiRequest(`/posts/${id}/reschedule`, { method: "POST", body: JSON.stringify(data) }),

    cancel: (id: number) =>
      apiRequest(`/posts/${id}/cancel`, { method: "POST" }),

    publish: (id: number) => apiRequest(`/posts/${id}/publish`, { method: "POST" }),

    retry: (id: number) => apiRequest(`/posts/${id}/retry`, { method: "POST" }),

    duplicate: (id: number) => apiRequest(`/posts/${id}/duplicate`, { method: "POST" }),

    submitApproval: (id: number) =>
      apiRequest(`/posts/${id}/submit-approval`, { method: "POST" }),

    approve: (id: number, action: "approve" | "reject", reason?: string) =>
      apiRequest(`/posts/${id}/approve`, {
        method: "POST",
        body: JSON.stringify({ action, rejection_reason: reason }),
      }),

    getLogs: (id: number) => apiRequest(`/posts/${id}/logs`),
  },

  // ── Media ───────────────────────────────────────────────────
  media: {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("/media/upload", { method: "POST", body: formData });
    },
  },

  // ── Campaigns ───────────────────────────────────────────────
  campaigns: {
    list: () => apiRequest("/campaigns"),
    get: (id: number) => apiRequest(`/campaigns/${id}`),
    create: (data: any) =>
      apiRequest("/campaigns", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: any) =>
      apiRequest(`/campaigns/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiRequest(`/campaigns/${id}`, { method: "DELETE" }),
    getPosts: (id: number) => apiRequest(`/campaigns/${id}/posts`),
  },

  // ── Analytics ───────────────────────────────────────────────
  analytics: {
    getOverview: (range = "30d", platform = "all") =>
      apiRequest(`/analytics/overview?range=${range}&platform=${platform}`),
  },

  // ── Reports ─────────────────────────────────────────────────
  reports: {
    list: () => apiRequest("/reports"),
    generate: (data: {
      title: string;
      report_type: string;
      format: string;
      platform?: string;
    }) => apiRequest("/reports/generate", { method: "POST", body: JSON.stringify(data) }),
    getPdfUrl: (id: number) => `${API_BASE}/reports/${id}/pdf`,
    getExcelUrl: (id: number) => `${API_BASE}/reports/${id}/excel`,
  },

  // ── Notifications ───────────────────────────────────────────
  notifications: {
    list: () => apiRequest("/notifications"),
    getUnreadCount: () => apiRequest("/notifications/unread-count"),
    markRead: (params: { notification_ids?: number[]; mark_all?: boolean }) =>
      apiRequest("/notifications/mark-read", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    delete: (id: number) => apiRequest(`/notifications/${id}`, { method: "DELETE" }),
  },

  // ── Admin ───────────────────────────────────────────────────
  admin: {
    dashboard: () => apiRequest("/admin/dashboard"),
    listRoles: () => apiRequest("/roles"),
    auditLogs: () => apiRequest("/admin/audit-logs"),
    queueStats: () => apiRequest("/admin/queue-stats"),
    retryFailedJobs: () => apiRequest("/admin/retry-failed-jobs", { method: "POST" }),
  },
};

export default api;
