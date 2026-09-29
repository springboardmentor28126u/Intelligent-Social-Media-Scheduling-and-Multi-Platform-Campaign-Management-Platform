import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CreatePost.css";

const API_BASE_URL = "http://127.0.0.1:8000";
const INDIA_TIMEZONE = "Asia/Kolkata";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const platformMeta = {
  linkedin: {
    icon: "in",
    label: "LinkedIn",
  },
  instagram: {
    icon: "◎",
    label: "Instagram",
  },
  facebook: {
    icon: "f",
    label: "Facebook",
  },
  youtube: {
    icon: "▶",
    label: "YouTube",
  },
  twitter: {
    icon: "𝕏",
    label: "X / Twitter",
  },
};

function getMinDateTime() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function formatForDateTimeLocal(value) {
  if (!value) return "";

  const cleaned = String(value).replace(" ", "T");

  const match = cleaned.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/
  );

  return match ? `${match[1]}T${match[2]}` : "";
}

function formatForBackend(value) {
  return value || null;
}

function isFutureDateTime(value) {
  if (!value) return false;

  const currentIST = getMinDateTime();

  return value > currentIST;
}

function isValidFileType(file) {
  if (!file) return false;

  return (
    file.type.startsWith("image/") ||
    file.type.startsWith("video/")
  );
}

function getMediaType(file) {
  if (!file) return null;

  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return null;
}

