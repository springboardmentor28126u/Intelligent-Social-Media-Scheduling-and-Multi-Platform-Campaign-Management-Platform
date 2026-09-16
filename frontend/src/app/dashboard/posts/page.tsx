"use client";
import { usePostCounts } from "@/hooks/usePostCounts";
import { useState } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  Plus,
  CalendarDays,
  Send,
  Save,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
// ⚠️ ASSUMPTION: "@/" resolves to "src/". If this import fails to resolve,
// tell me and we'll switch to a relative path instead.

const API_BASE_URL = "http://localhost:8000";

const platforms = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "X (Twitter)",
  "YouTube",
  "Pinterest",
];

// Maps the display label shown in the UI to the lowercase value the
// backend's SocialPlatform enum actually expects (see schemas.py).
const PLATFORM_VALUE_MAP: Record<string, string> = {
  "Facebook": "facebook",
  "Instagram": "instagram",
  "LinkedIn": "linkedin",
  "X (Twitter)": "twitter",
  "YouTube": "youtube",
  "Pinterest": "pinterest",
};

const postTypes = [
  "Text Post",
  "Image",
  "Video",
  "Carousel",
  "Story",
  "Reel",
];

/* -------------------------------------------------------
   DATE AND TIME HELPERS

   These use the user's local browser time rather than UTC.
------------------------------------------------------- */

function getCurrentLocalDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentLocalTime() {
  const now = new Date();

  const hours = String(
    now.getHours()
  ).padStart(2, "0");

  const minutes = String(
    now.getMinutes()
  ).padStart(2, "0");

  return `${hours}:${minutes}`;
}

