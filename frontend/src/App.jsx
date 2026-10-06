import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import "./App.css";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

/* =========================================================
   SUPPORTED SOCIAL MEDIA PLATFORMS
========================================================= */

const SOCIAL_PLATFORMS = [
  "Instagram",
  "Facebook",
  "Twitter-X",
  "LinkedIn",
  "YouTube",
  "Pinterest",
  "TikTok",
  "Threads",
];

/* =========================================================
   HELPERS
========================================================= */

function getArray(data, keys = []) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }
  }

  return [];
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return numberValue(value).toLocaleString();
}

function formatPercent(value) {
  return `${numberValue(value).toFixed(2)}%`;
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

function formatCampaignDate(value) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
}

function getStatusClass(status) {
  const normalized = String(status || "pending")
    .toLowerCase()
    .replace(/\s+/g, "-");

  return `status-badge status-${normalized}`;
}

function getPostContent(postId, posts) {
  const post = posts.find(
    (item) => Number(item.post_id) === Number(postId)
  );

  return post?.content || `Post #${postId}`;
}

/* =========================================================
   SOCIAL ACCOUNT STATUS
========================================================= */

function isSocialAccountConnected(account) {
  return (
    account?.connected === true ||
    account?.connected === "true" ||
    account?.connected === 1 ||
    account?.connected === "1"
  );
}

