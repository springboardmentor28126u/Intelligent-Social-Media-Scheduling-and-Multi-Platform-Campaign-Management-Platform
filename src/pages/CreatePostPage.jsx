import { useEffect, useState } from "react";
import api from "../services/api";
import "./CreatePostPage.css";

export default function CreatePostPage() {
  const [content, setContent] = useState("");
  const [media, setMedia] = useState(null);

  // Schedule state
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [scheduledPeriod, setScheduledPeriod] = useState("AM");

  // Social accounts
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);

  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState("");

  // Publishing
  const [publishing, setPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");

  useEffect(() => {
    const loadSocialAccounts = async () => {
      try {
        const response = await api.get("/social-accounts/");

        const connectedAccounts = response.data.filter(
          (account) =>
            account.is_active &&
            account.status === "connected"
        );

        setSocialAccounts(connectedAccounts);
      } catch (error) {
        setAccountsError(
          error.response?.data?.detail ||
            "Failed to load social accounts"
        );
      } finally {
        setAccountsLoading(false);
      }
    };

    loadSocialAccounts();
  }, []);

  const handleMediaChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setMedia(file);
    }
  };

  const handleAccountToggle = (accountId) => {
    setSelectedAccounts((current) => {
      if (current.includes(accountId)) {
        return current.filter((id) => id !== accountId);
      }

      return [...current, accountId];
    });
  };

  const handleSchedule = async () => {
  setPublishMessage("");
  setPublishError("");

  if (!content.trim()) {
    setPublishError("Please enter some content.");
    return;
  }

  if (selectedAccounts.length === 0) {
    setPublishError(
      "Please select at least one social account."
    );
    return;
  }

  if (!scheduledDate || !scheduledTime) {
    setPublishError(
      "Please select a date and time."
    );
    return;
  }

  try {
    setPublishing(true);

    // Convert selected time to 24-hour format
    let [hours, minutes] = scheduledTime.split(":");

    let hour = Number(hours);

    if (scheduledPeriod === "PM" && hour !== 12) {
      hour += 12;
    }

    if (scheduledPeriod === "AM" && hour === 12) {
      hour = 0;
    }

    const formattedTime =
      `${String(hour).padStart(2, "0")}:${minutes}:00`;

    const scheduledDateTime =
      `${scheduledDate}T${formattedTime}`;

    // Step 1: Create the post
    const postResponse = await api.post("/posts", {
      content: content.trim(),
      status: "DRAFT",
      is_recurring: false,
    });

    const postId = postResponse.data.id;

    // Step 2: Attach selected social accounts
    await api.post(
      `/posts/${postId}/social-accounts`,
      {
        social_account_ids: selectedAccounts,
      }
    );

    // Step 3: Upload media if selected
    if (media) {
      const formData = new FormData();
      formData.append("file", media);

      await api.post(
        `/media/posts/${postId}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    }

    // Step 4: Schedule the post
    await api.post(
      `/posts/${postId}/schedule`,
      null,
      {
        params: {
          scheduled_at: scheduledDateTime,
        },
      }
    );

    // Step 5: Show success message
    setPublishMessage(
      "Post scheduled successfully!"
    );

    // Step 6: Clear the form
    setContent("");
    setMedia(null);
    setSelectedAccounts([]);
    setScheduledDate("");
    setScheduledTime("");
    setScheduledPeriod("AM");

  } catch (error) {
    console.error("Schedule error:", error);

    setPublishError(
      error.response?.data?.detail ||
        "Failed to schedule post."
    );
  } finally {
    setPublishing(false);
  }
};
  const handlePublish = async () => {
    setPublishMessage("");
    setPublishError("");

    if (!content.trim()) {
      setPublishError("Please enter some content.");
      return;
    }

    if (selectedAccounts.length === 0) {
      setPublishError(
        "Please select at least one social account."
      );
      return;
    }

    try {
      setPublishing(true);

      // Step 1: Create the post
      const postResponse = await api.post("/posts", {
        content: content.trim(),
        status: "DRAFT",
        is_recurring: false,
      });

      const postId = postResponse.data.id;

      // Step 2: Attach selected social accounts
      await api.post(
        `/posts/${postId}/social-accounts`,
        {
          social_account_ids: selectedAccounts,
        }
      );

      // Step 3: Upload media if selected
      if (media) {
        const formData = new FormData();
        formData.append("file", media);

        await api.post(
          `/media/posts/${postId}/upload`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      // Step 4: Publish the post
      await api.post(
        `/posts/${postId}/publish`
      );

      setPublishMessage(
        "Post published successfully!"
      );

      // Clear composer
      setContent("");
      setMedia(null);
      setSelectedAccounts([]);
      setScheduledDate("");
      setScheduledTime("");
      setScheduledPeriod("AM");

    } catch (error) {
      console.error("Publish error:", error);

      setPublishError(
        error.response?.data?.detail ||
          "Failed to publish post."
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="create-post-page">

      <div className="create-post-container">

        {/* Header */}
        <div className="create-post-header">
          <div>
            <h1>Create Post</h1>

            <p>
              Create and publish content to your social accounts
            </p>
          </div>
        </div>

        {/* Composer */}
        <div className="create-post-card">

          <h2>What's on your mind?</h2>

          <textarea
            value={content}
            onChange={(event) =>
              setContent(event.target.value)
            }
            placeholder="Write your post..."
            rows={7}
            disabled={publishing}
          />

          {/* Media */}
          <div className="media-section">

            <label className="media-button">
              📷 Add Photo / Video

              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                hidden
                disabled={publishing}
              />
            </label>

            {media && (
              <div className="selected-media">

                <span>
                  {media.name}
                </span>

                <button
                  type="button"
                  className="remove-media-button"
                  onClick={() => setMedia(null)}
                  disabled={publishing}
                >
                  Remove
                </button>

              </div>
            )}

          </div>

        </div>

        {/* Schedule Date & Time */}
        <div className="create-post-card">

          <div className="section-header">

            <div>
              <h2>Schedule Post</h2>

              <p>
                Choose when you want this post to be published
              </p>
            </div>

          </div>

          <div className="schedule-section">

            <label>
              Schedule date
            </label>

            <input
              type="date"
              value={scheduledDate}
              onChange={(event) =>
                setScheduledDate(event.target.value)
              }
              disabled={publishing}
            />

            <label>
              Schedule time
            </label>

            <div className="schedule-time-row">

              <input
                type="time"
                value={scheduledTime}
                onChange={(event) =>
                  setScheduledTime(event.target.value)
                }
                disabled={publishing}
              />

              <select
                value={scheduledPeriod}
                onChange={(event) =>
                  setScheduledPeriod(event.target.value)
                }
                disabled={publishing}
              >
                <option value="AM">
                  AM
                </option>

                <option value="PM">
                  PM
                </option>
              </select>

            </div>

          </div>

        </div>

        {/* Publish To */}
        <div className="create-post-card">

          <div className="section-header">

            <div>
              <h2>Publish to</h2>

              <p>
                Select the social accounts for this post
              </p>
            </div>

          </div>

          {/* Loading */}
          {accountsLoading && (
            <div className="social-account-placeholder">
              Loading connected accounts...
            </div>
          )}

          {/* Error */}
          {accountsError && (
            <div className="social-account-error">
              {accountsError}
            </div>
          )}

          {/* No accounts */}
          {!accountsLoading &&
            !accountsError &&
            socialAccounts.length === 0 && (
              <div className="social-account-placeholder">
                No connected social accounts found.
              </div>
            )}

          {/* Accounts */}
          {!accountsLoading &&
            !accountsError &&
            socialAccounts.length > 0 && (
              <div className="social-accounts-list">

                {socialAccounts.map((account) => (

                  <label
                    key={account.id}
                    className="social-account-item"
                  >

                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(
                        account.id
                      )}
                      onChange={() =>
                        handleAccountToggle(account.id)
                      }
                      disabled={publishing}
                    />

                    <div className="social-account-info">

                      <strong>
                        {account.platform}
                      </strong>

                      <span>
                        {account.account_name}
                      </span>

                    </div>

                  </label>

                ))}

              </div>
            )}

        </div>

        {/* Success Message */}
        {publishMessage && (
          <div className="publish-success">
            ✓ {publishMessage}
          </div>
        )}

        {/* Error Message */}
        {publishError && (
          <div className="publish-error">
            {publishError}
          </div>
        )}

        {/* Actions */}
        <div className="create-post-actions">

          <button
            className="schedule-button"
            type="button"
            onClick={handleSchedule}
            disabled={
              publishing ||
              !content.trim() ||
              selectedAccounts.length === 0
            }
          >
            📅 Schedule
          </button>

          <button
            className="publish-button"
            type="button"
            onClick={handlePublish}
            disabled={
              publishing ||
              !content.trim() ||
              selectedAccounts.length === 0
            }
          >
            {publishing
              ? "Publishing..."
              : "🚀 Publish Now"}
          </button>

        </div>

      </div>

    </div>
  );
}