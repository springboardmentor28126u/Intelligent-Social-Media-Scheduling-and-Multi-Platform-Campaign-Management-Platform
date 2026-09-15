import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./CreatePost.css";

const INDIA_TIMEZONE = "Asia/Kolkata";

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
    if (part.type !== "literal") values[part.type] = part.value;
  });

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function getISTDateTime(value) {
  if (!value) return null;

  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour - 5, minute - 30));
}

function formatForDateTimeLocal(value) {
  if (!value) return "";

  const cleaned = String(value).replace(" ", "T");
  const match = cleaned.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);

  return match ? `${match[1]}T${match[2]}:${match[3]}` : "";
}

function formatForBackend(value) {
  return value || null;
}

const platformMeta = {
  linkedin: { icon: "in", label: "LinkedIn" },
  instagram: { icon: "◎", label: "Instagram" },
  facebook: { icon: "f", label: "Facebook" },
  youtube: { icon: "▶", label: "YouTube" },
  twitter: { icon: "𝕏", label: "X / Twitter" },
};

function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();

  const editMode = location.state?.editMode || false;
  const scheduleMode = location.state?.scheduleMode || false;
  const existingPost = location.state?.post || null;

  const [accounts, setAccounts] = useState([]);
  const [socialAccountId, setSocialAccountId] = useState("");
  const [content, setContent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("daily");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadAccounts = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/social-accounts/", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("role");
          navigate("/login");
          return;
        }

        if (!response.ok) throw new Error("Failed to load social accounts");
        setAccounts(await response.json());
      } catch (error) {
        console.error("Error loading social accounts:", error);
        alert("Failed to load social accounts.");
      }
    };

    loadAccounts();
  }, [navigate]);

  useEffect(() => {
    if (!existingPost) return;

    if (existingPost.social_account_id) {
      setSocialAccountId(String(existingPost.social_account_id));
    }

    setContent(existingPost.content || "");

    if (existingPost.scheduled_at) {
      setScheduledAt(formatForDateTimeLocal(existingPost.scheduled_at));
    }

    if (existingPost.is_recurring) {
      setIsRecurring(true);
      setRecurrenceType(existingPost.recurrence_type || "daily");
      if (existingPost.recurrence_end) {
        setRecurrenceEnd(formatForDateTimeLocal(existingPost.recurrence_end));
      }
    }
  }, [existingPost]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!socialAccountId) {
      alert("Please select a social account.");
      return;
    }

    if (!content.trim()) {
      alert("Please enter post content.");
      return;
    }

    let selectedDate = null;
    if (scheduledAt) {
      selectedDate = getISTDateTime(scheduledAt);
      if (!selectedDate) {
        alert("Please select a valid date and time.");
        return;
      }
      if (selectedDate.getTime() <= Date.now()) {
        alert("Please select a future date and time.");
        return;
      }
    }

    let firstSchedule = null;
    let endSchedule = null;

    if (isRecurring && !editMode) {
      if (!scheduledAt) {
        alert("Please select the first scheduled date and time.");
        return;
      }
      if (!recurrenceEnd) {
        alert("Please select the recurrence end date.");
        return;
      }

      firstSchedule = getISTDateTime(scheduledAt);
      endSchedule = getISTDateTime(recurrenceEnd);

      if (!firstSchedule || !endSchedule) {
        alert("Please select valid recurrence dates.");
        return;
      }
      if (firstSchedule.getTime() <= Date.now()) {
        alert("Please select a future date and time for the first post.");
        return;
      }
      if (endSchedule.getTime() <= firstSchedule.getTime()) {
        alert("Recurrence end date must be after the first scheduled date.");
        return;
      }
    }

    if (scheduleMode && !scheduledAt) {
      alert("Please select a date and time.");
      return;
    }

    setLoading(true);

    try {
      if (editMode && existingPost) {
        let url = `http://127.0.0.1:8000/posts/${existingPost.id}?content=${encodeURIComponent(content)}`;

        if (scheduledAt) {
          const editDate = getISTDateTime(scheduledAt);
          if (!editDate) throw new Error("Invalid scheduled date.");
          if (editDate.getTime() <= Date.now()) {
            throw new Error("Please select a future date and time.");
          }
          url += `&scheduled_at=${encodeURIComponent(formatForBackend(scheduledAt))}`;
        }

        const response = await fetch(url, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("role");
          navigate("/login");
          return;
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Failed to update post.");

        alert(data.status === "scheduled" ? "Post scheduled successfully!" : "Draft updated successfully!");
        navigate(data.status === "scheduled" ? "/calendar" : "/drafts");
        return;
      }

      if (isRecurring) {
        const url =
          `http://127.0.0.1:8000/posts/recurring` +
          `?social_account_id=${socialAccountId}` +
          `&content=${encodeURIComponent(content)}` +
          `&scheduled_at=${encodeURIComponent(scheduledAt)}` +
          `&recurrence_type=${encodeURIComponent(recurrenceType)}` +
          `&recurrence_end=${encodeURIComponent(recurrenceEnd)}`;

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
        if (!response.ok) throw new Error(data.detail || "Failed to create recurring post.");

        alert("Recurring post scheduled successfully!");
        navigate("/calendar");
        return;
      }

      let url =
        `http://127.0.0.1:8000/posts/` +
        `?social_account_id=${socialAccountId}` +
        `&content=${encodeURIComponent(content)}`;

      if (scheduledAt) {
        url += `&scheduled_at=${encodeURIComponent(formatForBackend(scheduledAt))}`;
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
      if (!response.ok) throw new Error(data.detail || "Failed to create post.");

      alert(data.status === "scheduled" ? "Post scheduled successfully!" : "Draft saved successfully!");
      navigate("/posts");
    } catch (error) {
      console.error("Post error:", error);
      alert(error.message || "Something went wrong while processing the post.");
    } finally {
      setLoading(false);
    }
  };

  let pageTitle = "Create Post";
  if (scheduleMode) pageTitle = "Schedule Draft";
  else if (editMode) pageTitle = "Edit Draft";

  let pageDescription = "Create, preview and schedule content across your social accounts.";
  if (scheduleMode) pageDescription = "Choose when your draft should be published.";
  else if (editMode) pageDescription = "Update your draft and save your changes.";

  let buttonText = "Save Draft";
  if (scheduleMode) buttonText = "Schedule Post";
  else if (editMode && scheduledAt) buttonText = "Update Schedule";
  else if (editMode) buttonText = "Save Changes";
  else if (isRecurring) buttonText = "Schedule Recurring Post";
  else if (scheduledAt) buttonText = "Schedule Post";

  const selectedAccount = accounts.find((account) => String(account.id) === String(socialAccountId));
  const selectedPlatform = selectedAccount?.platform?.toLowerCase() || "linkedin";
  const meta = platformMeta[selectedPlatform] || { icon: "✦", label: selectedAccount?.platform || "Social" };
  const remaining = Math.max(0, 5000 - content.length);

  return (
    <div className="create-post-page">
      <div className="create-post-shell">
        <header className="create-post-topbar">
          <div className="title-block">
            <div className="eyebrow">SOCIALPILOT · CONTENT STUDIO</div>
            <h1>{pageTitle}</h1>
            <p>{pageDescription}</p>
          </div>
          <button className="back-dashboard-button" type="button" onClick={() => navigate("/dashboard")}>
            ← Dashboard
          </button>
        </header>

        <div className="studio-layout">
          <section className="editor-card">
            <div className="section-heading">
              <div>
                <span className="section-kicker">STEP 01</span>
                <h2>Compose your post</h2>
              </div>
              <span className="draft-pill">● {editMode ? "Editing" : "Draft"}</span>
            </div>

            <form className="create-post-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="socialAccount">Publish to</label>
                <div className="account-select-wrap">
                  <select
                    id="socialAccount"
                    value={socialAccountId}
                    onChange={(e) => setSocialAccountId(e.target.value)}
                    disabled={editMode}
                    required
                  >
                    <option value="">Select a connected social account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.platform} · {account.username}
                      </option>
                    ))}
                  </select>
                </div>
                {accounts.length === 0 && (
                  <div className="no-accounts-message">
                    <span>⚠</span>
                    <div>
                      <strong>No social accounts connected</strong>
                      <small>Connect an account before creating a post.</small>
                    </div>
                    <button type="button" onClick={() => navigate("/social-accounts")}>Connect</button>
                  </div>
                )}
                {editMode && <small className="helper-text">The social account cannot be changed while editing this post.</small>}
              </div>

              <div className="form-group">
                <div className="label-row">
                  <label htmlFor="content">Post content</label>
                  <span className="character-count">{content.length} / 5000</span>
                </div>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
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
                  <span>{remaining} characters left</span>
                </div>
              </div>

              <div className="schedule-card">
                <div className="schedule-heading">
                  <div>
                    <span className="section-kicker">STEP 02</span>
                    <h2>Publishing schedule</h2>
                  </div>
                  <span className="ist-badge">IST · Asia/Kolkata</span>
                </div>

                <div className="schedule-grid">
                  <div className="form-group">
                    <label htmlFor="scheduledAt">Date & time</label>
                    <input
                      id="scheduledAt"
                      type="datetime-local"
                      value={scheduledAt}
                      min={getMinDateTime()}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                    <small className="helper-text">
                      Leave empty to save this post as a draft.
                    </small>
                  </div>

                  {!editMode && (
                    <div className={`recurring-toggle ${isRecurring ? "active" : ""}`}>
                      <label className="toggle-row">
                        <span className="toggle-copy">
                          <strong>Recurring post</strong>
                          <small>Repeat automatically on a schedule.</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={isRecurring}
                          onChange={(e) => setIsRecurring(e.target.checked)}
                        />
                        <span className="toggle-ui" />
                      </label>
                    </div>
                  )}
                </div>

                {isRecurring && !editMode && (
                  <div className="recurring-options">
                    <div className="form-group">
                      <label htmlFor="recurrenceType">Repeat</label>
                      <select id="recurrenceType" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                        <option value="daily">Every day</option>
                        <option value="weekly">Every week</option>
                        <option value="monthly">Every month</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurrenceEnd">End date & time</label>
                      <input
                        id="recurrenceEnd"
                        type="datetime-local"
                        value={recurrenceEnd}
                        min={scheduledAt || getMinDateTime()}
                        onChange={(e) => setRecurrenceEnd(e.target.value)}
                      />
                    </div>

                    <div className="recurring-summary">
                      <span>↻</span>
                      <div>
                        <strong>Recurring schedule enabled</strong>
                        <p>Repeats <b>{recurrenceType}</b> from your first scheduled time until the selected end date.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => navigate(editMode ? "/drafts" : "/posts")} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={loading || accounts.length === 0}>
                  {loading ? "Processing..." : buttonText}
                  {!loading && <span>→</span>}
                </button>
              </div>
            </form>
          </section>

          <aside className="preview-column">
            <div className="preview-card">
              <div className="preview-header">
                <div>
                  <span className="section-kicker">STEP 03</span>
                  <h2>Live preview</h2>
                </div>
                <span className="live-dot"><i /> LIVE</span>
              </div>

              <div className="preview-platform-tabs">
                {selectedAccount ? (
                  <div className="platform-chip selected">
                    <span>{meta.icon}</span>
                    {meta.label}
                  </div>
                ) : (
                  <div className="platform-chip"><span>✦</span> Select a platform</div>
                )}
              </div>

              <div className="social-preview">
                <div className="preview-profile">
                  <div className="avatar">{selectedAccount?.username?.charAt(0)?.toUpperCase() || "S"}</div>
                  <div>
                    <strong>{selectedAccount?.username || "Your account"}</strong>
                    <span>{selectedAccount ? meta.label : "SocialPilot"}</span>
                  </div>
                  <span className="more">•••</span>
                </div>

                <div className="preview-content">
                  {content ? (
                    content.split("\n").map((line, index) => <p key={index}>{line || "\u00A0"}</p>)
                  ) : (
                    <p className="preview-placeholder">Your post preview will appear here as you type...</p>
                  )}
                </div>

                <div className="preview-media-placeholder">
                  <span>＋</span>
                  <strong>Media preview</strong>
                  <small>Images and videos can be added here.</small>
                </div>

                <div className="preview-actions">
                  <span>♡</span><span>◌</span><span>↗</span><span className="save-icon">⌑</span>
                </div>
                <div className="preview-meta">Preview only · Platform formatting may vary</div>
              </div>

              <div className="schedule-summary">
                <div className="summary-icon">◷</div>
                <div>
                  <span>Publishing</span>
                  <strong>{scheduledAt ? `Scheduled · ${scheduledAt.replace("T", " ")}` : "Saved as draft"}</strong>
                </div>
              </div>
            </div>

            <div className="tips-card">
              <span className="tip-icon">✦</span>
              <div>
                <strong>Content tip</strong>
                <p>Keep the first sentence clear and engaging. You can refine the post before scheduling it.</p>
              </div>
            </div>
          </aside>
        </div>

        <nav className="bottom-actions" aria-label="Content navigation">
          <button type="button" onClick={() => navigate("/posts")}>▤ <span>Posts</span></button>
          <button type="button" onClick={() => navigate("/drafts")}>▱ <span>Drafts</span></button>
          <button type="button" onClick={() => navigate("/calendar")}>□ <span>Calendar</span></button>
          <button type="button" onClick={() => navigate("/social-accounts")}>⌁ <span>Accounts</span></button>
          <button type="button" onClick={() => navigate("/dashboard")}>⌂ <span>Dashboard</span></button>
        </nav>
      </div>
    </div>
  );
}

export default CreatePost;