/* =========================================================
   API REQUEST
========================================================= */

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(
      data?.message ||
        data?.error ||
        `Request failed with status ${response.status}`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  /* =======================================================
     AUTH
  ======================================================= */

  const [token, setToken] = useState(() =>
    localStorage.getItem("token")
  );

  const [loginEmail, setLoginEmail] =
    useState("pallavi@gmail.com");

  const [loginPassword, setLoginPassword] =
    useState("Pallavi@123");

  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const [page, setPage] = useState("dashboard");

  /* =======================================================
     GENERAL
  ======================================================= */

  const [loading, setLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  /* =======================================================
     DATA
  ======================================================= */

  const [campaigns, setCampaigns] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [publishingQueue, setPublishingQueue] = useState([]);
  const [publishingLogs, setPublishingLogs] = useState([]);

  /* =======================================================
     CAMPAIGN FORM
  ======================================================= */

  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] =
    useState("");

  const [campaignStatus, setCampaignStatus] =
    useState("draft");

  const [campaignStartDate, setCampaignStartDate] =
    useState("");

  const [campaignEndDate, setCampaignEndDate] =
    useState("");

  const [selectedCampaign, setSelectedCampaign] =
    useState("");

  /* =======================================================
     SOCIAL ACCOUNT FORM
  ======================================================= */

  const [socialPlatform, setSocialPlatform] =
    useState(SOCIAL_PLATFORMS[0]);

  const [socialUsername, setSocialUsername] =
    useState("");

  const [socialAccessToken, setSocialAccessToken] =
    useState("");

  /* =======================================================
     POST FORM
  ======================================================= */

  const [postContent, setPostContent] = useState("");
  const [postCampaignId, setPostCampaignId] = useState("");

  // FIX:
  // Backend requires account_id when creating a post.
  const [postAccountId, setPostAccountId] = useState("");

  /* =======================================================
     SCHEDULE FORM
  ======================================================= */

  const [schedulePostId, setSchedulePostId] =
    useState("");

  const [scheduleAccountId, setScheduleAccountId] =
    useState("");

  const [scheduleDateTime, setScheduleDateTime] =
    useState("");

  /* =======================================================
     ANALYTICS
  ======================================================= */

  const [campaignAnalytics, setCampaignAnalytics] =
    useState(null);

  const [audienceAnalytics, setAudienceAnalytics] =
    useState(null);

  const [expenseAnalytics, setExpenseAnalytics] =
    useState(null);

  const [analyticsLoading, setAnalyticsLoading] =
    useState(false);

  /* =======================================================
     HEALTH
  ======================================================= */

  const [serverHealth, setServerHealth] =
    useState("Checking...");

  /* =======================================================
     AUTH FAILURE
  ======================================================= */

  const handleAuthFailure = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");

    setToken(null);

    setCampaigns([]);
    setSocialAccounts([]);
    setPosts([]);
    setScheduledPosts([]);
    setPublishingQueue([]);
    setPublishingLogs([]);

    setCampaignAnalytics(null);
    setAudienceAnalytics(null);
    setExpenseAnalytics(null);

    setLoginError(
      "Your login session has expired. Please login again."
    );

    setPage("dashboard");
  };

  /* =======================================================
     SAFE REQUEST
  ======================================================= */

  const safeRequest = async (
    endpoint,
    options = {},
    config = {}
  ) => {
    try {
      return await apiRequest(endpoint, options);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      }

      if (config.ignore404 && error.status === 404) {
        return null;
      }

      if (!config.silent) {
        setErrorMessage(
          error.message || "Something went wrong."
        );
      }

      throw error;
    }
  };

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoginError("");
    setGlobalMessage("");
    setErrorMessage("");
    setLoginLoading(true);

    try {
      const response = await apiRequest("/users/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      if (!response?.token) {
        throw new Error(
          "Login successful but no token was returned."
        );
      }

      localStorage.setItem("token", response.token);

      setToken(response.token);
      setPage("dashboard");
      setGlobalMessage("Login successful.");

      await loadAllData();
    } catch (error) {
      setLoginError(
        error.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");

    setToken(null);

    setCampaigns([]);
    setSocialAccounts([]);
    setPosts([]);
    setScheduledPosts([]);
    setPublishingQueue([]);
    setPublishingLogs([]);

    setCampaignAnalytics(null);
    setAudienceAnalytics(null);
    setExpenseAnalytics(null);

    setGlobalMessage("");
    setErrorMessage("");
    setLoginError("");
  };

  /* =======================================================
     LOAD CAMPAIGNS
  ======================================================= */

  const loadCampaigns = async () => {
    const response = await safeRequest(
      "/campaigns",
      {},
      { silent: true }
    );

    const data = getArray(response, [
      "campaigns",
      "data",
      "results",
    ]);

    setCampaigns(data);

    if (data.length > 0) {
      setSelectedCampaign((current) => {
        if (
          current &&
          data.some(
            (campaign) =>
              String(campaign.campaign_id) ===
              String(current)
          )
        ) {
          return current;
        }

        return String(data[0].campaign_id);
      });
    } else {
      setSelectedCampaign("");
    }

    return data;
  };

  /* =======================================================
     LOAD SOCIAL ACCOUNTS
  ======================================================= */

  const loadSocialAccounts = async () => {
    const response = await safeRequest(
      "/social-accounts",
      {},
      { silent: true }
    );

    const data = getArray(response, [
      "socialAccounts",
      "social_accounts",
      "accounts",
      "data",
      "results",
    ]);

    setSocialAccounts(data);

    return data;
  };

  /* =======================================================
     LOAD POSTS
  ======================================================= */

  const loadPosts = async () => {
    const response = await safeRequest(
      "/posts",
      {},
      { silent: true }
    );

    const data = getArray(response, [
      "posts",
      "data",
      "results",
    ]);

    setPosts(data);

    return data;
  };

  /* =======================================================
     LOAD SCHEDULED POSTS
  ======================================================= */

  const loadScheduledPosts = async () => {
    const response = await safeRequest(
      "/scheduled-posts",
      {},
      { silent: true }
    );

    const data = getArray(response, [
      "scheduledPosts",
      "scheduled_posts",
      "data",
      "results",
    ]);

    setScheduledPosts(data);

    return data;
  };

  /* =======================================================
     LOAD QUEUE
  ======================================================= */

  const loadPublishingQueue = async () => {
    try {
      const response = await safeRequest(
        "/publishing-queue",
        {},
        {
          silent: true,
          ignore404: true,
        }
      );

      const data = getArray(response, [
        "publishingQueue",
        "publishing_queue",
        "queue",
        "data",
        "results",
      ]);

      setPublishingQueue(data);

      return data;
    } catch {
      setPublishingQueue([]);
      return [];
    }
  };

  /* =======================================================
     LOAD PUBLISHING LOGS
  ======================================================= */

  const loadPublishingLogs = async () => {
    try {
      const response = await safeRequest(
        "/publishing-logs",
        {},
        {
          silent: true,
          ignore404: true,
        }
      );

      const data = getArray(response, [
        "publishingLogs",
        "publishing_logs",
        "logs",
        "data",
        "results",
      ]);

      setPublishingLogs(data);

      return data;
    } catch {
      setPublishingLogs([]);
      return [];
    }
  };

  /* =======================================================
     LOAD ALL DATA
  ======================================================= */

  const loadAllData = async () => {
    if (!localStorage.getItem("token")) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      await Promise.allSettled([
        loadCampaigns(),
        loadSocialAccounts(),
        loadPosts(),
        loadScheduledPosts(),
        loadPublishingQueue(),
        loadPublishingLogs(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     HEALTH CHECK
  ======================================================= */

  const checkHealth = async () => {
    try {
      const response = await fetch(
        `${API_BASE.replace("/api", "")}/health`
      );

      if (response.ok) {
        setServerHealth("Healthy");
      } else {
        setServerHealth("Unavailable");
      }
    } catch {
      setServerHealth("Unavailable");
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    if (token) {
      loadAllData();
      checkHealth();
    }
  }, [token]);

  /* =======================================================
     CREATE CAMPAIGN
  ======================================================= */

  const handleCreateCampaign = async (event) => {
    event.preventDefault();

    setGlobalMessage("");
    setErrorMessage("");

    if (!campaignName.trim()) {
      setErrorMessage("Please enter a campaign name.");
      return;
    }

    if (!campaignStatus) {
      setErrorMessage("Please select a campaign status.");
      return;
    }

    if (!campaignStartDate) {
      setErrorMessage("Please select a start date.");
      return;
    }

    if (!campaignEndDate) {
      setErrorMessage("Please select an end date.");
      return;
    }

    if (campaignEndDate < campaignStartDate) {
      setErrorMessage(
        "End date cannot be before start date."
      );
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/campaigns", {
        method: "POST",
        body: JSON.stringify({
          campaign_name: campaignName.trim(),
          description: campaignDescription.trim(),
          status: campaignStatus,
          start_date: campaignStartDate,
          end_date: campaignEndDate,
        }),
      });

      setCampaignName("");
      setCampaignDescription("");
      setCampaignStatus("draft");
      setCampaignStartDate("");
      setCampaignEndDate("");

      setGlobalMessage(
        "Campaign created successfully."
      );

      await loadCampaigns();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to create campaign."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DELETE CAMPAIGN
  ======================================================= */

  const handleDeleteCampaign = async (campaignId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this campaign?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await apiRequest(`/campaigns/${campaignId}`, {
        method: "DELETE",
      });

      setGlobalMessage(
        "Campaign deleted successfully."
      );

      if (
        String(selectedCampaign) ===
        String(campaignId)
      ) {
        setCampaignAnalytics(null);
        setAudienceAnalytics(null);
        setExpenseAnalytics(null);
        setSelectedCampaign("");
      }

      await loadCampaigns();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Campaign could not be deleted. It may be connected to posts or publishing records."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     CREATE SOCIAL ACCOUNT
  ======================================================= */

  const handleCreateSocialAccount = async (event) => {
    event.preventDefault();

    setGlobalMessage("");
    setErrorMessage("");

    if (!socialUsername.trim()) {
      setErrorMessage("Please enter a username.");
      return;
    }

    if (!SOCIAL_PLATFORMS.includes(socialPlatform)) {
      setErrorMessage(
        "Please select a valid social media platform."
      );
      return;
    }

    try {
      setLoading(true);

      const requestBody = {
        platform: socialPlatform,
        username: socialUsername.trim(),
      };

      if (socialAccessToken.trim()) {
        requestBody.access_token =
          socialAccessToken.trim();
      }

      await apiRequest("/social-accounts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      setSocialUsername("");
      setSocialAccessToken("");

      setGlobalMessage(
        socialAccessToken.trim()
          ? `${socialPlatform} account added and connected successfully.`
          : `${socialPlatform} account added successfully. It is currently not connected because no access token was provided.`
      );

      await loadSocialAccounts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to add social account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DELETE SOCIAL ACCOUNT
  ======================================================= */

  const handleDeleteSocialAccount = async (accountId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this social account?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await apiRequest(
        `/social-accounts/${accountId}`,
        {
          method: "DELETE",
        }
      );

      setGlobalMessage(
        "Social account deleted successfully."
      );

      await loadSocialAccounts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Social account could not be deleted."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     CONNECT SOCIAL ACCOUNT
  ======================================================= */

  const handleConnectSocialAccount = async (account) => {
    const accessToken = window.prompt(
      `Enter access token for ${account.platform} - ${account.username}`
    );

    if (accessToken === null) {
      return;
    }

    if (!accessToken.trim()) {
      setErrorMessage(
        "Access token cannot be empty."
      );
      return;
    }

    try {
      setLoading(true);
      setGlobalMessage("");
      setErrorMessage("");

      await apiRequest(
        `/social-accounts/${account.account_id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            access_token: accessToken.trim(),
          }),
        }
      );

      setGlobalMessage(
        `${account.platform} account connected successfully.`
      );

      await loadSocialAccounts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to connect social account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DISCONNECT SOCIAL ACCOUNT
  ======================================================= */

  const handleDisconnectSocialAccount = async (
    accountId
  ) => {
    const confirmed = window.confirm(
      "Disconnect this social account?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      setGlobalMessage("");
      setErrorMessage("");

      await apiRequest(
        `/social-accounts/${accountId}/disconnect`,
        {
          method: "POST",
        }
      );

      setGlobalMessage(
        "Social account disconnected successfully."
      );

      await loadSocialAccounts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to disconnect social account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     TEST SOCIAL ACCOUNT
  ======================================================= */

  const handleTestSocialAccount = async (account) => {
    try {
      setLoading(true);
      setGlobalMessage("");
      setErrorMessage("");

      const response = await apiRequest(
        `/social-accounts/${account.account_id}/test`,
        {
          method: "POST",
        }
      );

      if (response.connected) {
        setGlobalMessage(
          `${account.platform} connection is configured successfully.`
        );
      } else {
        setErrorMessage(
          response.message ||
            "Social account is not connected."
        );
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to test social account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     CREATE POST
  ======================================================= */

  const handleCreatePost = async (event) => {
    event.preventDefault();

    setGlobalMessage("");
    setErrorMessage("");

    if (!postContent.trim()) {
      setErrorMessage("Please enter post content.");
      return;
    }

    if (!postCampaignId) {
      setErrorMessage("Please select a campaign.");
      return;
    }

    // FIX:
    // Backend requires account_id.
    if (!postAccountId) {
      setErrorMessage(
        "Please select a social account."
      );
      return;
    }

    try {
      setLoading(true);

      await apiRequest("/posts", {
        method: "POST",
        body: JSON.stringify({
          content: postContent.trim(),
          campaign_id: Number(postCampaignId),
          account_id: Number(postAccountId),
          status: "draft",
        }),
      });

      setPostContent("");
      setPostCampaignId("");
      setPostAccountId("");

      setGlobalMessage(
        "Post created successfully."
      );

      await loadPosts();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to create post."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DELETE POST
  ======================================================= */

  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      await apiRequest(`/posts/${postId}`, {
        method: "DELETE",
      });

      setGlobalMessage(
        "Post deleted successfully."
      );

      await Promise.all([
        loadPosts(),
        loadScheduledPosts(),
      ]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Post could not be deleted. It may be linked to scheduling records."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     CREATE SCHEDULE
  ======================================================= */

  const handleSchedulePost = async (event) => {
    event.preventDefault();

    setGlobalMessage("");
    setErrorMessage("");

    if (!schedulePostId) {
      setErrorMessage("Please select a post.");
      return;
    }

    if (!scheduleDateTime) {
      setErrorMessage(
        "Please select a date and time."
      );
      return;
    }

    const selectedDate = new Date(scheduleDateTime);

    if (Number.isNaN(selectedDate.getTime())) {
      setErrorMessage(
        "Please select a valid date and time."
      );
      return;
    }

    try {
      setLoading(true);

      const body = {
        post_id: Number(schedulePostId),
        scheduled_at: selectedDate.toISOString(),
      };

      if (scheduleAccountId) {
        body.account_id = Number(scheduleAccountId);
      }

      await apiRequest("/scheduled-posts", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setSchedulePostId("");
      setScheduleAccountId("");
      setScheduleDateTime("");

      setGlobalMessage(
        "Post scheduled successfully."
      );

      await Promise.all([
        loadScheduledPosts(),
        loadPublishingQueue(),
      ]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to schedule post."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     PUBLISH NOW
  ======================================================= */

  const handlePublishNow = async (scheduleId) => {
    try {
      setLoading(true);

      await apiRequest(
        `/scheduled-posts/${scheduleId}/publish`,
        {
          method: "POST",
        }
      );

      setGlobalMessage(
        "Post published successfully."
      );

      await Promise.all([
        loadScheduledPosts(),
        loadPublishingQueue(),
        loadPublishingLogs(),
      ]);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        handleAuthFailure();
      } else {
        setErrorMessage(
          error.message ||
            "Failed to publish post."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     LOAD ANALYTICS
  ======================================================= */

  const loadAnalytics = async (
    campaignId = selectedCampaign
  ) => {
    if (!campaignId) {
      setErrorMessage(
        "Please select a campaign first."
      );
      return;
    }

    setSelectedCampaign(String(campaignId));
    setAnalyticsLoading(true);
    setErrorMessage("");

    try {
      const [
        campaignResult,
        audienceResult,
        expenseResult,
      ] = await Promise.allSettled([
        apiRequest(
          `/analytics/campaign/${campaignId}`
        ),
        apiRequest(
          `/analytics/audience/${campaignId}`
        ),
        apiRequest(
          `/analytics/expenses/${campaignId}`
        ),
      ]);

      if (campaignResult.status === "fulfilled") {
        setCampaignAnalytics(
          campaignResult.value
        );
      } else {
        setCampaignAnalytics(null);

        const error = campaignResult.reason;

        if (
          error?.status === 401 ||
          error?.status === 403
        ) {
          handleAuthFailure();
          return;
        }
      }

      if (audienceResult.status === "fulfilled") {
        setAudienceAnalytics(
          audienceResult.value
        );
      } else {
        setAudienceAnalytics(null);

        const error = audienceResult.reason;

        if (
          error?.status === 401 ||
          error?.status === 403
        ) {
          handleAuthFailure();
          return;
        }
      }

      if (expenseResult.status === "fulfilled") {
        setExpenseAnalytics(
          expenseResult.value
        );
      } else {
        setExpenseAnalytics(null);

        const error = expenseResult.reason;

        if (
          error?.status === 401 ||
          error?.status === 403
        ) {
          handleAuthFailure();
          return;
        }
      }

      const errors = [
        campaignResult,
        audienceResult,
        expenseResult,
      ]
        .filter(
          (result) =>
            result.status === "rejected"
        )
        .map(
          (result) =>
            result.reason?.message
        )
        .filter(Boolean);

      if (errors.length > 0) {
        setErrorMessage(
          `Some analytics could not be loaded: ${errors.join(
            " | "
          )}`
        );
      }

      setPage("analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  /* =======================================================
     CALENDAR EVENTS
  ======================================================= */

  const calendarEvents = useMemo(() => {
    return scheduledPosts
      .filter((item) => item.scheduled_at)
      .map((item) => {
        const content = getPostContent(
          item.post_id,
          posts
        );

        const status =
          item.status || "pending";

        return {
          id: String(
            item.schedule_id ||
              item.id ||
              `${item.post_id}-${item.scheduled_at}`
          ),

          title: `${content.slice(0, 45)}${
            content.length > 45 ? "..." : ""
          }`,

          start: item.scheduled_at,

          extendedProps: {
            status,
            postId: item.post_id,
            scheduleId: item.schedule_id,
          },
        };
      });
  }, [scheduledPosts, posts]);

  /* =======================================================
     DASHBOARD STATS
  ======================================================= */

  const dashboardStats = useMemo(() => {
    const publishedPosts =
      scheduledPosts.filter(
        (item) =>
          String(item.status || "").toLowerCase() ===
          "published"
      ).length;

    const pendingPosts =
      scheduledPosts.filter(
        (item) =>
          String(item.status || "").toLowerCase() ===
          "pending"
      ).length;

    return {
      campaigns: campaigns.length,
      socialAccounts: socialAccounts.length,
      posts: posts.length,
      scheduled: scheduledPosts.length,
      published: publishedPosts,
      pending: pendingPosts,
    };
  }, [
    campaigns,
    socialAccounts,
    posts,
    scheduledPosts,
  ]);

  /* =======================================================
     ANALYTICS DISPLAY DATA
  ======================================================= */

  const campaignAnalyticsRows = useMemo(() => {
    if (!campaignAnalytics) return [];

    // Backend returns campaign analytics inside the "platforms" array.
    if (Array.isArray(campaignAnalytics.platforms)) {
      return campaignAnalytics.platforms;
    }

    return getArray(campaignAnalytics, [
      "analytics",
      "campaignAnalytics",
      "campaign_analytics",
      "data",
      "results",
    ]);
  }, [campaignAnalytics]);

  const audienceRows = useMemo(() => {
    if (!audienceAnalytics) return [];

    return getArray(audienceAnalytics, [
      "audience",
      "audienceGrowth",
      "audience_growth",
      "data",
      "results",
    ]);
  }, [audienceAnalytics]);

  /* =======================================================
     EXPENSE DATA
  ======================================================= */

  const expenseData = useMemo(() => {
    if (!expenseAnalytics) return null;

    if (
      expenseAnalytics.data &&
      !Array.isArray(expenseAnalytics.data) &&
      typeof expenseAnalytics.data === "object"
    ) {
      return expenseAnalytics.data;
    }

    if (
      expenseAnalytics.expense &&
      typeof expenseAnalytics.expense === "object"
    ) {
      return expenseAnalytics.expense;
    }

    if (
      expenseAnalytics.expenses &&
      typeof expenseAnalytics.expenses === "object" &&
      !Array.isArray(expenseAnalytics.expenses)
    ) {
      return expenseAnalytics.expenses;
    }

    return expenseAnalytics;
  }, [expenseAnalytics]);

  /* =======================================================
     CAMPAIGN TOTALS
  ======================================================= */

  const campaignTotals = useMemo(() => {
    if (!campaignAnalytics) {
      return {
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
        engagement: 0,
        engagementRate: 0,
      };
    }

    // Backend response:
    // {
    //   campaign_id: 6,
    //   platforms: [...],
    //   summary: {
    //     total_impressions: 10000,
    //     total_reach: 7500,
    //     total_likes: 850,
    //     total_comments: 120,
    //     total_shares: 75,
    //     total_clicks: 430,
    //     total_engagement: 1045,
    //     engagement_rate: 13.93
    //   }
    // }
    const summary =
      campaignAnalytics.summary &&
      typeof campaignAnalytics.summary === "object"
        ? campaignAnalytics.summary
        : campaignAnalytics;

    const impressions = numberValue(
      summary.totalImpressions ??
        summary.total_impressions ??
        summary.impressions ??
        0
    );

    const reach = numberValue(
      summary.totalReach ??
        summary.total_reach ??
        summary.reach ??
        0
    );

    const likes = numberValue(
      summary.totalLikes ??
        summary.total_likes ??
        summary.likes ??
        0
    );

    const comments = numberValue(
      summary.totalComments ??
        summary.total_comments ??
        summary.comments ??
        0
    );

    const shares = numberValue(
      summary.totalShares ??
        summary.total_shares ??
        summary.shares ??
        0
    );

    const clicks = numberValue(
      summary.totalClicks ??
        summary.total_clicks ??
        summary.clicks ??
        0
    );

    const engagementFromAPI =
      summary.totalEngagement ??
      summary.total_engagement ??
      summary.engagement;

    const engagement =
      engagementFromAPI !== undefined &&
      engagementFromAPI !== null
        ? numberValue(engagementFromAPI)
        : likes + comments + shares + clicks;

    let engagementRate = numberValue(
      summary.engagementRate ??
        summary.engagement_rate ??
        0
    );

    if (
      engagementRate === 0 &&
      reach > 0 &&
      engagement > 0
    ) {
      engagementRate =
        (engagement / reach) * 100;
    }

    return {
      impressions,
      reach,
      likes,
      comments,
      shares,
      clicks,
      engagement,
      engagementRate,
    };
  }, [campaignAnalytics]);

  /* =======================================================
     ENGAGEMENT CHART
  ======================================================= */

  const engagementChartData = useMemo(() => {
    return [
      {
        name: "Likes",
        value: campaignTotals.likes,
      },
      {
        name: "Comments",
        value: campaignTotals.comments,
      },
      {
        name: "Shares",
        value: campaignTotals.shares,
      },
      {
        name: "Clicks",
        value: campaignTotals.clicks,
      },
    ];
  }, [campaignTotals]);

  /* =======================================================
     AUDIENCE CHART
  ======================================================= */

  const audienceChartData = useMemo(() => {
    return audienceRows.map((item) => {
      const start = numberValue(
        item.followers_start ??
          item.followersStart ??
          item.start
      );

      const end = numberValue(
        item.followers_end ??
          item.followersEnd ??
          item.end
      );

      const growth = numberValue(
        item.follower_growth ??
          item.followers_growth ??
          item.followerGrowth ??
          item.growth
      );

      return {
        platform:
          item.platform || "Platform",
        start,
        end,
        growth,
      };
    });
  }, [audienceRows]);

  /* =======================================================
     LOGIN SCREEN
  ======================================================= */

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-glow"></div>

          <div className="brand-icon">SM</div>

          <h1>Social Media Platform</h1>

          <p className="login-subtitle">
            Intelligent Social Media Scheduling
            and Multi-Platform Campaign Management
          </p>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="login-label">
                Email
              </label>

              <input
                type="email"
                value={loginEmail}
                onChange={(event) =>
                  setLoginEmail(event.target.value)
                }
                placeholder="Enter email"
                required
              />
            </div>

            <div className="form-group">
              <label className="login-label">
                Password
              </label>

              <input
                type="password"
                value={loginPassword}
                onChange={(event) =>
                  setLoginPassword(event.target.value)
                }
                placeholder="Enter password"
                required
              />
            </div>

            {loginError && (
              <div className="login-error">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="primary-button"
              disabled={loginLoading}
            >
              {loginLoading
                ? "Logging in..."
                : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* =======================================================
     DASHBOARD
  ======================================================= */

  const renderDashboard = () => {
    return (
      <section className="dashboard-page">
        <div className="dashboard-hero">
          <div className="hero-content">
            <span className="hero-label">
              MILESTONE 4
            </span>

            <h1>
              Campaign Management & Analytics
            </h1>

            <p>
              Manage campaigns, schedule social media
              posts, monitor publishing activity and
              analyze campaign performance.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setPage("campaigns")
                }
              >
                Manage Campaigns
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setPage("analytics")
                }
              >
                View Analytics
              </button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="floating-card">
              <strong>
                {dashboardStats.campaigns}
              </strong>
              <span>Campaigns</span>
            </div>

            <div className="floating-card">
              <strong>
                {dashboardStats.posts}
              </strong>
              <span>Posts</span>
            </div>

            <div className="floating-card">
              <strong>
                {dashboardStats.published}
              </strong>
              <span>Published</span>
            </div>
          </div>
        </div>

        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-icon">📢</div>
            <span>Campaigns</span>
            <strong>
              {dashboardStats.campaigns}
            </strong>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">👥</div>
            <span>Social Accounts</span>
            <strong>
              {dashboardStats.socialAccounts}
            </strong>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📝</div>
            <span>Posts</span>
            <strong>
              {dashboardStats.posts}
            </strong>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">📅</div>
            <span>Scheduled</span>
            <strong>
              {dashboardStats.scheduled}
            </strong>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">✓</div>
            <span>Published</span>
            <strong>
              {dashboardStats.published}
            </strong>
          </div>

          <div className="dashboard-card">
            <div className="card-icon">⏳</div>
            <span>Pending</span>
            <strong>
              {dashboardStats.pending}
            </strong>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-panel">
            <h3>Workflow</h3>

            <div className="workflow-steps">
              <div className="workflow-step">
                <strong>1</strong>
                <span>Create Campaign</span>
              </div>

              <div className="workflow-step">
                <strong>2</strong>
                <span>Add Social Account</span>
              </div>

              <div className="workflow-step">
                <strong>3</strong>
                <span>Create Post</span>
              </div>

              <div className="workflow-step">
                <strong>4</strong>
                <span>Schedule Post</span>
              </div>

              <div className="workflow-step">
                <strong>5</strong>
                <span>Publish</span>
              </div>

              <div className="workflow-step">
                <strong>6</strong>
                <span>Analyze</span>
              </div>
            </div>
          </div>

          <div className="dashboard-panel">
            <h3>System Status</h3>

            <div className="status-row">
              <span>Backend</span>
              <span className="health-indicator">
                ● {serverHealth}
              </span>
            </div>

            <div className="status-row">
              <span>API</span>
              <span>http://localhost:5000</span>
            </div>

            <div className="status-row">
              <span>Database</span>
              <span>PostgreSQL</span>
            </div>
          </div>
        </div>

        <div className="dashboard-calendar">
          <div className="content-card">
            <h3>Publishing Calendar</h3>

            <FullCalendar
              plugins={[
                dayGridPlugin,
                interactionPlugin,
              ]}
              initialView="dayGridMonth"
              height="auto"
              events={calendarEvents}
              eventClick={(info) => {
                const scheduleId =
                  info.event.extendedProps
                    .scheduleId;

                if (scheduleId) {
                  setPage("scheduled");
                }
              }}
            />
          </div>
        </div>
      </section>
    );
  };

  /* =======================================================
     CAMPAIGNS
  ======================================================= */

  const renderCampaigns = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Campaigns</h1>
            <p>
              Create and manage your social media
              campaigns.
            </p>
          </div>
        </div>

        <div className="form-card">
          <h3>Create Campaign</h3>

          <form onSubmit={handleCreateCampaign}>
            <div className="form-group">
              <label>Campaign Name</label>

              <input
                type="text"
                value={campaignName}
                onChange={(event) =>
                  setCampaignName(event.target.value)
                }
                placeholder="Enter campaign name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>

              <textarea
                value={campaignDescription}
                onChange={(event) =>
                  setCampaignDescription(
                    event.target.value
                  )
                }
                placeholder="Enter campaign description"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>Status</label>

              <select
                value={campaignStatus}
                onChange={(event) =>
                  setCampaignStatus(
                    event.target.value
                  )
                }
                required
              >
                <option value="draft">
                  Draft
                </option>

                <option value="active">
                  Active
                </option>

                <option value="completed">
                  Completed
                </option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>

                <input
                  type="date"
                  value={campaignStartDate}
                  onChange={(event) =>
                    setCampaignStartDate(
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>End Date</label>

                <input
                  type="date"
                  value={campaignEndDate}
                  min={
                    campaignStartDate || undefined
                  }
                  onChange={(event) =>
                    setCampaignEndDate(
                      event.target.value
                    )
                  }
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Campaign"}
            </button>
          </form>
        </div>

        <div className="content-card">
          <div className="section-header">
            <h3>Your Campaigns</h3>

            <span>
              {campaigns.length} campaign
              {campaigns.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {campaigns.length === 0 ? (
            <div className="empty-state">
              <h3>No campaigns found</h3>
              <p>
                Create your first campaign above.
              </p>
            </div>
          ) : (
            <div className="data-grid">
              {campaigns.map((campaign) => (
                <div
                  className="campaign-card"
                  key={campaign.campaign_id}
                >
                  <div className="data-card">
                    <div className="card-top">
                      <h3>
                        {campaign.campaign_name ||
                          "Unnamed Campaign"}
                      </h3>

                      <span
                        className={getStatusClass(
                          campaign.status
                        )}
                      >
                        {campaign.status ||
                          "draft"}
                      </span>
                    </div>

                    <p>
                      {campaign.description ||
                        "No description provided."}
                    </p>

                    <div className="campaign-details">
                      <div className="campaign-detail-item">
                        <strong>
                          Start Date
                        </strong>

                        <span>
                          {formatCampaignDate(
                            campaign.start_date
                          )}
                        </span>
                      </div>

                      <div className="campaign-detail-item">
                        <strong>
                          End Date
                        </strong>

                        <span>
                          {formatCampaignDate(
                            campaign.end_date
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => {
                          setSelectedCampaign(
                            String(
                              campaign.campaign_id
                            )
                          );

                          loadAnalytics(
                            campaign.campaign_id
                          );
                        }}
                      >
                        Analytics
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                          handleDeleteCampaign(
                            campaign.campaign_id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  /* =======================================================
     SOCIAL ACCOUNTS
  ======================================================= */

  const renderSocialAccounts = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Social Accounts</h1>
            <p>
              Connect social platforms for publishing.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={loadSocialAccounts}
            disabled={loading}
          >
            ↻ Refresh
          </button>
        </div>

        <div className="form-card">
          <h3>Add Social Account</h3>

          <form
            onSubmit={
              handleCreateSocialAccount
            }
          >
            <div className="form-row">
              <div className="form-group">
                <label>Platform</label>

                <select
                  value={socialPlatform}
                  onChange={(event) =>
                    setSocialPlatform(
                      event.target.value
                    )
                  }
                  required
                >
                  {SOCIAL_PLATFORMS.map(
                    (platform) => (
                      <option
                        key={platform}
                        value={platform}
                      >
                        {platform}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Username</label>

                <input
                  type="text"
                  value={socialUsername}
                  onChange={(event) =>
                    setSocialUsername(
                      event.target.value
                    )
                  }
                  placeholder="@username"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Access Token
                <span className="muted-text">
                  {" "}
                  (optional for demo)
                </span>
              </label>

              <input
                type="password"
                value={socialAccessToken}
                onChange={(event) =>
                  setSocialAccessToken(
                    event.target.value
                  )
                }
                placeholder="Enter access token"
              />

              <small className="muted-text">
                Leave empty to add the account as
                Not Connected.
              </small>
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Adding..."
                : "Add Account"}
            </button>
          </form>
        </div>

        <div className="content-card">
          <div className="section-header">
            <div>
              <h3>Social Accounts</h3>

              <p className="muted-text">
                Supported platforms:{" "}
                {SOCIAL_PLATFORMS.join(", ")}
              </p>
            </div>

            <span>
              {socialAccounts.length} account
              {socialAccounts.length !== 1
                ? "s"
                : ""}
            </span>
          </div>

          {socialAccounts.length === 0 ? (
            <div className="empty-state">
              <h3>No social accounts</h3>
              <p>
                Add a social account above.
              </p>
            </div>
          ) : (
            <div className="data-grid">
              {socialAccounts.map((account) => {
                const connected =
                  isSocialAccountConnected(account);

                return (
                  <div
                    className="account-card"
                    key={account.account_id}
                  >
                    <div className="data-card">
                      <div className="card-top">
                        <h3>
                          {account.platform ||
                            "Social Platform"}
                        </h3>

                        <span
                          className={
                            connected
                              ? "status-badge status-connected"
                              : "status-badge status-not-connected"
                          }
                        >
                          {connected
                            ? "Connected"
                            : "Not Connected"}
                        </span>
                      </div>

                      <p>
                        {account.username ||
                          account.account_name ||
                          "No username"}
                      </p>

                      <p className="muted-text">
                        Account ID:{" "}
                        {account.account_id}
                      </p>

                      <div className="card-actions">
                        {connected ? (
                          <>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                handleTestSocialAccount(
                                  account
                                )
                              }
                              disabled={loading}
                            >
                              Test
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                handleDisconnectSocialAccount(
                                  account.account_id
                                )
                              }
                              disabled={loading}
                            >
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() =>
                              handleConnectSocialAccount(
                                account
                              )
                            }
                            disabled={loading}
                          >
                            Connect
                          </button>
                        )}

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            handleDeleteSocialAccount(
                              account.account_id
                            )
                          }
                          disabled={loading}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    );
  };

  /* =======================================================
     POSTS
  ======================================================= */

  const renderPosts = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Posts</h1>
            <p>
              Create posts and associate them with
              campaigns and social accounts.
            </p>
          </div>
        </div>

        <div className="form-card">
          <h3>Create Post</h3>

          <form onSubmit={handleCreatePost}>
            {/* CAMPAIGN */}
            <div className="form-group">
              <label>Campaign</label>

              <select
                value={postCampaignId}
                onChange={(event) =>
                  setPostCampaignId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select campaign
                </option>

                {campaigns.map((campaign) => (
                  <option
                    key={campaign.campaign_id}
                    value={
                      campaign.campaign_id
                    }
                  >
                    {campaign.campaign_name}
                  </option>
                ))}
              </select>
            </div>

            {/* SOCIAL ACCOUNT */}
            <div className="form-group">
              <label>Social Account</label>

              <select
                value={postAccountId}
                onChange={(event) =>
                  setPostAccountId(
                    event.target.value
                  )
                }
                required
              >
                <option value="">
                  Select social account
                </option>

                {socialAccounts.map(
                  (account) => (
                    <option
                      key={account.account_id}
                      value={
                        account.account_id
                      }
                    >
                      {account.platform} -{" "}
                      {account.username}
                      {isSocialAccountConnected(
                        account
                      )
                        ? " (Connected)"
                        : " (Not Connected)"}
                    </option>
                  )
                )}
              </select>

              {socialAccounts.length === 0 && (
                <small className="muted-text">
                  No social accounts found.
                  Please add one from Social
                  Accounts first.
                </small>
              )}
            </div>

            {/* CONTENT */}
            <div className="form-group">
              <label>Post Content</label>

              <textarea
                value={postContent}
                onChange={(event) =>
                  setPostContent(
                    event.target.value
                  )
                }
                placeholder="Write your post..."
                rows="6"
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={
                loading ||
                campaigns.length === 0 ||
                socialAccounts.length === 0
              }
            >
              {loading
                ? "Creating..."
                : "Create Post"}
            </button>
          </form>
        </div>

        <div className="content-card">
          <h3>Posts</h3>

          {posts.length === 0 ? (
            <div className="empty-state">
              <h3>No posts found</h3>
              <p>Create a post above.</p>
            </div>
          ) : (
            <div className="post-grid">
              {posts.map((post) => (
                <div
                  className="post-card"
                  key={post.post_id}
                >
                  <div className="data-card">
                    <div className="card-top">
                      <span>
                        Post #{post.post_id}
                      </span>

                      <span className="status-badge">
                        {post.status || "Draft"}
                      </span>
                    </div>

                    <p>
                      {post.content ||
                        "No content"}
                    </p>

                    <p className="muted-text">
                      Campaign ID:{" "}
                      {post.campaign_id || "-"}
                    </p>

                    <p className="muted-text">
                      Account ID:{" "}
                      {post.account_id || "-"}
                    </p>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        handleDeletePost(
                          post.post_id
                        )
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  /* =======================================================
     CALENDAR
  ======================================================= */

  const renderCalendar = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Publishing Calendar</h1>
            <p>
              View scheduled posts by date.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={loadScheduledPosts}
          >
            Refresh
          </button>
        </div>

        <div className="calendar-card content-card">
          <FullCalendar
            plugins={[
              dayGridPlugin,
              interactionPlugin,
            ]}
            initialView="dayGridMonth"
            height="auto"
            events={calendarEvents}
            eventClick={(info) => {
              const scheduleId =
                info.event.extendedProps
                  .scheduleId;

              if (scheduleId) {
                setPage("scheduled");
              }
            }}
          />
        </div>
      </section>
    );
  };

  /* =======================================================
     SCHEDULED POSTS
  ======================================================= */

  const renderScheduledPosts = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Scheduled Posts</h1>
            <p>
              Schedule posts for publishing.
            </p>
          </div>
        </div>

        <div className="form-card">
          <h3>Schedule Post</h3>

          <form onSubmit={handleSchedulePost}>
            <div className="form-row">
              <div className="form-group">
                <label>Post</label>

                <select
                  value={schedulePostId}
                  onChange={(event) =>
                    setSchedulePostId(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select post
                  </option>

                  {posts.map((post) => (
                    <option
                      key={post.post_id}
                      value={post.post_id}
                    >
                      #{post.post_id} -{" "}
                      {(post.content || "").slice(
                        0,
                        60
                      )}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Social Account</label>

                <select
                  value={scheduleAccountId}
                  onChange={(event) =>
                    setScheduleAccountId(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select account
                  </option>

                  {socialAccounts.map(
                    (account) => (
                      <option
                        key={account.account_id}
                        value={
                          account.account_id
                        }
                      >
                        {account.platform} -{" "}
                        {account.username}
                        {isSocialAccountConnected(
                          account
                        )
                          ? " (Connected)"
                          : " (Not Connected)"}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                Scheduled Date & Time
              </label>

              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(event) =>
                  setScheduleDateTime(
                    event.target.value
                  )
                }
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={loading}
            >
              {loading
                ? "Scheduling..."
                : "Schedule Post"}
            </button>
          </form>
        </div>

        <div className="content-card">
          <div className="section-header">
            <h3>Scheduled Posts</h3>

            <button
              type="button"
              className="secondary-button"
              onClick={loadScheduledPosts}
            >
              Refresh
            </button>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="empty-state">
              <h3>No scheduled posts</h3>
              <p>
                Schedule a post using the form above.
              </p>
            </div>
          ) : (
            <div className="scheduled-grid">
              {scheduledPosts.map(
                (schedule) => (
                  <div
                    className="scheduled-card"
                    key={
                      schedule.schedule_id ||
                      schedule.id
                    }
                  >
                    <div className="data-card">
                      <div className="card-top">
                        <h3>
                          Schedule #
                          {schedule.schedule_id}
                        </h3>

                        <span
                          className={getStatusClass(
                            schedule.status
                          )}
                        >
                          {schedule.status ||
                            "pending"}
                        </span>
                      </div>

                      <p>
                        {getPostContent(
                          schedule.post_id,
                          posts
                        )}
                      </p>

                      <p>
                        <strong>
                          Scheduled:
                        </strong>{" "}
                        {formatDateTime(
                          schedule.scheduled_at
                        )}
                      </p>

                      {schedule.published_at && (
                        <p>
                          <strong>
                            Published:
                          </strong>{" "}
                          {formatDateTime(
                            schedule.published_at
                          )}
                        </p>
                      )}

                      <div className="card-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            handlePublishNow(
                              schedule.schedule_id
                            )
                          }
                          disabled={
                            String(
                              schedule.status || ""
                            ).toLowerCase() ===
                            "published"
                          }
                        >
                          Publish Now
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>
    );
  };

  /* =======================================================
     QUEUE
  ======================================================= */

  const renderQueue = () => {
    const pendingCount =
      publishingQueue.filter(
        (item) =>
          String(item.status || "")
            .toLowerCase() === "pending"
      ).length;

    const publishedCount =
      publishingQueue.filter(
        (item) =>
          String(item.status || "")
            .toLowerCase() === "published"
      ).length;

    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Publishing Queue</h1>
            <p>
              Monitor posts waiting for publishing.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadPublishingQueue
            }
          >
            Refresh
          </button>
        </div>

        <div className="queue-summary">
          <div className="stat-card">
            <span>Total Queue Items</span>
            <strong>
              {publishingQueue.length}
            </strong>
          </div>

          <div className="stat-card">
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>

          <div className="stat-card">
            <span>Published</span>
            <strong>{publishedCount}</strong>
          </div>
        </div>

        <div className="table-container">
          {publishingQueue.length === 0 ? (
            <div className="empty-state">
              <h3>No queue items</h3>
              <p>
                The publishing queue is currently
                empty.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Queue ID</th>
                  <th>Post</th>
                  <th>Platform</th>
                  <th>Scheduled Time</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Retry Count</th>
                </tr>
              </thead>

              <tbody>
                {publishingQueue.map(
                  (item) => (
                    <tr
                      key={
                        item.queue_id ||
                        item.id
                      }
                    >
                      <td>
                        {item.queue_id ||
                          item.id}
                      </td>

                      <td>
                        {getPostContent(
                          item.post_id,
                          posts
                        )}
                      </td>

                      <td>
                        {item.platform || "-"}
                      </td>

                      <td>
                        {formatDateTime(
                          item.scheduled_time
                        )}
                      </td>

                      <td>
                        <span
                          className={getStatusClass(
                            item.status
                          )}
                        >
                          {item.status ||
                            "pending"}
                        </span>
                      </td>

                      <td>
                        {item.priority ?? 1}
                      </td>

                      <td>
                        {item.retry_count ?? 0}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    );
  };

  /* =======================================================
     PUBLISHING LOGS
  ======================================================= */

  const renderPublishingLogs = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Publishing Logs</h1>
            <p>
              Track publishing results and errors.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              loadPublishingLogs
            }
          >
            Refresh
          </button>
        </div>

        <div className="table-container">
          {publishingLogs.length === 0 ? (
            <div className="empty-state">
              <h3>No publishing logs</h3>
              <p>
                Publishing activity will appear here.
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Post ID</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Published At</th>
                  <th>Retry Count</th>
                  <th>Error</th>
                </tr>
              </thead>

              <tbody>
                {publishingLogs.map((log) => (
                  <tr
                    key={
                      log.log_id || log.id
                    }
                  >
                    <td>
                      {log.log_id || log.id}
                    </td>

                    <td>
                      {log.post_id || "-"}
                    </td>

                    <td>
                      {log.platform || "-"}
                    </td>

                    <td>
                      <span
                        className={getStatusClass(
                          log.status
                        )}
                      >
                        {log.status || "-"}
                      </span>
                    </td>

                    <td>
                      {formatDateTime(
                        log.published_at
                      )}
                    </td>

                    <td>
                      {log.retry_count ?? 0}
                    </td>

                    <td>
                      {log.error_message || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    );
  };

  /* =======================================================
     ANALYTICS
  ======================================================= */

  const renderAnalytics = () => {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <h1>Campaign Analytics</h1>
            <p>
              Analyze campaign engagement, audience
              growth and ROI.
            </p>
          </div>
        </div>

        <div className="form-card">
          <h3>Select Campaign</h3>

          <div className="form-row">
            <div className="form-group">
              <label>Campaign</label>

              <select
                value={selectedCampaign}
                onChange={(event) => {
                  setSelectedCampaign(
                    event.target.value
                  );

                  setCampaignAnalytics(null);
                  setAudienceAnalytics(null);
                  setExpenseAnalytics(null);
                }}
              >
                <option value="">
                  Select campaign
                </option>

                {campaigns.map((campaign) => (
                  <option
                    key={campaign.campaign_id}
                    value={
                      campaign.campaign_id
                    }
                  >
                    {campaign.campaign_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>&nbsp;</label>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  loadAnalytics(
                    selectedCampaign
                  )
                }
                disabled={
                  analyticsLoading ||
                  !selectedCampaign
                }
              >
                {analyticsLoading
                  ? "Loading..."
                  : "Load Analytics"}
              </button>
            </div>
          </div>
        </div>

        {!campaignAnalytics &&
        !audienceAnalytics &&
        !expenseAnalytics ? (
          <div className="empty-state">
            <h3>No analytics loaded</h3>
            <p>
              Select a campaign and click Load
              Analytics.
            </p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <span>Impressions</span>
                <strong>
                  {formatNumber(
                    campaignTotals.impressions
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Reach</span>
                <strong>
                  {formatNumber(
                    campaignTotals.reach
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Likes</span>
                <strong>
                  {formatNumber(
                    campaignTotals.likes
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Comments</span>
                <strong>
                  {formatNumber(
                    campaignTotals.comments
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Shares</span>
                <strong>
                  {formatNumber(
                    campaignTotals.shares
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Clicks</span>
                <strong>
                  {formatNumber(
                    campaignTotals.clicks
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Engagement</span>
                <strong>
                  {formatNumber(
                    campaignTotals.engagement
                  )}
                </strong>
              </div>

              <div className="stat-card">
                <span>Engagement Rate</span>
                <strong>
                  {formatPercent(
                    campaignTotals.engagementRate
                  )}
                </strong>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="content-card">
                <h3>Engagement Analytics</h3>

                <div
                  style={{
                    width: "100%",
                    height: 350,
                  }}
                >
                  <ResponsiveContainer>
                    <BarChart
                      data={
                        engagementChartData
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                      />

                      <XAxis dataKey="name" />

                      <YAxis />

                      <Tooltip />

                      <Legend />

                      <Bar
                        dataKey="value"
                        name="Engagement"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="content-card">
                <h3>
                  Engagement Distribution
                </h3>

                <div
                  style={{
                    width: "100%",
                    height: 350,
                  }}
                >
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={
                          engagementChartData
                        }
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label
                      >
                        {engagementChartData.map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                            />
                          )
                        )}
                      </Pie>

                      <Tooltip />

                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="content-card">
              <h3>Audience Growth</h3>

              {audienceRows.length === 0 ? (
                <div className="empty-state">
                  <p>
                    No audience growth data
                    available.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    style={{
                      width: "100%",
                      height: 350,
                    }}
                  >
                    <ResponsiveContainer>
                      <LineChart
                        data={
                          audienceChartData
                        }
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="platform"
                        />

                        <YAxis />

                        <Tooltip />

                        <Legend />

                        <Line
                          type="monotone"
                          dataKey="start"
                          name="Followers Start"
                        />

                        <Line
                          type="monotone"
                          dataKey="end"
                          name="Followers End"
                        />

                        <Line
                          type="monotone"
                          dataKey="growth"
                          name="Growth"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Platform</th>
                          <th>
                            Followers Start
                          </th>
                          <th>
                            Followers End
                          </th>
                          <th>Growth</th>
                          <th>Growth %</th>
                        </tr>
                      </thead>

                      <tbody>
                        {audienceRows.map(
                          (item, index) => {
                            const start =
                              numberValue(
                                item.followers_start ??
                                  item.followersStart ??
                                  item.start
                              );

                            const end =
                              numberValue(
                                item.followers_end ??
                                  item.followersEnd ??
                                  item.end
                              );

                            const growth =
                              numberValue(
                                item.follower_growth ??
                                  item.followers_growth ??
                                  item.followerGrowth ??
                                  item.growth
                              );

                            const percentage =
                              start > 0
                                ? (growth / start) *
                                  100
                                : 0;

                            return (
                              <tr
                                key={`${item.platform}-${index}`}
                              >
                                <td>
                                  {item.platform ||
                                    "-"}
                                </td>

                                <td>
                                  {formatNumber(
                                    start
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    end
                                  )}
                                </td>

                                <td>
                                  {formatNumber(
                                    growth
                                  )}
                                </td>

                                <td>
                                  {formatPercent(
                                    percentage
                                  )}
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="content-card">
              <h3>Campaign ROI</h3>

              {expenseData ? (
                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Budget</span>

                    <strong>
                      ₹
                      {formatNumber(
                        expenseData.budget
                      )}
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>Amount Spent</span>

                    <strong>
                      ₹
                      {formatNumber(
                        expenseData.amountSpent ??
                          expenseData.amount_spent
                      )}
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>
                      Revenue Generated
                    </span>

                    <strong>
                      ₹
                      {formatNumber(
                        expenseData.revenueGenerated ??
                          expenseData.revenue_generated
                      )}
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>Profit</span>

                    <strong>
                      ₹
                      {formatNumber(
                        expenseData.profit
                      )}
                    </strong>
                  </div>

                  <div className="stat-card">
                    <span>ROI</span>

                    <strong>
                      {formatPercent(
                        expenseData.roi
                      )}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>
                    No expense/ROI data
                    available.
                  </p>
                </div>
              )}
            </div>

            <div className="content-card">
              <h3>Platform Analytics</h3>

              {campaignAnalyticsRows.length ===
              0 ? (
                <div className="empty-state">
                  <p>
                    No platform analytics data
                    available.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Platform</th>
                        <th>Impressions</th>
                        <th>Reach</th>
                        <th>Likes</th>
                        <th>Comments</th>
                        <th>Shares</th>
                        <th>Clicks</th>
                        <th>
                          Engagement Rate
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {campaignAnalyticsRows.map(
                        (item, index) => (
                          <tr
                            key={`${item.platform}-${index}`}
                          >
                            <td>
                              {item.platform ||
                                "-"}
                            </td>

                            <td>
                              {formatNumber(
                                item.impressions
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.reach
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.likes
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.comments
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.shares
                              )}
                            </td>

                            <td>
                              {formatNumber(
                                item.clicks
                              )}
                            </td>

                            <td>
                              {formatPercent(
                                item.engagement_rate ??
                                  item.engagementRate
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    );
  };

  /* =======================================================
     MAIN PAGE ROUTER
  ======================================================= */

  const renderPage = () => {
    switch (page) {
      case "campaigns":
        return renderCampaigns();

      case "social":
        return renderSocialAccounts();

      case "posts":
        return renderPosts();

      case "calendar":
        return renderCalendar();

      case "scheduled":
        return renderScheduledPosts();

      case "queue":
        return renderQueue();

      case "logs":
        return renderPublishingLogs();

      case "analytics":
        return renderAnalytics();

      case "dashboard":
      default:
        return renderDashboard();
    }
  };

  /* =======================================================
     PAGE TITLE
  ======================================================= */

  const pageTitles = {
    dashboard: "Dashboard",
    campaigns: "Campaign Management",
    social: "Social Accounts",
    posts: "Posts",
    calendar: "Publishing Calendar",
    scheduled: "Scheduled Posts",
    queue: "Publishing Queue",
    logs: "Publishing Logs",
    analytics: "Campaign Analytics",
  };

  /* =======================================================
     MAIN APP
  ======================================================= */

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            SM
          </div>

          <div>
            <h2>Social Media</h2>

            <span>
              Management Platform
            </span>
          </div>
        </div>

        <nav>
          <button
            type="button"
            className={`nav-button ${
              page === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "campaigns"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("campaigns")
            }
          >
            📢 Campaigns
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "social"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("social")
            }
          >
            🔗 Social Accounts
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "posts"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("posts")
            }
          >
            📝 Posts
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "calendar"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("calendar")
            }
          >
            📅 Publishing Calendar
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "scheduled"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("scheduled")
            }
          >
            ⏰ Scheduled Posts
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "queue"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("queue")
            }
          >
            📋 Publishing Queue
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "logs"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("logs")
            }
          >
            📜 Publishing Logs
          </button>

          <button
            type="button"
            className={`nav-button ${
              page === "analytics"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setPage("analytics")
            }
          >
            📈 Analytics
          </button>
        </nav>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>
              {pageTitles[page] ||
                "Dashboard"}
            </h2>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadAllData}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>
        </header>

        {globalMessage && (
          <div className="global-message success-message">
            {globalMessage}
          </div>
        )}

        {errorMessage && (
          <div className="global-message error-message">
            {errorMessage}
          </div>
        )}

        {renderPage()}
      </main>
    </div>
  );
}