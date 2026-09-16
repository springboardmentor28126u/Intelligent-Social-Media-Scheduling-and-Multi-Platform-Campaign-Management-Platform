import React, { useEffect, useMemo, useState } from "react";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import "./App.css";

const API_BASE = "http://localhost:5000/api";

function App() {
  /* =====================================================
     AUTHENTICATION
  ===================================================== */

  const [token, setToken] = useState(
    localStorage.getItem("token") || ""
  );

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* =====================================================
     DATA
  ===================================================== */

  const [campaigns, setCampaigns] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [publishingQueue, setPublishingQueue] = useState([]);

  /* =====================================================
     CAMPAIGN FORM
  ===================================================== */

  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] =
    useState("");
  const [campaignStartDate, setCampaignStartDate] =
    useState("");
  const [campaignEndDate, setCampaignEndDate] = useState("");
  const [campaignStatus, setCampaignStatus] = useState("draft");
  const [editingCampaignId, setEditingCampaignId] =
    useState(null);

  /* =====================================================
     SOCIAL ACCOUNT FORM
  ===================================================== */

  const [accountPlatform, setAccountPlatform] =
    useState("Instagram");

  const [accountName, setAccountName] = useState("");
  const [editingAccountId, setEditingAccountId] =
    useState(null);

  /* =====================================================
     POST FORM
  ===================================================== */

  const [postCampaignId, setPostCampaignId] = useState("");
  const [postAccountId, setPostAccountId] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postMediaUrl, setPostMediaUrl] = useState("");
  const [postScheduledTime, setPostScheduledTime] =
    useState("");
  const [postStatus, setPostStatus] = useState("draft");
  const [editingPostId, setEditingPostId] = useState(null);

  /* =====================================================
     SCHEDULED POST FORM
  ===================================================== */

  const [schedulePostId, setSchedulePostId] = useState("");
  const [scheduleDateTime, setScheduleDateTime] =
    useState("");
  const [scheduleStatus, setScheduleStatus] =
    useState("pending");
  const [editingScheduleId, setEditingScheduleId] =
    useState(null);

  /* =====================================================
     SAFE ARRAYS
  ===================================================== */

  const safeCampaigns = Array.isArray(campaigns)
    ? campaigns
    : [];

  const safeSocialAccounts = Array.isArray(socialAccounts)
    ? socialAccounts
    : [];

  const safePosts = Array.isArray(posts)
    ? posts
    : [];

  const safeScheduledPosts = Array.isArray(scheduledPosts)
    ? scheduledPosts
    : [];

  const safePublishingQueue = Array.isArray(
    publishingQueue
  )
    ? publishingQueue
    : [];

  /* =====================================================
     HELPERS
  ===================================================== */

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const showMessage = (text) => {
    setMessage(text);
    setError("");

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const showError = (text) => {
    setError(text);
    setMessage("");

    setTimeout(() => {
      setError("");
    }, 5000);
  };

  const readResponse = async (response) => {
    const text = await response.text();

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        message: text,
      };
    }
  };

  const extractArray = (data, keys = []) => {
    if (Array.isArray(data)) {
      return data;
    }

    if (!data || typeof data !== "object") {
      return [];
    }

    for (const key of keys) {
      if (Array.isArray(data[key])) {
        return data[key];
      }
    }

    if (Array.isArray(data.rows)) {
      return data.rows;
    }

    return [];
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    try {
      return new Date(date).toLocaleString();
    } catch {
      return date;
    }
  };

  const getStatusClass = (status) => {
    return `status-badge status-${String(
      status || "unknown"
    ).toLowerCase()}`;
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoginError("");
    setLoading(true);

    try {
      console.log("LOGIN EMAIL:", email);
      console.log("LOGIN PASSWORD:", password);
      const response = await fetch(
        `${API_BASE}/users/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );


      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      if (!data.token) {
        throw new Error(
          "Token was not returned by the server"
        );
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);

      setEmail("");
      setPassword("");

      showMessage("Login successful");
    } catch (err) {
      console.error("Login error:", err);

      setLoginError(
        err.message || "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     LOGOUT
  ===================================================== */

  const handleLogout = () => {
    localStorage.removeItem("token");

    setToken("");

    setCampaigns([]);
    setSocialAccounts([]);
    setPosts([]);
    setScheduledPosts([]);
    setPublishingQueue([]);

    setCurrentPage("dashboard");

    setMessage("");
    setError("");
  };

  /* =====================================================
     FETCH CAMPAIGNS
  ===================================================== */

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/campaigns`,
        {
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch campaigns"
        );
      }

      setCampaigns(
        extractArray(data, [
          "campaigns",
          "data",
        ])
      );
    } catch (err) {
      console.error(
        "Campaign fetch error:",
        err
      );

      showError(err.message);
      setCampaigns([]);
    }
  };

  /* =====================================================
     FETCH SOCIAL ACCOUNTS
  ===================================================== */

  const fetchSocialAccounts = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/social-accounts`,
        {
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch social accounts"
        );
      }

      setSocialAccounts(
        extractArray(data, [
          "socialAccounts",
          "social_accounts",
          "accounts",
          "data",
        ])
      );
    } catch (err) {
      console.error(
        "Social account fetch error:",
        err
      );

      showError(err.message);
      setSocialAccounts([]);
    }
  };

  /* =====================================================
     FETCH POSTS
  ===================================================== */

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/posts`,
        {
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch posts"
        );
      }

      setPosts(
        extractArray(data, [
          "posts",
          "data",
        ])
      );
    } catch (err) {
      console.error(
        "Post fetch error:",
        err
      );

      showError(err.message);
      setPosts([]);
    }
  };

  /* =====================================================
     FETCH SCHEDULED POSTS
  ===================================================== */

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/scheduled-posts`,
        {
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch scheduled posts"
        );
      }

      const result = extractArray(data, [
        "scheduledPosts",
        "scheduled_posts",
        "schedules",
        "data",
      ]);

      setScheduledPosts(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(
        "Scheduled posts fetch error:",
        err
      );

      showError(err.message);
      setScheduledPosts([]);
    }
  };

  /* =====================================================
     FETCH PUBLISHING QUEUE
  ===================================================== */

  const fetchPublishingQueue = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/queue`,
        {
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch publishing queue"
        );
      }

      const result = extractArray(data, [
        "queue",
        "queues",
        "publishingQueue",
        "publishing_queue",
        "data",
      ]);

      setPublishingQueue(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(
        "Publishing queue fetch error:",
        err
      );

      /*
        Do not show an error every time if the
        queue endpoint is not available yet.
      */

      setPublishingQueue([]);
    }
  };

  /* =====================================================
     FETCH ALL
  ===================================================== */

  const fetchAllData = async () => {
    if (!token) return;

    setLoading(true);

    try {
      await Promise.all([
        fetchCampaigns(),
        fetchSocialAccounts(),
        fetchPosts(),
        fetchScheduledPosts(),
        fetchPublishingQueue(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  /* =====================================================
     CAMPAIGN FORM
  ===================================================== */

  const resetCampaignForm = () => {
    setCampaignName("");
    setCampaignDescription("");
    setCampaignStartDate("");
    setCampaignEndDate("");
    setCampaignStatus("draft");
    setEditingCampaignId(null);
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();

    /*
      IMPORTANT:
      Backend expects campaign_name,
      not name.
    */

    const trimmedName = campaignName.trim();

    if (!trimmedName) {
      showError("Campaign name is required");
      return;
    }

    if (!campaignStartDate) {
      showError("Campaign start date is required");
      return;
    }

    if (!campaignEndDate) {
      showError("Campaign end date is required");
      return;
    }

    if (
      new Date(campaignEndDate) <
      new Date(campaignStartDate)
    ) {
      showError(
        "End date cannot be before start date"
      );
      return;
    }

    try {
      const payload = {
        campaign_name: trimmedName,
        description: campaignDescription.trim(),
        start_date: campaignStartDate,
        end_date: campaignEndDate,
        status: campaignStatus,
      };

      console.log(
        "Campaign request payload:",
        payload
      );

      const url = editingCampaignId
        ? `${API_BASE}/campaigns/${editingCampaignId}`
        : `${API_BASE}/campaigns`;

      const method = editingCampaignId
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Campaign operation failed"
        );
      }

      showMessage(
        editingCampaignId
          ? "Campaign updated successfully"
          : "Campaign created successfully"
      );

      resetCampaignForm();

      await fetchCampaigns();
    } catch (err) {
      console.error(
        "Campaign submit error:",
        err
      );

      showError(err.message);
    }
  };

  const editCampaign = (campaign) => {
    setEditingCampaignId(
      campaign.campaign_id
    );

    setCampaignName(
      campaign.campaign_name ||
        campaign.name ||
        ""
    );

    setCampaignDescription(
      campaign.description || ""
    );

    setCampaignStartDate(
      campaign.start_date
        ? String(
            campaign.start_date
          ).substring(0, 10)
        : ""
    );

    setCampaignEndDate(
      campaign.end_date
        ? String(
            campaign.end_date
          ).substring(0, 10)
        : ""
    );

    setCampaignStatus(
      campaign.status || "draft"
    );

    setCurrentPage("campaigns");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteCampaign = async (id) => {
    if (
      !window.confirm(
        "Delete this campaign?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/campaigns/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete campaign"
        );
      }

      showMessage(
        "Campaign deleted successfully"
      );

      await fetchAllData();
    } catch (err) {
      console.error(
        "Delete campaign error:",
        err
      );

      showError(err.message);
    }
  };

  const publishCampaign = async (campaign) => {
    try {
      const response = await fetch(
        `${API_BASE}/campaigns/${campaign.campaign_id}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            campaign_name:
              campaign.campaign_name ||
              campaign.name ||
              "",
            description:
              campaign.description || "",
            start_date:
              campaign.start_date,
            end_date:
              campaign.end_date,
            status: "active",
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to publish campaign"
        );
      }

      showMessage(
        "Campaign activated successfully"
      );

      await fetchCampaigns();
    } catch (err) {
      showError(err.message);
    }
  };

  /* =====================================================
     SOCIAL ACCOUNTS
  ===================================================== */

  const resetAccountForm = () => {
    setAccountPlatform("Instagram");
    setAccountName("");
    setEditingAccountId(null);
  };

  const handleAccountSubmit = async (e) => {
    e.preventDefault();

    /*
      IMPORTANT:
      Backend error says:

      "Platform and username are required"

      Therefore send username,
      NOT account_name.
    */

    const trimmedUsername = accountName.trim();

    if (!accountPlatform) {
      showError("Platform is required");
      return;
    }

    if (!trimmedUsername) {
      showError("Username is required");
      return;
    }

    try {
      const payload = {
        platform: accountPlatform,
        username: trimmedUsername,
      };

      console.log(
        "Social account request payload:",
        payload
      );

      const url = editingAccountId
        ? `${API_BASE}/social-accounts/${editingAccountId}`
        : `${API_BASE}/social-accounts`;

      const method = editingAccountId
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Social account operation failed"
        );
      }

      showMessage(
        editingAccountId
          ? "Social account updated successfully"
          : "Social account created successfully"
      );

      resetAccountForm();

      await fetchSocialAccounts();
    } catch (err) {
      console.error(
        "Account submit error:",
        err
      );

      showError(err.message);
    }
  };

  const editAccount = (account) => {
    setEditingAccountId(
      account.account_id
    );

    setAccountPlatform(
      account.platform || "Instagram"
    );

    setAccountName(
      account.username ||
        account.account_name ||
        account.accountName ||
        ""
    );

    setCurrentPage("social-accounts");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteAccount = async (id) => {
    if (
      !window.confirm(
        "Delete this social account?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/social-accounts/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete social account"
        );
      }

      showMessage(
        "Social account deleted successfully"
      );

      await fetchAllData();
    } catch (err) {
      console.error(
        "Delete account error:",
        err
      );

      showError(err.message);
    }
  };

  const activateAccount = async (account) => {
    try {
      const response = await fetch(
        `${API_BASE}/social-accounts/${account.account_id}`,
        {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            platform:
              account.platform,
            username:
              account.username ||
              account.account_name ||
              account.accountName ||
              "",
            status: "connected",
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to activate account"
        );
      }

      showMessage(
        "Social account activated"
      );

      await fetchSocialAccounts();
    } catch (err) {
      showError(err.message);
    }
  };

  /* =====================================================
     POSTS
  ===================================================== */

  const resetPostForm = () => {
    setPostCampaignId("");
    setPostAccountId("");
    setPostContent("");
    setPostMediaUrl("");
    setPostScheduledTime("");
    setPostStatus("draft");
    setEditingPostId(null);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();

    if (!postCampaignId) {
      showError("Please select a campaign");
      return;
    }

    if (!postAccountId) {
      showError("Please select a social account");
      return;
    }

    if (!postContent.trim()) {
      showError("Post content is required");
      return;
    }

    try {
      const payload = {
        campaign_id: Number(
          postCampaignId
        ),

        account_id: Number(
          postAccountId
        ),

        content: postContent.trim(),

        media_url:
          postMediaUrl.trim() || null,

        scheduled_time:
          postScheduledTime || null,

        status: postStatus,
      };

      console.log(
        "Post request payload:",
        payload
      );

      const url = editingPostId
        ? `${API_BASE}/posts/${editingPostId}`
        : `${API_BASE}/posts`;

      const method = editingPostId
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Post operation failed"
        );
      }

      showMessage(
        editingPostId
          ? "Post updated successfully"
          : "Post created successfully"
      );

      resetPostForm();

      await fetchPosts();
      await fetchScheduledPosts();
      await fetchPublishingQueue();
    } catch (err) {
      console.error(
        "Post submit error:",
        err
      );

      showError(err.message);
    }
  };

  const editPost = (post) => {
    setEditingPostId(post.post_id);

    setPostCampaignId(
      post.campaign_id
        ? String(post.campaign_id)
        : ""
    );

    setPostAccountId(
      post.account_id
        ? String(post.account_id)
        : ""
    );

    setPostContent(
      post.content || ""
    );

    setPostMediaUrl(
      post.media_url || ""
    );

    setPostScheduledTime(
      post.scheduled_time
        ? String(
            post.scheduled_time
          ).substring(0, 16)
        : ""
    );

    setPostStatus(
      post.status || "draft"
    );

    setCurrentPage("posts");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =====================================================
     DELETE POST
  ===================================================== */

  const deletePost = async (id) => {
    if (
      !window.confirm(
        "Delete this post?\n\nAny schedules linked to this post will also be removed first."
      )
    ) {
      return;
    }

    try {
      /*
        STEP 1:
        Find all schedules belonging to this post.
      */

      const relatedSchedules =
        safeScheduledPosts.filter(
          (schedule) =>
            Number(schedule.post_id) ===
            Number(id)
        );

      /*
        STEP 2:
        Delete related schedules first.

        This prevents a common PostgreSQL
        foreign-key error.
      */

      for (const schedule of relatedSchedules) {
        const scheduleResponse =
          await fetch(
            `${API_BASE}/scheduled-posts/${schedule.schedule_id}`,
            {
              method: "DELETE",
              headers: getHeaders(),
            }
          );

        const scheduleData =
          await readResponse(
            scheduleResponse
          );

        if (!scheduleResponse.ok) {
          throw new Error(
            scheduleData.message ||
              `Could not delete schedule #${schedule.schedule_id}`
          );
        }
      }

      /*
        STEP 3:
        Delete the actual post.
      */

      const response = await fetch(
        `${API_BASE}/posts/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete post"
        );
      }

      showMessage(
        "Post deleted successfully"
      );

      await fetchPosts();
      await fetchScheduledPosts();
      await fetchPublishingQueue();
    } catch (err) {
      console.error(
        "Delete post error:",
        err
      );

      /*
        Give a useful explanation for
        PostgreSQL foreign-key errors.
      */

      const messageText =
        String(err.message || "");

      if (
        messageText
          .toLowerCase()
          .includes("foreign key")
      ) {
        showError(
          "Post cannot be deleted because another publishing record still references it. Delete the related queue record or update the backend DELETE route to use CASCADE."
        );
      } else {
        showError(messageText);
      }
    }
  };

  /* =====================================================
     PUBLISH POST
  ===================================================== */

  const publishPost = async (post) => {
    try {
      if (!post.account_id) {
        showError(
          "This post has no social account."
        );
        return;
      }

      const response = await fetch(
        `${API_BASE}/posts/${post.post_id}/publish`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            account_id:
              Number(post.account_id),
          }),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to publish post"
        );
      }

      showMessage(
        "Post published successfully"
      );

      await fetchPosts();
      await fetchScheduledPosts();
      await fetchPublishingQueue();
    } catch (err) {
      showError(
        `${err.message}. Make sure the publish API exists in the backend.`
      );
    }
  };

  /* =====================================================
     SCHEDULED POSTS
  ===================================================== */

  const resetScheduleForm = () => {
    setSchedulePostId("");
    setScheduleDateTime("");
    setScheduleStatus("pending");
    setEditingScheduleId(null);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();

    if (!schedulePostId) {
      showError("Please select a post");
      return;
    }

    if (!scheduleDateTime) {
      showError(
        "Please select date and time"
      );
      return;
    }

    try {
      const payload = {
        post_id: Number(
          schedulePostId
        ),

        scheduled_at:
          scheduleDateTime,

        status:
          scheduleStatus,
      };

      const url = editingScheduleId
        ? `${API_BASE}/scheduled-posts/${editingScheduleId}`
        : `${API_BASE}/scheduled-posts`;

      const method = editingScheduleId
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Schedule operation failed"
        );
      }

      showMessage(
        editingScheduleId
          ? "Schedule updated successfully"
          : "Post scheduled successfully"
      );

      resetScheduleForm();

      await fetchScheduledPosts();
      await fetchPosts();
      await fetchPublishingQueue();
    } catch (err) {
      showError(err.message);
    }
  };

  const editSchedule = (schedule) => {
    setEditingScheduleId(
      schedule.schedule_id
    );

    setSchedulePostId(
      schedule.post_id
        ? String(schedule.post_id)
        : ""
    );

    setScheduleDateTime(
      schedule.scheduled_at
        ? String(
            schedule.scheduled_at
          ).substring(0, 16)
        : ""
    );

    setScheduleStatus(
      schedule.status || "pending"
    );

    setCurrentPage("scheduled-posts");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const deleteSchedule = async (id) => {
    if (
      !window.confirm(
        "Delete this scheduled post?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}/scheduled-posts/${id}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete scheduled post"
        );
      }

      showMessage(
        "Scheduled post deleted successfully"
      );

      await fetchScheduledPosts();
      await fetchPublishingQueue();
    } catch (err) {
      showError(err.message);
    }
  };

  const publishSchedule = async (schedule) => {
    try {
      const response = await fetch(
        `${API_BASE}/scheduled-posts/${schedule.schedule_id}/publish`,
        {
          method: "POST",
          headers: getHeaders(),
        }
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to publish scheduled post"
        );
      }

      showMessage(
        "Scheduled post published successfully"
      );

      await fetchScheduledPosts();
      await fetchPosts();
      await fetchPublishingQueue();
    } catch (err) {
      showError(
        `${err.message}. Make sure the scheduled publish API exists in the backend.`
      );
    }
  };

  /* =====================================================
     CALENDAR
  ===================================================== */

  const calendarEvents = useMemo(() => {
    const events = [];

    safeScheduledPosts.forEach(
      (schedule) => {
        const post = safePosts.find(
          (p) =>
            Number(p.post_id) ===
            Number(schedule.post_id)
        );

        const account = post
          ? safeSocialAccounts.find(
              (a) =>
                Number(a.account_id) ===
                Number(post.account_id)
            )
          : null;

        events.push({
          id: `schedule-${schedule.schedule_id}`,

          title: post
            ? `${
                account?.platform ||
                "Post"
              }: ${
                post.content?.substring(
                  0,
                  35
                ) ||
                `Post #${post.post_id}`
              }`
            : `Scheduled Post #${schedule.schedule_id}`,

          start: schedule.scheduled_at,

          extendedProps: {
            type: "scheduled",

            postId:
              schedule.post_id,

            scheduleId:
              schedule.schedule_id,

            status:
              schedule.status,

            content: post
              ? post.content
              : "",

            platform:
              account?.platform ||
              "Unknown",

            accountName:
              account?.username ||
              account?.account_name ||
              account?.accountName ||
              "",
          },
        });
      }
    );

    safePublishingQueue.forEach(
      (queue) => {
        const post = safePosts.find(
          (p) =>
            Number(p.post_id) ===
            Number(queue.post_id)
        );

        const account = post
          ? safeSocialAccounts.find(
              (a) =>
                Number(a.account_id) ===
                Number(post.account_id)
            )
          : null;

        const alreadyScheduled =
          safeScheduledPosts.some(
            (schedule) =>
              Number(schedule.post_id) ===
                Number(queue.post_id) &&
              schedule.scheduled_at &&
              queue.scheduled_time &&
              new Date(
                schedule.scheduled_at
              ).getTime() ===
                new Date(
                  queue.scheduled_time
                ).getTime()
          );

        if (alreadyScheduled) {
          return;
        }

        events.push({
          id: `queue-${queue.queue_id}`,

          title: post
            ? `Queue - ${
                account?.platform ||
                queue.platform ||
                "Post"
              }: ${
                post.content?.substring(
                  0,
                  35
                ) ||
                `Post #${post.post_id}`
              }`
            : `Queue #${queue.queue_id}`,

          start:
            queue.scheduled_time,

          extendedProps: {
            type: "queue",

            queueId:
              queue.queue_id,

            postId:
              queue.post_id,

            status:
              queue.status,

            content: post
              ? post.content
              : "",

            platform:
              queue.platform ||
              account?.platform ||
              "Unknown",

            accountName:
              account?.username ||
              account?.account_name ||
              account?.accountName ||
              "",

            retryCount:
              queue.retry_count || 0,
          },
        });
      }
    );

    return events;
  }, [
    safeScheduledPosts,
    safePublishingQueue,
    safePosts,
    safeSocialAccounts,
  ]);

  /* =====================================================
     CALENDAR EVENT CLICK
  ===================================================== */

  const handleCalendarEventClick = (
    info
  ) => {
    const event = info.event;
    const props = event.extendedProps;

    let details = "";

    if (props.type === "scheduled") {
      details =
        `Scheduled Post\n\n` +
        `Schedule ID: ${props.scheduleId}\n` +
        `Post ID: ${props.postId}\n` +
        `Platform: ${props.platform}\n` +
        `Status: ${props.status}\n` +
        `Content: ${
          props.content || "N/A"
        }\n` +
        `Date: ${
          event.start
            ? event.start.toLocaleString()
            : "N/A"
        }`;
    } else {
      details =
        `Publishing Queue\n\n` +
        `Queue ID: ${props.queueId}\n` +
        `Post ID: ${props.postId}\n` +
        `Platform: ${props.platform}\n` +
        `Status: ${props.status}\n` +
        `Retry Count: ${props.retryCount}\n` +
        `Content: ${
          props.content || "N/A"
        }\n` +
        `Date: ${
          event.start
            ? event.start.toLocaleString()
            : "N/A"
        }`;
    }

    alert(details);
  };

  /* =====================================================
     CALENDAR DATE CLICK
  ===================================================== */

  const handleDateClick = (info) => {
    setCurrentPage(
      "scheduled-posts"
    );

    setScheduleDateTime(
      `${info.dateStr}T09:00`
    );

    setSchedulePostId("");

    setScheduleStatus("pending");

    setEditingScheduleId(null);
  };

  /* =====================================================
     DASHBOARD STATISTICS
  ===================================================== */

  const activeCampaigns =
    safeCampaigns.filter(
      (campaign) =>
        campaign.status === "active"
    ).length;

  const draftPosts =
    safePosts.filter(
      (post) =>
        post.status === "draft"
    ).length;

  const publishedPosts =
    safePosts.filter(
      (post) =>
        post.status === "published"
    ).length;

  const pendingSchedules =
    safeScheduledPosts.filter(
      (schedule) =>
        schedule.status === "pending"
    ).length;

  const pendingQueuePosts =
    safePublishingQueue.filter(
      (queue) =>
        queue.status === "pending" ||
        queue.status === "processing"
    ).length;

  const failedQueuePosts =
    safePublishingQueue.filter(
      (queue) =>
        queue.status === "failed"
    ).length;

  const publishedQueuePosts =
    safePublishingQueue.filter(
      (queue) =>
        queue.status === "published"
    ).length;

  /* =====================================================
     LOGIN SCREEN
  ===================================================== */

  if (!token) {
    return (
      <div className="login-container">
        <div className="login-glow glow-one"></div>
        <div className="login-glow glow-two"></div>

        <div className="login-card">
          <div className="brand-mark">
            ✦
          </div>

          <span className="login-label">
            CONTENT OPERATIONS
          </span>

          <h1>
            Social Media
            <br />
            Management
          </h1>

          <p>
            Schedule, manage and publish
            content across multiple
            social platforms.
          </p>

          <form onSubmit={handleLogin}>
            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : "Sign in →"}
            </button>
          </form>

          {loginError && (
            <div className="login-error">
              {loginError}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* =====================================================
     MAIN APPLICATION
  ===================================================== */

  return (
    <div className="app-container">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className="sidebar">

        <div className="sidebar-brand">

          <div className="brand-icon">
            ✦
          </div>

          <div>
            <strong>
              SocialFlow
            </strong>

            <span>
              Content Platform
            </span>
          </div>

        </div>

        <div className="sidebar-section">
          <span>
            WORKSPACE
          </span>
        </div>

        <button
          className={
            currentPage === "dashboard"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setCurrentPage("dashboard")
          }
        >
          <span>⌂</span>
          Dashboard
        </button>

        <button
          className={
            currentPage === "calendar"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setCurrentPage("calendar")
          }
        >
          <span>◷</span>
          Publishing Calendar
        </button>

        <button
          className={
            currentPage === "campaigns"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setCurrentPage("campaigns")
          }
        >
          <span>▣</span>
          Campaigns
        </button>

        <button
          className={
            currentPage ===
            "social-accounts"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setCurrentPage(
              "social-accounts"
            )
          }
        >
          <span>◎</span>
          Social Accounts
        </button>

        <button
          className={
            currentPage === "posts"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setCurrentPage("posts")
          }
        >
          <span>✎</span>
          Posts
        </button>

        <button
          className={
            currentPage ===
            "scheduled-posts"
              ? "nav-button active"
              : "nav-button"
          }
          onClick={() =>
            setCurrentPage(
              "scheduled-posts"
            )
          }
        >
          <span>⌁</span>
          Scheduled Posts
        </button>

        <div className="sidebar-bottom">

          <div className="milestone-box">

            <span>
              PROJECT PROGRESS
            </span>

            <strong>
              Milestone 1 + 2
            </strong>

            <small>
              Content scheduling & publishing
            </small>

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>

        </div>

      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="main-content">

        <header className="topbar">

          <div>

            <span className="topbar-kicker">
              SOCIAL MEDIA OPERATIONS
            </span>

            <h2>
              {currentPage === "dashboard"
                ? "Overview"
                : currentPage === "calendar"
                ? "Publishing Calendar"
                : currentPage === "campaigns"
                ? "Campaign Management"
                : currentPage ===
                  "social-accounts"
                ? "Social Accounts"
                : currentPage === "posts"
                ? "Content Management"
                : "Publishing Queue"}
            </h2>

          </div>

          <button
            className="refresh-button"
            onClick={fetchAllData}
          >
            ↻ Refresh
          </button>

        </header>

        {message && (
          <div className="success-message">
            <span>✓</span>
            {message}
          </div>
        )}

        {error && (
          <div className="error-message">
            <span>!</span>
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-bar">
            Loading workspace...
          </div>
        )}

        {/* =================================================
            DASHBOARD
        ================================================= */}

        {currentPage === "dashboard" && (
          <section className="dashboard-page">

            <div className="dashboard-hero">

              <div className="hero-content">

                <span className="hero-label">
                  ✦ CONTENT OPERATIONS
                </span>

                <h1>
                  Plan.
                  <br />
                  Publish.
                  <br />
                  Grow.
                </h1>

                <p>
                  Manage campaigns, schedule
                  content, and publish across
                  multiple social platforms
                  from one workspace.
                </p>

                <div className="hero-actions">

                  <button
                    onClick={() =>
                      setCurrentPage("posts")
                    }
                  >
                    ＋ Create Post
                  </button>

                  <button
                    className="secondary-action"
                    onClick={() =>
                      setCurrentPage(
                        "calendar"
                      )
                    }
                  >
                    ◷ View Calendar
                  </button>

                </div>

              </div>

              <div
                className="hero-visual"
                aria-hidden="true"
              >

                <div className="orb orb-one"></div>
                <div className="orb orb-two"></div>
                <div className="orb orb-three"></div>

                <div className="floating-card card-one">

                  <span>
                    POSTS
                  </span>

                  <strong>
                    {safePosts.length}
                  </strong>

                </div>

                <div className="floating-card card-two">

                  <span>
                    QUEUED
                  </span>

                  <strong>
                    {pendingQueuePosts}
                  </strong>

                </div>

                <div className="hero-ring">
                  ✦
                </div>

              </div>

            </div>

            <div className="dashboard-cards">

              <div className="dashboard-card campaign-card">

                <div className="card-top">

                  <div className="card-icon">
                    ▣
                  </div>

                  <span className="card-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Campaigns
                </h3>

                <p>
                  {safeCampaigns.length}
                </p>

                <small>
                  {activeCampaigns} active campaigns
                </small>

              </div>

              <div className="dashboard-card account-card">

                <div className="card-top">

                  <div className="card-icon">
                    ◎
                  </div>

                  <span className="card-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Social Accounts
                </h3>

                <p>
                  {safeSocialAccounts.length}
                </p>

                <small>
                  Connected platforms
                </small>

              </div>

              <div className="dashboard-card post-card">

                <div className="card-top">

                  <div className="card-icon">
                    ✎
                  </div>

                  <span className="card-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Total Posts
                </h3>

                <p>
                  {safePosts.length}
                </p>

                <small>
                  {publishedPosts} published ·{" "}
                  {draftPosts} drafts
                </small>

              </div>

              <div className="dashboard-card schedule-card">

                <div className="card-top">

                  <div className="card-icon">
                    ◷
                  </div>

                  <span className="card-arrow">
                    →
                  </span>

                </div>

                <h3>
                  Scheduled
                </h3>

                <p>
                  {safeScheduledPosts.length}
                </p>

                <small>
                  {pendingSchedules} waiting to publish
                </small>

              </div>

            </div>

            <div className="dashboard-grid">

              <div className="dashboard-panel workflow-panel">

                <div className="panel-heading">

                  <div>

                    <span className="panel-kicker">
                      WORKFLOW
                    </span>

                    <h2>
                      Publishing workflow
                    </h2>

                  </div>

                  <span className="panel-symbol">
                    ⌁
                  </span>

                </div>

                <div className="workflow-steps">

                  <button
                    onClick={() =>
                      setCurrentPage(
                        "campaigns"
                      )
                    }
                  >

                    <span className="step-number">
                      01
                    </span>

                    <span className="step-icon">
                      ▣
                    </span>

                    <div>

                      <strong>
                        Create campaign
                      </strong>

                      <small>
                        Organize your content goals
                      </small>

                    </div>

                    <span className="step-arrow">
                      →
                    </span>

                  </button>

                  <button
                    onClick={() =>
                      setCurrentPage("posts")
                    }
                  >

                    <span className="step-number">
                      02
                    </span>

                    <span className="step-icon">
                      ✎
                    </span>

                    <div>

                      <strong>
                        Prepare content
                      </strong>

                      <small>
                        Write, edit and save drafts
                      </small>

                    </div>

                    <span className="step-arrow">
                      →
                    </span>

                  </button>

                  <button
                    onClick={() =>
                      setCurrentPage(
                        "scheduled-posts"
                      )
                    }
                  >

                    <span className="step-number">
                      03
                    </span>

                    <span className="step-icon">
                      ◷
                    </span>

                    <div>

                      <strong>
                        Schedule publishing
                      </strong>

                      <small>
                        Choose date and time
                      </small>

                    </div>

                    <span className="step-arrow">
                      →
                    </span>

                  </button>

                  <button
                    onClick={() =>
                      setCurrentPage(
                        "social-accounts"
                      )
                    }
                  >

                    <span className="step-number">
                      04
                    </span>

                    <span className="step-icon">
                      ◎
                    </span>

                    <div>

                      <strong>
                        Connect platforms
                      </strong>

                      <small>
                        Manage publishing destinations
                      </small>

                    </div>

                    <span className="step-arrow">
                      →
                    </span>

                  </button>

                </div>

              </div>

              <div className="dashboard-panel status-panel">

                <div className="panel-heading">

                  <div>

                    <span className="panel-kicker">
                      SYSTEM STATUS
                    </span>

                    <h2>
                      Publishing health
                    </h2>

                  </div>

                  <span className="health-indicator">
                    ●
                  </span>

                </div>

                <div className="health-summary">

                  <div>

                    <strong>
                      Operational
                    </strong>

                    <span>
                      Workspace is ready
                    </span>

                  </div>

                </div>

                <div className="status-row">

                  <span>
                    Connected accounts
                  </span>

                  <strong>
                    {safeSocialAccounts.length}
                  </strong>

                </div>

                <div className="status-row">

                  <span>
                    Queued posts
                  </span>

                  <strong>
                    {pendingQueuePosts}
                  </strong>

                </div>

                <div className="status-row">

                  <span>
                    Failed queue items
                  </span>

                  <strong>
                    {failedQueuePosts}
                  </strong>

                </div>

                <div className="status-row">

                  <span>
                    Draft content
                  </span>

                  <strong>
                    {draftPosts}
                  </strong>

                </div>

                <div className="status-row">

                  <span>
                    Published content
                  </span>

                  <strong>
                    {publishedPosts}
                  </strong>

                </div>

                <button
                  className="panel-link"
                  onClick={() =>
                    setCurrentPage(
                      "scheduled-posts"
                    )
                  }
                >
                  Manage publishing queue →
                </button>

              </div>

            </div>

            <div className="calendar-section dashboard-calendar">

              <div className="panel-heading">

                <div>

                  <span className="panel-kicker">
                    CONTENT PLANNER
                  </span>

                  <h2>
                    Publishing calendar
                  </h2>

                </div>

                <button
                  className="panel-link"
                  onClick={() =>
                    setCurrentPage("calendar")
                  }
                >
                  Open full calendar →
                </button>

              </div>

              <FullCalendar
                plugins={[
                  dayGridPlugin,
                  interactionPlugin,
                ]}
                initialView="dayGridMonth"
                events={calendarEvents}
                dateClick={handleDateClick}
                eventClick={
                  handleCalendarEventClick
                }
                height="600px"
              />

            </div>

          </section>
        )}

        {/* =================================================
            FULL CALENDAR
        ================================================= */}

        {currentPage === "calendar" && (
          <section className="page-section">

            <div className="page-heading">

              <div>

                <span className="panel-kicker">
                  MILESTONE 2
                </span>

                <h1>
                  Publishing Calendar
                </h1>

                <p>
                  View and manage all scheduled
                  content from one calendar.
                </p>

              </div>

              <button
                className="primary-button"
                onClick={() =>
                  setCurrentPage(
                    "scheduled-posts"
                  )
                }
              >
                ＋ Schedule Post
              </button>

            </div>

            <div className="calendar-section full-calendar">

              <FullCalendar
                plugins={[
                  dayGridPlugin,
                  interactionPlugin,
                ]}
                initialView="dayGridMonth"
                events={calendarEvents}
                dateClick={handleDateClick}
                eventClick={
                  handleCalendarEventClick
                }
                height="720px"
              />

            </div>

          </section>
        )}

        {/* =================================================
            CAMPAIGNS
        ================================================= */}

        {currentPage === "campaigns" && (
          <section className="page-section">

            <div className="page-heading">

              <div>

                <span className="panel-kicker">
                  MILESTONE 1
                </span>

                <h1>
                  Campaign Management
                </h1>

                <p>
                  Create and manage your marketing
                  campaigns.
                </p>

              </div>

            </div>

            <div className="form-card">

              <div className="form-heading">

                <div className="form-icon">
                  ▣
                </div>

                <div>

                  <span>
                    CAMPAIGN
                  </span>

                  <h2>
                    {editingCampaignId
                      ? "Edit Campaign"
                      : "Create Campaign"}
                  </h2>

                </div>

              </div>

              <form
                onSubmit={
                  handleCampaignSubmit
                }
              >

                <label>
                  Campaign Name
                </label>

                <input
                  type="text"
                  placeholder="Enter campaign name"
                  value={campaignName}
                  onChange={(e) =>
                    setCampaignName(
                      e.target.value
                    )
                  }
                  required
                />

                <label>
                  Description
                </label>

                <textarea
                  placeholder="Describe your campaign"
                  value={
                    campaignDescription
                  }
                  onChange={(e) =>
                    setCampaignDescription(
                      e.target.value
                    )
                  }
                />

                <div className="form-row">

                  <div>

                    <label>
                      Start Date
                    </label>

                    <input
                      type="date"
                      value={
                        campaignStartDate
                      }
                      onChange={(e) =>
                        setCampaignStartDate(
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                  <div>

                    <label>
                      End Date
                    </label>

                    <input
                      type="date"
                      value={
                        campaignEndDate
                      }
                      onChange={(e) =>
                        setCampaignEndDate(
                          e.target.value
                        )
                      }
                      required
                    />

                  </div>

                </div>

                <label>
                  Status
                </label>

                <select
                  value={
                    campaignStatus
                  }
                  onChange={(e) =>
                    setCampaignStatus(
                      e.target.value
                    )
                  }
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

                <div className="form-actions">

                  <button
                    className="primary-button"
                    type="submit"
                  >
                    {editingCampaignId
                      ? "Update Campaign"
                      : "Create Campaign"}
                  </button>

                  {editingCampaignId && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={
                        resetCampaignForm
                      }
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

            </div>

            <div className="list-section">

              <div className="list-heading">

                <div>

                  <span className="panel-kicker">
                    CAMPAIGNS
                  </span>

                  <h2>
                    Campaign List
                  </h2>

                </div>

                <span className="count-badge">
                  {safeCampaigns.length}
                </span>

              </div>

              {safeCampaigns.length === 0 ? (

                <div className="empty-state">

                  <div>
                    ▣
                  </div>

                  <h3>
                    No campaigns found
                  </h3>

                  <p>
                    Create your first campaign
                    above.
                  </p>

                </div>

              ) : (

                <div className="data-grid">

                  {safeCampaigns.map(
                    (campaign) => {

                      const displayName =
                        campaign.campaign_name ||
                        campaign.name ||
                        "Unnamed Campaign";

                      return (
                        <div
                          className="data-card"
                          key={
                            campaign.campaign_id
                          }
                        >

                          <div className="data-card-top">

                            <div className="mini-icon">
                              ▣
                            </div>

                            <span
                              className={getStatusClass(
                                campaign.status
                              )}
                            >
                              {campaign.status}
                            </span>

                          </div>

                          <h3>
                            {displayName}
                          </h3>

                          <p>
                            {campaign.description ||
                              "No description provided."}
                          </p>

                          <div className="meta-row">

                            <span>
                              Start
                            </span>

                            <strong>
                              {campaign.start_date
                                ?.substring(
                                  0,
                                  10
                                )}
                            </strong>

                          </div>

                          <div className="meta-row">

                            <span>
                              End
                            </span>

                            <strong>
                              {campaign.end_date
                                ?.substring(
                                  0,
                                  10
                                )}
                            </strong>

                          </div>

                          <div className="action-buttons">

                            <button
                              onClick={() =>
                                editCampaign(
                                  campaign
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteCampaign(
                                  campaign.campaign_id
                                )
                              }
                            >
                              Delete
                            </button>

                            <button
                              className="publish-button"
                              onClick={() =>
                                publishCampaign(
                                  campaign
                                )
                              }
                              disabled={
                                campaign.status ===
                                "active"
                              }
                            >
                              {campaign.status ===
                              "active"
                                ? "Active"
                                : "Publish"}
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </section>
        )}

        {/* =================================================
            SOCIAL ACCOUNTS
        ================================================= */}

        {currentPage ===
          "social-accounts" && (

          <section className="page-section">

            <div className="page-heading">

              <div>

                <span className="panel-kicker">
                  MILESTONE 1 + 2
                </span>

                <h1>
                  Social Accounts
                </h1>

                <p>
                  Manage your publishing destinations.
                </p>

              </div>

            </div>

            <div className="form-card">

              <div className="form-heading">

                <div className="form-icon">
                  ◎
                </div>

                <div>

                  <span>
                    PLATFORM CONNECTION
                  </span>

                  <h2>
                    {editingAccountId
                      ? "Edit Social Account"
                      : "Add Social Account"}
                  </h2>

                </div>

              </div>

              <form
                onSubmit={
                  handleAccountSubmit
                }
              >

                <label>
                  Platform
                </label>

                <select
                  value={
                    accountPlatform
                  }
                  onChange={(e) =>
                    setAccountPlatform(
                      e.target.value
                    )
                  }
                >

                  <option value="Instagram">
                    Instagram
                  </option>

                  <option value="Facebook">
                    Facebook
                  </option>

                  <option value="Twitter-X">
                    Twitter-X
                  </option>

                  <option value="LinkedIn">
                    LinkedIn
                  </option>

                </select>

                <label>
                  Username
                </label>

                <input
                  type="text"
                  placeholder="@username or account name"
                  value={accountName}
                  onChange={(e) =>
                    setAccountName(
                      e.target.value
                    )
                  }
                  required
                />

                <div className="form-actions">

                  <button
                    className="primary-button"
                    type="submit"
                  >
                    {editingAccountId
                      ? "Update Account"
                      : "Connect Account"}
                  </button>

                  {editingAccountId && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={
                        resetAccountForm
                      }
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

            </div>

            <div className="list-section">

              <div className="list-heading">

                <div>

                  <span className="panel-kicker">
                    PLATFORMS
                  </span>

                  <h2>
                    Connected Accounts
                  </h2>

                </div>

                <span className="count-badge">
                  {safeSocialAccounts.length}
                </span>

              </div>

              {safeSocialAccounts.length ===
              0 ? (

                <div className="empty-state">

                  <div>
                    ◎
                  </div>

                  <h3>
                    No social accounts
                  </h3>

                  <p>
                    Add a platform to enable
                    content publishing.
                  </p>

                </div>

              ) : (

                <div className="data-grid">

                  {safeSocialAccounts.map(
                    (account) => {

                      const username =
                        account.username ||
                        account.account_name ||
                        account.accountName ||
                        "";

                      return (
                        <div
                          className="data-card"
                          key={
                            account.account_id
                          }
                        >

                          <div className="data-card-top">

                            <div className="mini-icon platform-icon">

                              {account.platform ===
                              "Instagram"
                                ? "◎"
                                : account.platform ===
                                  "Facebook"
                                ? "f"
                                : account.platform ===
                                  "LinkedIn"
                                ? "in"
                                : "𝕏"}

                            </div>

                            <span
                              className={getStatusClass(
                                account.status ||
                                  "configured"
                              )}
                            >
                              {account.status ||
                                "configured"}
                            </span>

                          </div>

                          <h3>
                            {account.platform}
                          </h3>

                          <p>
                            {username}
                          </p>

                          <div className="action-buttons">

                            <button
                              onClick={() =>
                                editAccount(
                                  account
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteAccount(
                                  account.account_id
                                )
                              }
                            >
                              Delete
                            </button>

                            <button
                              className="publish-button"
                              onClick={() =>
                                activateAccount(
                                  account
                                )
                              }
                              disabled={
                                account.status ===
                                "connected"
                              }
                            >
                              {account.status ===
                              "connected"
                                ? "Active"
                                : "Activate"}
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </section>
        )}

        {/* =================================================
            POSTS
        ================================================= */}

        {currentPage === "posts" && (

          <section className="page-section">

            <div className="page-heading">

              <div>

                <span className="panel-kicker">
                  MILESTONE 2
                </span>

                <h1>
                  Content Management
                </h1>

                <p>
                  Create drafts, prepare content,
                  and publish posts.
                </p>

              </div>

            </div>

            <div className="form-card">

              <div className="form-heading">

                <div className="form-icon">
                  ✎
                </div>

                <div>

                  <span>
                    CONTENT CREATION
                  </span>

                  <h2>
                    {editingPostId
                      ? "Edit Post"
                      : "Create Post"}
                  </h2>

                </div>

              </div>

              <form
                onSubmit={
                  handlePostSubmit
                }
              >

                <label>
                  Campaign
                </label>

                <select
                  value={
                    postCampaignId
                  }
                  onChange={(e) =>
                    setPostCampaignId(
                      e.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select Campaign
                  </option>

                  {safeCampaigns.map(
                    (campaign) => (

                      <option
                        key={
                          campaign.campaign_id
                        }
                        value={
                          campaign.campaign_id
                        }
                      >
                        {campaign.campaign_name ||
                          campaign.name}
                      </option>

                    )
                  )}

                </select>

                <label>
                  Social Account
                </label>

                <select
                  value={
                    postAccountId
                  }
                  onChange={(e) =>
                    setPostAccountId(
                      e.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select Account
                  </option>

                  {safeSocialAccounts.map(
                    (account) => (

                      <option
                        key={
                          account.account_id
                        }
                        value={
                          account.account_id
                        }
                      >
                        {account.platform} -{" "}
                        {account.username ||
                          account.account_name ||
                          account.accountName}
                      </option>

                    )
                  )}

                </select>

                <label>
                  Content
                </label>

                <textarea
                  className="content-textarea"
                  placeholder="Write your social media content..."
                  value={postContent}
                  onChange={(e) =>
                    setPostContent(
                      e.target.value
                    )
                  }
                  required
                />

                <label>
                  Media URL
                </label>

                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={postMediaUrl}
                  onChange={(e) =>
                    setPostMediaUrl(
                      e.target.value
                    )
                  }
                />

                <div className="form-row">

                  <div>

                    <label>
                      Scheduled Time
                    </label>

                    <input
                      type="datetime-local"
                      value={
                        postScheduledTime
                      }
                      onChange={(e) =>
                        setPostScheduledTime(
                          e.target.value
                        )
                      }
                    />

                  </div>

                  <div>

                    <label>
                      Content Status
                    </label>

                    <select
                      value={
                        postStatus
                      }
                      onChange={(e) =>
                        setPostStatus(
                          e.target.value
                        )
                      }
                    >

                      <option value="draft">
                        Draft
                      </option>

                      <option value="scheduled">
                        Scheduled
                      </option>

                      <option value="published">
                        Published
                      </option>

                    </select>

                  </div>

                </div>

                <div className="form-actions">

                  <button
                    className="primary-button"
                    type="submit"
                  >
                    {editingPostId
                      ? "Update Post"
                      : "Create Post"}
                  </button>

                  {editingPostId && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={
                        resetPostForm
                      }
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

            </div>

            <div className="list-section">

              <div className="list-heading">

                <div>

                  <span className="panel-kicker">
                    CONTENT LIBRARY
                  </span>

                  <h2>
                    Post List
                  </h2>

                </div>

                <span className="count-badge">
                  {safePosts.length}
                </span>

              </div>

              {safePosts.length === 0 ? (

                <div className="empty-state">

                  <div>
                    ✎
                  </div>

                  <h3>
                    No posts found
                  </h3>

                  <p>
                    Create your first post above.
                  </p>

                </div>

              ) : (

                <div className="data-grid">

                  {safePosts.map(
                    (post) => (

                      <div
                        className="data-card post-data-card"
                        key={
                          post.post_id
                        }
                      >

                        <div className="data-card-top">

                          <div className="mini-icon">
                            ✎
                          </div>

                          <span
                            className={getStatusClass(
                              post.status
                            )}
                          >
                            {post.status}
                          </span>

                        </div>

                        <h3>
                          Post #{post.post_id}
                        </h3>

                        <p className="post-preview">
                          {post.content}
                        </p>

                        <div className="meta-row">

                          <span>
                            Campaign
                          </span>

                          <strong>
                            #{post.campaign_id}
                          </strong>

                        </div>

                        <div className="meta-row">

                          <span>
                            Account
                          </span>

                          <strong>
                            #{post.account_id}
                          </strong>

                        </div>

                        {post.scheduled_time && (
                          <div className="meta-row">

                            <span>
                              Scheduled
                            </span>

                            <strong>
                              {formatDate(
                                post.scheduled_time
                              )}
                            </strong>

                          </div>
                        )}

                        <div className="action-buttons">

                          <button
                            onClick={() =>
                              editPost(post)
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-button"
                            onClick={() =>
                              deletePost(
                                post.post_id
                              )
                            }
                          >
                            Delete
                          </button>

                          <button
                            className="publish-button"
                            onClick={() =>
                              publishPost(post)
                            }
                            disabled={
                              post.status ===
                              "published"
                            }
                          >
                            {post.status ===
                            "published"
                              ? "Published"
                              : "Publish"}
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </section>
        )}

        {/* =================================================
            SCHEDULED POSTS / PUBLISHING QUEUE
        ================================================= */}

        {currentPage ===
          "scheduled-posts" && (

          <section className="page-section">

            <div className="page-heading">

              <div>

                <span className="panel-kicker">
                  MILESTONE 2
                </span>

                <h1>
                  Publishing Queue
                </h1>

                <p>
                  Schedule and manage content
                  waiting for publication.
                </p>

              </div>

              <button
                className="primary-button"
                onClick={() => {
                  resetScheduleForm();

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
              >
                ＋ New Schedule
              </button>

            </div>

            <div className="dashboard-cards">

              <div className="dashboard-card schedule-card">

                <div className="card-top">

                  <div className="card-icon">
                    ◷
                  </div>

                </div>

                <h3>
                  Pending Queue
                </h3>

                <p>
                  {pendingQueuePosts}
                </p>

                <small>
                  Waiting for publishing
                </small>

              </div>

              <div className="dashboard-card campaign-card">

                <div className="card-top">

                  <div className="card-icon">
                    ✓
                  </div>

                </div>

                <h3>
                  Published Queue
                </h3>

                <p>
                  {publishedQueuePosts}
                </p>

                <small>
                  Successfully processed
                </small>

              </div>

              <div className="dashboard-card post-card">

                <div className="card-top">

                  <div className="card-icon">
                    !
                  </div>

                </div>

                <h3>
                  Failed Queue
                </h3>

                <p>
                  {failedQueuePosts}
                </p>

                <small>
                  Items requiring retry
                </small>

              </div>

              <div className="dashboard-card account-card">

                <div className="card-top">

                  <div className="card-icon">
                    ◷
                  </div>

                </div>

                <h3>
                  Scheduled Posts
                </h3>

                <p>
                  {safeScheduledPosts.length}
                </p>

                <small>
                  Scheduling records
                </small>

              </div>

            </div>

            <div className="form-card">

              <div className="form-heading">

                <div className="form-icon">
                  ◷
                </div>

                <div>

                  <span>
                    PUBLISHING QUEUE
                  </span>

                  <h2>
                    {editingScheduleId
                      ? "Edit Schedule"
                      : "Schedule Post"}
                  </h2>

                </div>

              </div>

              <form
                onSubmit={
                  handleScheduleSubmit
                }
              >

                <label>
                  Select Post
                </label>

                <select
                  value={
                    schedulePostId
                  }
                  onChange={(e) =>
                    setSchedulePostId(
                      e.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select Post
                  </option>

                  {safePosts.map(
                    (post) => (

                      <option
                        key={
                          post.post_id
                        }
                        value={
                          post.post_id
                        }
                      >
                        #{post.post_id} -{" "}
                        {post.content?.substring(
                          0,
                          70
                        )}
                      </option>

                    )
                  )}

                </select>

                <label>
                  Scheduled Date & Time
                </label>

                <input
                  type="datetime-local"
                  value={
                    scheduleDateTime
                  }
                  onChange={(e) =>
                    setScheduleDateTime(
                      e.target.value
                    )
                  }
                  required
                />

                <label>
                  Queue Status
                </label>

                <select
                  value={
                    scheduleStatus
                  }
                  onChange={(e) =>
                    setScheduleStatus(
                      e.target.value
                    )
                  }
                >

                  <option value="pending">
                    Pending
                  </option>

                  <option value="published">
                    Published
                  </option>

                  <option value="failed">
                    Failed
                  </option>

                </select>

                <div className="form-actions">

                  <button
                    className="primary-button"
                    type="submit"
                  >
                    {editingScheduleId
                      ? "Update Schedule"
                      : "Schedule Post"}
                  </button>

                  {editingScheduleId && (
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={
                        resetScheduleForm
                      }
                    >
                      Cancel
                    </button>
                  )}

                </div>

              </form>

            </div>

            <div className="list-section">

              <div className="list-heading">

                <div>

                  <span className="panel-kicker">
                    SCHEDULED POSTS
                  </span>

                  <h2>
                    Scheduling Records
                  </h2>

                </div>

                <div className="queue-summary">

                  <span>
                    Pending:{" "}
                    <strong>
                      {pendingSchedules}
                    </strong>
                  </span>

                  <span>
                    Total:{" "}
                    <strong>
                      {
                        safeScheduledPosts.length
                      }
                    </strong>
                  </span>

                </div>

              </div>

              {safeScheduledPosts.length ===
              0 ? (

                <div className="empty-state">

                  <div>
                    ◷
                  </div>

                  <h3>
                    No scheduled posts
                  </h3>

                  <p>
                    Schedule a post to add it
                    to the publishing workflow.
                  </p>

                </div>

              ) : (

                <div className="data-grid">

                  {safeScheduledPosts.map(
                    (schedule) => {

                      const post =
                        safePosts.find(
                          (p) =>
                            Number(
                              p.post_id
                            ) ===
                            Number(
                              schedule.post_id
                            )
                        );

                      return (
                        <div
                          className="data-card"
                          key={
                            schedule.schedule_id
                          }
                        >

                          <div className="data-card-top">

                            <div className="mini-icon">
                              ◷
                            </div>

                            <span
                              className={getStatusClass(
                                schedule.status
                              )}
                            >
                              {
                                schedule.status
                              }
                            </span>

                          </div>

                          <h3>
                            Schedule #
                            {
                              schedule.schedule_id
                            }
                          </h3>

                          {post && (
                            <p className="post-preview">
                              {post.content}
                            </p>
                          )}

                          <div className="meta-row">

                            <span>
                              Post
                            </span>

                            <strong>
                              #
                              {
                                schedule.post_id
                              }
                            </strong>

                          </div>

                          <div className="meta-row">

                            <span>
                              Scheduled
                            </span>

                            <strong>
                              {formatDate(
                                schedule.scheduled_at
                              )}
                            </strong>

                          </div>

                          {schedule.published_at && (
                            <div className="meta-row">

                              <span>
                                Published
                              </span>

                              <strong>
                                {formatDate(
                                  schedule.published_at
                                )}
                              </strong>

                            </div>
                          )}

                          {schedule.error_message && (
                            <div className="schedule-error">
                              {
                                schedule.error_message
                              }
                            </div>
                          )}

                          <div className="action-buttons">

                            <button
                              onClick={() =>
                                editSchedule(
                                  schedule
                                )
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-button"
                              onClick={() =>
                                deleteSchedule(
                                  schedule.schedule_id
                                )
                              }
                            >
                              Delete
                            </button>

                            <button
                              className="publish-button"
                              onClick={() =>
                                publishSchedule(
                                  schedule
                                )
                              }
                              disabled={
                                schedule.status ===
                                "published"
                              }
                            >
                              {schedule.status ===
                              "published"
                                ? "Published"
                                : "Publish"}
                            </button>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

            <div className="list-section">

              <div className="list-heading">

                <div>

                  <span className="panel-kicker">
                    MILESTONE 2
                  </span>

                  <h2>
                    Publishing Queue Engine
                  </h2>

                </div>

                <span className="count-badge">
                  {
                    safePublishingQueue.length
                  }
                </span>

              </div>

              {safePublishingQueue.length ===
              0 ? (

                <div className="empty-state">

                  <div>
                    ⌁
                  </div>

                  <h3>
                    Publishing queue is empty
                  </h3>

                  <p>
                    Queue items will appear here
                    when content is ready for
                    automated publishing.
                  </p>

                </div>

              ) : (

                <div className="data-grid">

                  {safePublishingQueue.map(
                    (queue) => {

                      const post =
                        safePosts.find(
                          (p) =>
                            Number(
                              p.post_id
                            ) ===
                            Number(
                              queue.post_id
                            )
                        );

                      const account =
                        post
                          ? safeSocialAccounts.find(
                              (a) =>
                                Number(
                                  a.account_id
                                ) ===
                                Number(
                                  post.account_id
                                )
                            )
                          : null;

                      return (
                        <div
                          className="data-card"
                          key={
                            queue.queue_id
                          }
                        >

                          <div className="data-card-top">

                            <div className="mini-icon">
                              ⌁
                            </div>

                            <span
                              className={getStatusClass(
                                queue.status
                              )}
                            >
                              {
                                queue.status
                              }
                            </span>

                          </div>

                          <h3>
                            Queue #
                            {
                              queue.queue_id
                            }
                          </h3>

                          {post && (
                            <p className="post-preview">
                              {post.content}
                            </p>
                          )}

                          <div className="meta-row">

                            <span>
                              Post
                            </span>

                            <strong>
                              #
                              {
                                queue.post_id
                              }
                            </strong>

                          </div>

                          <div className="meta-row">

                            <span>
                              Platform
                            </span>

                            <strong>
                              {
                                queue.platform ||
                                account?.platform ||
                                "Unknown"
                              }
                            </strong>

                          </div>

                          <div className="meta-row">

                            <span>
                              Scheduled
                            </span>

                            <strong>
                              {formatDate(
                                queue.scheduled_time
                              )}
                            </strong>

                          </div>

                          <div className="meta-row">

                            <span>
                              Priority
                            </span>

                            <strong>
                              {
                                queue.priority ??
                                1
                              }
                            </strong>

                          </div>

                          <div className="meta-row">

                            <span>
                              Retry Count
                            </span>

                            <strong>
                              {
                                queue.retry_count ??
                                0
                              }
                            </strong>

                          </div>

                          {queue.status ===
                            "failed" && (
                            <div className="schedule-error">
                              Publishing failed.
                              Retry will be handled
                              by the publishing
                              processor.
                            </div>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </section>
        )}

      </main>
    </div>
  );
}

export default App;