function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();

  const editMode = location.state?.editMode || false;
  const rescheduleMode = location.state?.rescheduleMode || false;
  const scheduleMode = location.state?.scheduleMode || false;
  const existingPost = location.state?.post || null;

  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignId, setCampaignId] = useState("");
  const [socialAccountId, setSocialAccountId] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const [loading, setLoading] = useState(false);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("daily");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");

  // Media state
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaType, setMediaType] = useState(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaFilename, setMediaFilename] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // ============================================================
  // LOAD SOCIAL ACCOUNTS
  // ============================================================

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const loadAccounts = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/social-accounts/`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("role");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load social accounts");
        }

        const data = await response.json();

        setAccounts(data);
      } catch (error) {
        console.error("Error loading social accounts:", error);

        alert("Failed to load social accounts.");
      }
    };

    loadAccounts();

    const loadCampaigns = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/campaigns`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          setCampaigns(await response.json());
        }
      } catch (error) {
        console.error("Error loading campaigns:", error);
      }
    };

    loadCampaigns();
  }, [navigate]);

  // ============================================================
  // LOAD EXISTING POST FOR EDIT MODE
  // ============================================================

  useEffect(() => {
    if (!existingPost) return;

    if (existingPost.social_account_id) {
      const accountId = String(existingPost.social_account_id);
      setSocialAccountId(accountId);
      setSelectedAccountIds([accountId]);
    }

    if (existingPost.campaign_id) {
      setCampaignId(String(existingPost.campaign_id));
    }

    setContent(existingPost.content || "");

    if (existingPost.scheduled_at) {
      setScheduledAt(
        formatForDateTimeLocal(existingPost.scheduled_at)
      );
    }

    if (existingPost.is_recurring) {
      setIsRecurring(true);

      setRecurrenceType(
        existingPost.recurrence_type || "daily"
      );

      if (existingPost.recurrence_end) {
        setRecurrenceEnd(
          formatForDateTimeLocal(existingPost.recurrence_end)
        );
      }
    }

    // Existing media
    if (existingPost.media_url) {
      setMediaUrl(existingPost.media_url);
    }

    if (existingPost.media_type) {
      setMediaType(existingPost.media_type);
    }

    if (existingPost.media_filename) {
      setMediaFilename(existingPost.media_filename);
    }
  }, [existingPost]);

  // ============================================================
  // CLEAN MEDIA PREVIEW URL
  // ============================================================

  useEffect(() => {
    return () => {
      if (mediaPreview) {
        URL.revokeObjectURL(mediaPreview);
      }
    };
  }, [mediaPreview]);

  // ============================================================
  // MEDIA FILE SELECTION
  // ============================================================

  const handleMediaChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // File type validation
    if (!isValidFileType(file)) {
      alert("Please select only an image or video file.");

      e.target.value = "";

      return;
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE) {
      alert("File size must be less than or equal to 100 MB.");

      e.target.value = "";

      return;
    }

    const selectedMediaType = getMediaType(file);

    setMediaFile(file);
    setMediaType(selectedMediaType);
    setMediaFilename(file.name);
    setMediaUrl("");

    // Remove old preview
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setMediaPreview(previewUrl);
  };

  // ============================================================
  // REMOVE MEDIA
  // ============================================================

  const handleRemoveMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }

    setMediaFile(null);
    setMediaPreview("");
    setMediaUrl("");
    setMediaType(null);
    setMediaFilename("");

    const input = document.getElementById("mediaFile");

    if (input) {
      input.value = "";
    }
  };

  // ============================================================
  // UPLOAD MEDIA
  // ============================================================

  const uploadMedia = async (token) => {
    if (!mediaFile) {
      return {
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        media_filename: mediaFilename || null,
      };
    }

    setUploadingMedia(true);

    try {
      const formData = new FormData();

      formData.append("file", mediaFile);

      const response = await fetch(
        `${API_BASE_URL}/posts/upload-media`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("role");

        navigate("/login");

        throw new Error("Session expired. Please login again.");
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to upload media."
        );
      }

      setMediaUrl(data.media_url || "");
      setMediaType(data.media_type || mediaType);
      setMediaFilename(
        data.media_filename || mediaFile.name
      );

      return {
        media_url: data.media_url,
        media_type: data.media_type,
        media_filename:
          data.media_filename || mediaFile.name,
      };
    } finally {
      setUploadingMedia(false);
    }
  };

  // ============================================================
  // SUBMIT POST
  // ============================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    // ----------------------------------------------------------
    // Validate social account
    // ----------------------------------------------------------

    const targetAccountIds = editMode
      ? [socialAccountId]
      : selectedAccountIds;

    if (targetAccountIds.length === 0 || !targetAccountIds[0]) {
      alert("Please select at least one social account.");
      return;
    }

    // ----------------------------------------------------------
    // Validate content
    // ----------------------------------------------------------

    if (!content.trim()) {
      alert("Please enter post content.");
      return;
    }

    // ----------------------------------------------------------
    // Validate scheduled time
    // ----------------------------------------------------------

    if (scheduledAt) {
      if (!isFutureDateTime(scheduledAt)) {
        alert(
          "Please select a future date and time in Indian Standard Time."
        );

        return;
      }
    }

    // ----------------------------------------------------------
    // Recurring validation
    // ----------------------------------------------------------

    if (isRecurring && !editMode) {
      if (!scheduledAt) {
        alert(
          "Please select the first scheduled date and time."
        );

        return;
      }

      if (!recurrenceEnd) {
        alert("Please select the recurrence end date.");

        return;
      }

      if (!isFutureDateTime(scheduledAt)) {
        alert(
          "Please select a future date and time for the first post."
        );

        return;
      }

      if (recurrenceEnd <= scheduledAt) {
        alert(
          "Recurrence end date must be after the first scheduled date."
        );

        return;
      }
    }

    if (scheduleMode && !scheduledAt) {
      alert("Please select a date and time.");
      return;
    }

    setLoading(true);

    try {
      // ========================================================
      // EDIT MODE
      // ========================================================

      if (editMode && existingPost) {
        let url =
          `${API_BASE_URL}/posts/${existingPost.id}` +
          `?content=${encodeURIComponent(content)}`;

        if (scheduledAt) {
          if (!isFutureDateTime(scheduledAt)) {
            throw new Error(
              "Please select a future date and time."
            );
          }

          url +=
            `&scheduled_at=` +
            `${encodeURIComponent(
              formatForBackend(scheduledAt)
            )}`;
        }

        const response = await fetch(url, {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("role");

          navigate("/login");

          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to update post."
          );
        }

        alert(
          data.status === "scheduled"
            ? "Post scheduled successfully!"
            : "Draft updated successfully!"
        );

        navigate(
          data.status === "scheduled"
            ? "/calendar"
            : "/drafts"
        );

        return;
      }

      // ========================================================
      // UPLOAD MEDIA
      // ========================================================

      let uploadedMedia = {
        media_url: null,
        media_type: null,
        media_filename: null,
      };

      if (mediaFile) {
        uploadedMedia = await uploadMedia(token);
      } else if (mediaUrl) {
        uploadedMedia = {
          media_url: mediaUrl,
          media_type: mediaType,
          media_filename: mediaFilename,
        };
      }

      // ========================================================
      // RECURRING POST
      // ========================================================

      if (isRecurring) {
        for (const accountId of targetAccountIds) {
          let url =
            `${API_BASE_URL}/posts/recurring` +
            `?social_account_id=${accountId}` +
            `&content=${encodeURIComponent(content)}` +
            `&scheduled_at=${encodeURIComponent(scheduledAt)}` +
            `&recurrence_type=${encodeURIComponent(recurrenceType)}` +
            `&recurrence_end=${encodeURIComponent(recurrenceEnd)}`;

          if (uploadedMedia.media_url) {
            url += `&media_url=${encodeURIComponent(uploadedMedia.media_url)}`;
            url += `&media_type=${encodeURIComponent(uploadedMedia.media_type || "")}`;
            url += `&media_filename=${encodeURIComponent(uploadedMedia.media_filename || "")}`;
          }

          const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("role");
            navigate("/login");
            return;
          }

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.detail || "Failed to create recurring post.");
          }
        }

        alert(
          "Recurring post scheduled successfully!"
        );

        navigate("/calendar");

        return;
      }

      // ========================================================
      // NORMAL POST / DRAFT / SCHEDULED POST
      // ========================================================

      for (const accountId of targetAccountIds) {
        if (campaignId) {
          const response = await fetch(`${API_BASE_URL}/posts/`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              campaign_id: Number(campaignId),
              social_account_id: Number(accountId),
              content,
              media_url: uploadedMedia.media_url,
              scheduled_at: scheduledAt ? formatForBackend(scheduledAt) : null,
              status: scheduledAt ? "SCHEDULED" : "DRAFT",
            }),
          });

          if (response.status === 401) {
            localStorage.removeItem("access_token");
            localStorage.removeItem("role");
            navigate("/login");
            return;
          }

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.detail || "Failed to create campaign post.");
          }
          continue;
        }

        let url =
          `${API_BASE_URL}/posts/` +
          `?social_account_id=${accountId}` +
          `&content=${encodeURIComponent(content)}`;

        if (scheduledAt) {
          url += `&scheduled_at=${encodeURIComponent(formatForBackend(scheduledAt))}`;
        }

        if (uploadedMedia.media_url) {
          url += `&media_url=${encodeURIComponent(uploadedMedia.media_url)}`;
          url += `&media_type=${encodeURIComponent(uploadedMedia.media_type || "")}`;
          url += `&media_filename=${encodeURIComponent(uploadedMedia.media_filename || "")}`;
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("role");
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to create post.");
        }
      }

      alert(
        scheduledAt
          ? "Post scheduled successfully!"
          : "Draft saved successfully!"
      );

      navigate("/posts");
    } catch (error) {
      console.error("Post error:", error);

      alert(
        error.message ||
          "Something went wrong while processing the post."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // PAGE INFORMATION
  // ============================================================

  let pageTitle = "Create Post";

  if (scheduleMode) {
    pageTitle = "Schedule Draft";
  } else if (rescheduleMode) {
    pageTitle = "Reschedule Post";
  } else if (editMode) {
    pageTitle = "Edit Draft";
  }

  let pageDescription =
    "Create, preview and schedule content across your social accounts.";

  if (scheduleMode) {
    pageDescription =
      "Choose when your draft should be published.";
  } else if (rescheduleMode) {
    pageDescription =
      "Choose a new publishing time for this post.";
  } else if (editMode) {
    pageDescription =
      "Update your draft and save your changes.";
  }

  let buttonText = "Save Draft";

  if (scheduleMode) {
    buttonText = "Schedule Post";
  } else if (rescheduleMode) {
    buttonText = "Update Schedule";
  } else if (editMode && scheduledAt) {
    buttonText = "Update Schedule";
  } else if (editMode) {
    buttonText = "Save Changes";
  } else if (isRecurring) {
    buttonText = "Schedule Recurring Post";
  } else if (scheduledAt) {
    buttonText = "Schedule Post";
  }

  // ============================================================
  // SELECTED ACCOUNT
  // ============================================================

  const selectedAccount = accounts.find(
    (account) =>
      String(account.id) === String(selectedAccountIds[0] || socialAccountId)
  );

  const selectedPlatform =
    selectedAccount?.platform?.toLowerCase() ||
    "linkedin";

  const meta =
    platformMeta[selectedPlatform] || {
      icon: "✦",
      label:
        selectedAccount?.platform || "Social",
    };

  const remaining = Math.max(
    0,
    5000 - content.length
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="create-post-page">
      <div className="create-post-shell">

        {/* ================================================== */}
        {/* TOP BAR */}
        {/* ================================================== */}

        <header className="create-post-topbar">
          <div className="title-block">
            <div className="eyebrow">
              SOCIALPILOT · CONTENT STUDIO
            </div>

            <h1>{pageTitle}</h1>

            <p>{pageDescription}</p>
          </div>

          <button
            className="back-dashboard-button"
            type="button"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </header>

        <div className="studio-layout">

          {/* ================================================= */}
          {/* EDITOR */}
          {/* ================================================= */}

          <section className="editor-card">

            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  STEP 01
                </span>

                <h2>Compose your post</h2>
              </div>

              <span className="draft-pill">
                ● {editMode ? "Editing" : "Draft"}
              </span>
            </div>

            <form
              className="create-post-form"
              onSubmit={handleSubmit}
            >

              {/* =========================================== */}
              {/* CAMPAIGN */}
              {/* =========================================== */}

              <div className="form-group">
                <label htmlFor="campaignId">
                  Campaign
                </label>
                <select
                  id="campaignId"
                  value={campaignId}
                  onChange={(event) => setCampaignId(event.target.value)}
                  disabled={editMode}
                >
                  <option value="">No campaign</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* =========================================== */}
              {/* SOCIAL ACCOUNT */}
              {/* =========================================== */}

              <div className="form-group">
                <label htmlFor="socialAccount">
                  Publish to
                </label>

                {editMode ? (
                  <div className="account-select-wrap">
                    <select
                      id="socialAccount"
                      value={socialAccountId}
                      disabled
                      required
                    >
                      <option value={socialAccountId}>
                        {selectedAccount?.platform} · {selectedAccount?.username}
                      </option>
                    </select>
                  </div>
                ) : (
                  <div className="multi-account-picker">
                    {accounts.filter((account) => account.connected).map((account) => {
                      const accountId = String(account.id);
                      const selected = selectedAccountIds.includes(accountId);

                      return (
                        <label className="account-option" key={account.id}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              setSelectedAccountIds((current) =>
                                selected
                                  ? current.filter((id) => id !== accountId)
                                  : [...current, accountId]
                              );
                            }}
                          />
                          <span>
                            <strong>{account.platform}</strong>
                            <small>{account.username}</small>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {!editMode && (
                  <small className="helper-text">
                    Select one or more accounts. SocialPilot will create the same post for each one.
                  </small>
                )}

                {accounts.length === 0 && (
                  <div className="no-accounts-message">
                    <span>⚠</span>

                    <div>
                      <strong>
                        No social accounts connected
                      </strong>

                      <small>
                        Connect an account before creating
                        a post.
                      </small>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate("/social-accounts")
                      }
                    >
                      Connect
                    </button>
                  </div>
                )}

                {editMode && (
                  <small className="helper-text">
                    The social account cannot be changed
                    while editing this post.
                  </small>
                )}
              </div>

              {/* =========================================== */}
              {/* CONTENT */}
              {/* =========================================== */}

              <div className="form-group">

                <div className="label-row">
                  <label htmlFor="content">
                    Post content
                  </label>

                  <span className="character-count">
                    {content.length} / 5000
                  </span>
                </div>

                <textarea
                  id="content"
                  value={content}
                  onChange={(e) =>
                    setContent(e.target.value)
                  }
                  placeholder="What do you want your audience to see today? Write your caption, announcement, or campaign message..."
                  rows="10"
                  maxLength={5000}
                  required
                />

                <div className="composer-tools">
                  <span>Aa</span>
                  <span># Hashtag</span>
                  <span>☺ Emoji</span>
                  <span>↗ Preview updates live</span>

                  <span className="tools-spacer" />

                  <span>
                    {remaining} characters left
                  </span>
                </div>
              </div>

              {/* =========================================== */}
              {/* MEDIA UPLOAD */}
              {/* =========================================== */}

              <div className="media-upload-card">

                <div className="media-upload-heading">
                  <div>
                    <span className="section-kicker">
                      MEDIA
                    </span>

                    <h3>
                      Add image or video
                    </h3>

                    <p>
                      Upload media for your social post.
                      Maximum file size: 100 MB.
                    </p>
                  </div>

                  {mediaFile && (
                    <button
                      type="button"
                      className="remove-media-btn"
                      onClick={handleRemoveMedia}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <label
                  htmlFor="mediaFile"
                  className="media-upload-box"
                >
                  <input
                    id="mediaFile"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleMediaChange}
                    disabled={uploadingMedia || loading}
                  />

                  <div className="upload-icon">
                    {mediaType === "video"
                      ? "▶"
                      : "＋"}
                  </div>

                  <strong>
                    {mediaFile
                      ? mediaFile.name
                      : "Choose an image or video"}
                  </strong>

                  <small>
                    PNG, JPG, JPEG, GIF, MP4, MOV and
                    other supported media formats
                  </small>
                </label>

                {mediaFile && (
                  <div className="selected-media-info">
                    <span>
                      Type:{" "}
                      <strong>
                        {mediaType}
                      </strong>
                    </span>

                    <span>
                      File:{" "}
                      <strong>
                        {mediaFilename}
                      </strong>
                    </span>

                    <span>
                      Size:{" "}
                      <strong>
                        {(
                          mediaFile.size /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </strong>
                    </span>
                  </div>
                )}

                {uploadingMedia && (
                  <div className="upload-progress-message">
                    Uploading media...
                  </div>
                )}

              </div>

              {/* =========================================== */}
              {/* SCHEDULE */}
              {/* =========================================== */}

              <div className="schedule-card">

                <div className="schedule-heading">
                  <div>
                    <span className="section-kicker">
                      STEP 02
                    </span>

                    <h2>
                      Publishing schedule
                    </h2>
                  </div>

                  <span className="ist-badge">
                    IST · Asia/Kolkata
                  </span>
                </div>

                <div className="schedule-grid">

                  <div className="form-group">
                    <label htmlFor="scheduledAt">
                      Date & time
                    </label>

                    <input
                      id="scheduledAt"
                      type="datetime-local"
                      value={scheduledAt}
                      min={getMinDateTime()}
                      onChange={(e) =>
                        setScheduledAt(
                          e.target.value
                        )
                      }
                    />

                    <small className="helper-text">
                      Leave empty to save this post as
                      a draft.
                    </small>
                  </div>

                  {!editMode && (
                    <div
                      className={`recurring-toggle ${
                        isRecurring ? "active" : ""
                      }`}
                    >
                      <label className="toggle-row">

                        <span className="toggle-copy">
                          <strong>
                            Recurring post
                          </strong>

                          <small>
                            Repeat automatically on a
                            schedule.
                          </small>
                        </span>

                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) =>
                            setIsRecurring(
                              e.target.checked
                            )
                          }
                        />

                        <span className="toggle-ui" />

                      </label>
                    </div>
                  )}

                </div>

                {/* ========================================= */}
                {/* RECURRING OPTIONS */}
                {/* ========================================= */}

                {isRecurring && !editMode && (
                  <div className="recurring-options">

                    <div className="form-group">
                      <label htmlFor="recurrenceType">
                        Repeat
                      </label>

                      <select
                        id="recurrenceType"
                        value={recurrenceType}
                        onChange={(e) =>
                          setRecurrenceType(
                            e.target.value
                          )
                        }
                      >
                        <option value="daily">
                          Every day
                        </option>

                        <option value="weekly">
                          Every week
                        </option>

                        <option value="monthly">
                          Every month
                        </option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurrenceEnd">
                        End date & time
                      </label>

                      <input
                        id="recurrenceEnd"
                        type="datetime-local"
                        value={recurrenceEnd}
                        min={
                          scheduledAt ||
                          getMinDateTime()
                        }
                        onChange={(e) =>
                          setRecurrenceEnd(
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="recurring-summary">
                      <span>↻</span>

                      <div>
                        <strong>
                          Recurring schedule enabled
                        </strong>

                        <p>
                          Repeats{" "}
                          <b>
                            {recurrenceType}
                          </b>{" "}
                          from your first scheduled
                          time until the selected end
                          date.
                        </p>
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* =========================================== */}
              {/* FORM BUTTONS */}
              {/* =========================================== */}

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    navigate(
                      editMode
                        ? "/drafts"
                        : "/posts"
                    )
                  }
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={
                    loading ||
                    uploadingMedia ||
                    accounts.length === 0
                  }
                >
                  {uploadingMedia
                    ? "Uploading media..."
                    : loading
                    ? "Processing..."
                    : buttonText}

                  {!loading &&
                    !uploadingMedia && (
                      <span>→</span>
                    )}
                </button>

              </div>

            </form>
          </section>

          {/* ================================================= */}
          {/* LIVE PREVIEW */}
          {/* ================================================= */}

          <aside className="preview-column">

            <div className="preview-card">

              <div className="preview-header">

                <div>
                  <span className="section-kicker">
                    STEP 03
                  </span>

                  <h2>Live preview</h2>
                </div>

                <span className="live-dot">
                  <i /> LIVE
                </span>

              </div>

              {/* Platform */}
              <div className="preview-platform-tabs">

                {selectedAccount ? (
                  <div className="platform-chip selected">
                    <span>{meta.icon}</span>

                    {meta.label}
                  </div>
                ) : (
                  <div className="platform-chip">
                    <span>✦</span>

                    Select a platform
                  </div>
                )}

              </div>

              {/* Social card */}
              <div className="social-preview">

                <div className="preview-profile">

                  <div className="avatar">
                    {selectedAccount?.username
                      ?.charAt(0)
                      ?.toUpperCase() || "S"}
                  </div>

                  <div>
                    <strong>
                      {selectedAccount?.username ||
                        "Your account"}
                    </strong>

                    <span>
                      {selectedAccount
                        ? meta.label
                        : "SocialPilot"}
                    </span>
                  </div>

                  <span className="more">
                    •••
                  </span>

                </div>

                {/* Content */}
                <div className="preview-content">

                  {content ? (
                    content
                      .split("\n")
                      .map((line, index) => (
                        <p key={index}>
                          {line || "\u00A0"}
                        </p>
                      ))
                  ) : (
                    <p className="preview-placeholder">
                      Your post preview will appear
                      here as you type...
                    </p>
                  )}

                </div>

                {/* Media preview */}
                {mediaPreview || mediaUrl ? (
                  <div className="preview-media">

                    {mediaType === "image" && (
                      <img
                        src={
                          mediaPreview ||
                          mediaUrl
                        }
                        alt="Post preview"
                      />
                    )}

                    {mediaType === "video" && (
                      <video
                        src={
                          mediaPreview ||
                          mediaUrl
                        }
                        controls
                        muted
                      />
                    )}

                  </div>
                ) : (
                  <div className="preview-media-placeholder">
                    <span>＋</span>

                    <strong>
                      Media preview
                    </strong>

                    <small>
                      Upload an image or video to
                      preview it here.
                    </small>
                  </div>
                )}

                {/* Actions */}
                <div className="preview-actions">
                  <span>♡</span>
                  <span>◌</span>
                  <span>↗</span>
                  <span className="save-icon">
                    ⌑
                  </span>
                </div>

                <div className="preview-meta">
                  Preview only · Platform formatting
                  may vary
                </div>

              </div>

              {/* Schedule summary */}
              <div className="schedule-summary">

                <div className="summary-icon">
                  ◷
                </div>

                <div>
                  <span>Publishing</span>

                  <strong>
                    {scheduledAt
                      ? `Scheduled · ${scheduledAt.replace(
                          "T",
                          " "
                        )}`
                      : "Saved as draft"}
                  </strong>
                </div>

              </div>

            </div>

            {/* Tips */}
            <div className="tips-card">

              <span className="tip-icon">
                ✦
              </span>

              <div>
                <strong>
                  Content tip
                </strong>

                <p>
                  Keep the first sentence clear and
                  engaging. You can refine the post
                  before scheduling it.
                </p>
              </div>

            </div>

          </aside>

        </div>

        {/* ================================================== */}
        {/* BOTTOM NAVIGATION */}
        {/* ================================================== */}

        <nav
          className="bottom-actions"
          aria-label="Content navigation"
        >
          <button
            type="button"
            onClick={() => navigate("/posts")}
          >
            ▤ <span>Posts</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/drafts")}
          >
            ▱ <span>Drafts</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/calendar")}
          >
            □ <span>Calendar</span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/social-accounts")
            }
          >
            ⌁ <span>Accounts</span>
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            ⌂ <span>Dashboard</span>
          </button>
        </nav>

      </div>
    </div>
  );
}

export default CreatePost;