export default function PostsPage() {
  // Grab the JWT from the shared AuthContext — same pattern login/register use.
  const { token } = useAuth();

  const [postType, setPostType] = useState("Text Post");

  const [
    selectedPlatforms,
    setSelectedPlatforms,
  ] = useState<string[]>([]);

  const [content, setContent] = useState("");

  const [postingDate, setPostingDate] =
    useState("");

  const [postingTime, setPostingTime] =
    useState("");

  const [message, setMessage] =
    useState("");

  // Tracks whether a request is in flight, so we can disable buttons
  // and avoid double-submits.
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  // Still hardcoded for now — wiring these to real GET /posts counts
  // is the next step after this one is confirmed working.
   // Real counts from the backend, via the same shared hook Overview uses.
  const {
    scheduled: scheduledCount,
    draft: draftCount,
    published: publishedCount,
    refetch: refetchCounts,
  } = usePostCounts();

  const handlePlatformChange = (
    platform: string
  ) => {
    setSelectedPlatforms(
      (currentPlatforms) => {
        if (
          currentPlatforms.includes(
            platform
          )
        ) {
          return currentPlatforms.filter(
            (selectedPlatform) =>
              selectedPlatform !==
              platform
          );
        }

        return [
          ...currentPlatforms,
          platform,
        ];
      }
    );
  };

  /* -------------------------------------------------------
     CLEAR POST FORM
  ------------------------------------------------------- */

  const resetForm = () => {
    setPostType("Text Post");

    setSelectedPlatforms([]);

    setContent("");

    setPostingDate("");

    setPostingTime("");

    setMessage("");
  };

  /* -------------------------------------------------------
     SHARED: send the post to the backend

     Both "Save as Draft" and "Schedule Post" ultimately POST
     to the same /posts endpoint — only the payload differs
     (status + whether scheduled_at is set).
  ------------------------------------------------------- */

  const createPost = async (payload: {
    post_type: string;
    platforms: string[];
    content: string;
    scheduled_at: string | null;
    status: "draft" | "scheduled";
  }) => {
    const response = await fetch(`${API_BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // This is how the backend knows WHO is creating the post —
        // get_current_user() reads this token.
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      // FastAPI/Pydantic validation errors come back as { detail: ... }
      const errorData = await response.json().catch(() => null);
      const detail =
        typeof errorData?.detail === "string"
          ? errorData.detail
          : "Something went wrong while saving the post.";
      throw new Error(detail);
    }

    return response.json();
  };

  /* -------------------------------------------------------
     SAVE AS DRAFT

     A draft does not require a future schedule because
     it is not being published yet.
  ------------------------------------------------------- */

  const handleSaveDraft = async () => {
    setMessage("");

    if (!content.trim()) {
      setMessage(
        "Please add some content before saving the draft."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      await createPost({
        post_type: postType,
        platforms: selectedPlatforms.map(
          (label) => PLATFORM_VALUE_MAP[label]
        ),
        content,
        scheduled_at: null,
        status: "draft",
      });

      setMessage("Post saved as a draft successfully.");
      resetForm();
      refetchCounts();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save draft."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -------------------------------------------------------
     SCHEDULE POST VALIDATION
  ------------------------------------------------------- */

  const handleSchedulePost = async () => {
    setMessage("");

    if (
      selectedPlatforms.length ===
      0
    ) {
      setMessage(
        "Please select at least one social media platform."
      );

      return;
    }

    if (!content.trim()) {
      setMessage(
        "Please add content for your post."
      );

      return;
    }

    if (!postingDate) {
      setMessage(
        "Please select a posting date."
      );

      return;
    }

    if (!postingTime) {
      setMessage(
        "Please select a posting time."
      );

      return;
    }

    /*
      Combine the selected date and time into one Date
      object and compare it with the actual current time.
    */

    const selectedDateTime =
      new Date(
        `${postingDate}T${postingTime}`
      );

    const currentDateTime =
      new Date();

    /*
      Strictly reject current and past date/time.
      The scheduled time must be in the future.
    */

    if (
      selectedDateTime <=
      currentDateTime
    ) {
      setMessage(
        "Please select a future date and time for your post."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      await createPost({
        post_type: postType,
        platforms: selectedPlatforms.map(
          (label) => PLATFORM_VALUE_MAP[label]
        ),
        content,
        // Backend's scheduled_at is a datetime — ISO string in UTC.
        scheduled_at: selectedDateTime.toISOString(),
        status: "scheduled",
      });

      setMessage("Post scheduled successfully.");
      resetForm();
      refetchCounts();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to schedule post."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /*
    The minimum allowed time changes depending on the
    selected posting date.

    If today is selected:
      minimum time = current time

    If a future date is selected:
      no minimum time restriction is needed.
  */

  const minimumPostingTime =
    postingDate ===
    getCurrentLocalDate()
      ? getCurrentLocalTime()
      : undefined;

  return (
    <div className="space-y-6">
      {/* ---------- Page Heading ---------- */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText
              className="text-indigo-600"
              size={24}
            />

            <h1 className="text-2xl font-bold text-gray-900">
              Posts
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            Create and schedule content across your
            social media platforms.
          </p>
        </div>
      </div>

      {/* ---------- Post Status Summary ---------- */}

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Scheduled */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Scheduled
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {scheduledCount}
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Clock
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Drafts */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Drafts
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {draftCount}
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <FileText
                size={20}
              />
            </div>
          </div>
        </div>

        {/* Published */}

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Published
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {publishedCount}
              </p>
            </div>

            <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
              <CheckCircle2
                size={20}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Create New Post ---------- */}

      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Form Header */}

        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
          <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
            <Plus
              size={20}
            />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Create New Post
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add your content and choose when and where
              it should be posted.
            </p>
          </div>
        </div>

        {/* Form */}

        <div className="space-y-6 p-6">
          {/* ---------- Post Type ---------- */}

          <div>
            <label
              htmlFor="postType"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Post Type
            </label>

            <select
              id="postType"
              value={postType}
              onChange={(event) =>
                setPostType(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {postTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}
            </select>
          </div>

          {/* ---------- Platforms ---------- */}

          <div>
            <label className="mb-3 block text-sm font-medium text-gray-700">
              Select Platforms
            </label>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {platforms.map(
                (platform) => {
                  const isSelected =
                    selectedPlatforms.includes(
                      platform
                    );

                  return (
                    <label
                      key={platform}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                          : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={
                          isSelected
                        }
                        onChange={() =>
                          handlePlatformChange(
                            platform
                          )
                        }
                        className="h-4 w-4 accent-indigo-600"
                      />

                      <span className="font-medium">
                        {
                          platform
                        }
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* ---------- Post Content ---------- */}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="content"
                className="text-sm font-medium text-gray-700"
              >
                Post Content
              </label>

              <span className="text-xs text-gray-400">
                {
                  content.length
                }{" "}
                characters
              </span>
            </div>

            <textarea
              id="content"
              value={content}
              onChange={(event) =>
                setContent(
                  event.target.value
                )
              }
              placeholder="Write or paste your social media content here..."
              rows={7}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm leading-6 text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* ---------- Schedule Date and Time ---------- */}

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Posting Date */}

            <div>
              <label
                htmlFor="postingDate"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <CalendarDays
                  size={16}
                  className="text-indigo-600"
                />

                Posting Date
              </label>

              <input
                id="postingDate"
                type="date"
                value={postingDate}
                min={
                  getCurrentLocalDate()
                }
                onChange={(event) => {
                  const newDate =
                    event.target.value;

                  setPostingDate(
                    newDate
                  );

                  if (
                    newDate ===
                      getCurrentLocalDate() &&
                    postingTime &&
                    postingTime <=
                      getCurrentLocalTime()
                  ) {
                    setPostingTime(
                      ""
                    );
                  }
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <p className="mt-2 text-xs text-gray-500">
                You can select today or any future date.
              </p>
            </div>

            {/* Posting Time */}

            <div>
              <label
                htmlFor="postingTime"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Clock
                  size={16}
                  className="text-indigo-600"
                />

                Posting Time
              </label>

              <input
                id="postingTime"
                type="time"
                value={postingTime}
                min={
                  minimumPostingTime
                }
                disabled={
                  !postingDate
                }
                onChange={(event) =>
                  setPostingTime(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              />

              <p className="mt-2 text-xs text-gray-500">
                {!postingDate
                  ? "Select a posting date first."
                  : postingDate ===
                    getCurrentLocalDate()
                  ? "Past times are not available for today."
                  : "Select any time for the chosen future date."}
              </p>
            </div>
          </div>

          {/* ---------- Message ---------- */}

          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.includes(
                  "successfully"
                )
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          {/* ---------- Action Buttons ---------- */}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={
                handleSaveDraft
              }
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save
                size={17}
              />

              {isSubmitting ? "Saving..." : "Save as Draft"}
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={
                handleSchedulePost
              }
              className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send
                size={17}
              />

              {isSubmitting ? "Scheduling..." : "Schedule Post"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}