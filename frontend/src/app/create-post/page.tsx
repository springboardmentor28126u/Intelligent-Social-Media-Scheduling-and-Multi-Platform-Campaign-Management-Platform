"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createPost,
  publishLinkedInPost,
} from "@/lib/api";


const purposes = [
  "Educate",
  "Promote",
  "Engage",
  "Announce",
];

const tones = [
  "Professional",
  "Friendly",
  "Bold",
  "Creative",
];

const platforms = [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "X",
  "YouTube",
];

const contentTypes = [
  "text",
  "image",
  "video",
  "carousel",
];


export default function CreatePostPage() {
  const router = useRouter();


  /* ============================================================
     BASIC CONTENT
  ============================================================ */

  const [idea, setIdea] = useState("");

  const [purpose, setPurpose] =
    useState("Educate");

  const [tone, setTone] =
    useState("Professional");


  /* ============================================================
     PLATFORM SELECTION
  ============================================================ */

  const [selectedPlatforms, setSelectedPlatforms] =
    useState<string[]>([
      "LinkedIn",
    ]);


  /* ============================================================
     CONTENT TYPE
  ============================================================ */

  const [contentType, setContentType] =
    useState("text");


  /* ============================================================
     GENERATED CONTENT
  ============================================================ */

  const [generatedPost, setGeneratedPost] =
    useState("");


  /* ============================================================
     LOADING STATES
  ============================================================ */

  const [generating, setGenerating] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [publishing, setPublishing] =
    useState(false);


  /* ============================================================
     SCHEDULING
  ============================================================ */

  const [scheduleDate, setScheduleDate] =
    useState("");

  const [scheduleTime, setScheduleTime] =
    useState("");


  /* ============================================================
     MESSAGES
  ============================================================ */

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /* ============================================================
     PLATFORM SELECTION
  ============================================================ */

  function togglePlatform(
    platform: string
  ) {
    setSelectedPlatforms((current) => {

      if (current.includes(platform)) {

        // Don't allow removing the
        // last selected platform.
        if (current.length === 1) {
          return current;
        }

        return current.filter(
          (item) => item !== platform
        );
      }

      return [
        ...current,
        platform,
      ];
    });
  }


  /* ============================================================
     GENERATE AI PREVIEW
  ============================================================ */

  function generatePreview() {

    if (!idea.trim()) {
      setError(
        "Please enter an idea first."
      );
      return;
    }

    if (
      selectedPlatforms.length === 0
    ) {
      setError(
        "Please select at least one platform."
      );
      return;
    }

    setError("");
    setMessage("");
    setGenerating(true);

    setTimeout(() => {

      setGeneratedPost(
        `🚀 ${idea.trim()}

Here's an engaging ${purpose.toLowerCase()} post designed for ${selectedPlatforms.join(
          ", "
        )}.

The future belongs to people who don't just follow change — they understand it, experiment with it, and turn it into opportunity.

What do you think?

#Innovation #Technology #Growth`
      );

      setGenerating(false);

    }, 800);
  }


  /* ============================================================
     CLEAR COMPOSER
  ============================================================ */

  function clearComposer() {

    setIdea("");

    setGeneratedPost("");

    setScheduleDate("");

    setScheduleTime("");

    setMessage("");

    setError("");
  }


  /* ============================================================
     PUBLISH DIRECTLY TO LINKEDIN
  ============================================================ */

  async function publishPost() {

    setError("");
    setMessage("");


    /* ----------------------------------------------------------
       CONTENT
    ---------------------------------------------------------- */

    const content =
      generatedPost.trim() ||
      idea.trim();


    if (!content) {

      setError(
        "Please create some content before publishing."
      );

      return;
    }


    /* ----------------------------------------------------------
       PLATFORM
    ---------------------------------------------------------- */

    const linkedinSelected =
      selectedPlatforms.some(
        (platform) =>
          platform.toLowerCase() ===
          "linkedin"
      );


    if (!linkedinSelected) {

      setError(
        "Please select LinkedIn to publish directly."
      );

      return;
    }


    /* ----------------------------------------------------------
       CONTENT TYPE
    ---------------------------------------------------------- */

    if (
      contentType.toLowerCase() !==
      "text"
    ) {

      setError(
        "Direct LinkedIn publishing currently supports text posts only."
      );

      return;
    }


    /* ----------------------------------------------------------
       PUBLISH
    ---------------------------------------------------------- */

    try {

      setPublishing(true);

      const result =
        await publishLinkedInPost(
          content
        );


      setMessage(
        result.post_id
          ? `✓ Published successfully to LinkedIn.`
          : "✓ LinkedIn post published successfully."
      );


      /*
        Clear the generated content only
        after successful publishing.
      */
      setGeneratedPost("");

    } catch (err: unknown) {

      console.error(
        "LinkedIn publishing error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to publish to LinkedIn."
      );

    } finally {

      setPublishing(false);
    }
  }


  /* ============================================================
     SAVE POST
  ============================================================ */

  async function savePost(
    status: "draft" | "scheduled"
  ) {

    setError("");
    setMessage("");


    /* ----------------------------------------------------------
       CONTENT
    ---------------------------------------------------------- */

    const content =
      generatedPost.trim() ||
      idea.trim();


    if (!content) {

      setError(
        "Please create some content before saving."
      );

      return;
    }


    /* ----------------------------------------------------------
       PLATFORM
    ---------------------------------------------------------- */

    if (
      selectedPlatforms.length === 0
    ) {

      setError(
        "Please select at least one platform."
      );

      return;
    }


    /* ----------------------------------------------------------
       SCHEDULE
    ---------------------------------------------------------- */

    let scheduledAt:
      string | null = null;


    if (status === "scheduled") {

      if (
        !scheduleDate ||
        !scheduleTime
      ) {

        setError(
          "Please select a date and time for scheduling."
        );

        return;
      }


      scheduledAt =
        `${scheduleDate}T${scheduleTime}`;


      const selectedDate =
        new Date(scheduledAt);


      if (
        selectedDate.getTime() <=
        Date.now()
      ) {

        setError(
          "Please select a future date and time."
        );

        return;
      }
    }


    /* ----------------------------------------------------------
       SAVE
    ---------------------------------------------------------- */

    try {

      setSaving(true);


      await createPost({
        content,
        platforms:
          selectedPlatforms,
        content_type:
          contentType,
        status,
        scheduled_at:
          scheduledAt,
      });


      if (
        status === "draft"
      ) {

        setMessage(
          "✓ Draft saved successfully."
        );

      } else {

        setMessage(
          "✓ Post scheduled successfully."
        );
      }


      setTimeout(() => {
        router.push(
          "/dashboard"
        );
      }, 1000);


    } catch (err: unknown) {

      if (
        err instanceof Error
      ) {

        setError(
          err.message
        );

      } else {

        setError(
          "Something went wrong while saving the post."
        );
      }

    } finally {

      setSaving(false);
    }
  }


  /* ============================================================
     UI
  ============================================================ */

  return (

    <main
      className="min-h-screen"
      style={{
        background:
          "var(--sp-bg)",

        color:
          "var(--sp-text)",

        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >


      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <header
        className="border-b px-6 py-5 md:px-10"
        style={{
          borderColor:
            "var(--sp-border)",
        }}
      >

        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="flex items-center gap-3"
          >

            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))",

                color:
                  "#05060A",
              }}
            >
              S
            </span>


            <span
              className="font-semibold"
              style={{
                fontFamily:
                  "var(--font-fraunces), serif",
              }}
            >
              SocialPilot
            </span>

          </button>


          <button
            onClick={() =>
              router.push(
                "/dashboard"
              )
            }
            className="text-xs"
            style={{
              color:
                "var(--sp-muted)",
            }}
          >
            ← Command Center
          </button>

        </div>

      </header>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">


        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="mb-10">

          <p
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{
              color:
                "var(--sp-cyan)",
            }}
          >
            Content Composer
          </p>


          <h1
            className="mt-2 text-4xl"
            style={{
              fontFamily:
                "var(--font-fraunces), serif",

              fontWeight: 600,
            }}
          >
            Turn an idea into a signal.
          </h1>


          <p
            className="mt-3 max-w-xl text-sm leading-6"
            style={{
              color:
                "var(--sp-muted)",
            }}
          >
            Give SocialPilot the thought.
            Shape the intent. Let AI help
            transform it into content your
            audience can understand.
          </p>

        </div>


        {/* ====================================================
            SUCCESS / ERROR
        ==================================================== */}

        {(message || error) && (

          <div
            className="mb-6 rounded-2xl px-5 py-4 text-sm"
            style={{
              background:
                error
                  ? "rgba(255,80,80,0.08)"
                  : "rgba(53,230,161,0.08)",

              border:
                error
                  ? "1px solid rgba(255,80,80,0.2)"
                  : "1px solid rgba(53,230,161,0.2)",

              color:
                error
                  ? "#ff7070"
                  : "var(--sp-green)",
            }}
          >
            {error || message}
          </div>

        )}


        {/* ====================================================
            WORKSPACE
        ==================================================== */}

        <div className="grid gap-6 lg:grid-cols-2">


          {/* ==================================================
              LEFT — COMPOSER
          ================================================== */}

          <section
            className="rounded-3xl p-6 md:p-8"
            style={{
              background:
                "var(--sp-hover)",

              border:
                "1px solid var(--sp-border)",
            }}
          >


            <div className="mb-6 flex items-center justify-between">

              <div>

                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{
                    color:
                      "var(--sp-subtle)",
                  }}
                >
                  01 / Idea
                </p>


                <h2
                  className="mt-1 text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  Start with a thought
                </h2>

              </div>


              <button
                onClick={
                  clearComposer
                }
                className="text-xs"
                style={{
                  color:
                    "var(--sp-subtle)",
                }}
              >
                Clear
              </button>

            </div>


            {/* IDEA */}

            <textarea
              value={idea}
              onChange={(e) =>
                setIdea(
                  e.target.value
                )
              }
              placeholder="Example: Explain why AI skills are becoming important for students..."
              className="h-44 w-full resize-none rounded-2xl p-5 text-sm leading-6 outline-none"
              style={{
                background:
                  "var(--sp-input)",

                border:
                  "1px solid var(--sp-border)",

                color:
                  "var(--sp-input-text)",
              }}
            />


            {/* PURPOSE */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color:
                    "var(--sp-subtle)",
                }}
              >
                Purpose
              </p>


              <div className="flex flex-wrap gap-2">

                {purposes.map(
                  (item) => {

                    const active =
                      purpose === item;


                    return (
                      <button
                        key={item}
                        onClick={() =>
                          setPurpose(
                            item
                          )
                        }
                        className="rounded-xl px-4 py-2.5 text-xs transition-all"
                        style={{
                          background:
                            active
                              ? "rgba(0,229,255,0.1)"
                              : "var(--sp-hover)",

                          border:
                            active
                              ? "1px solid rgba(0,229,255,0.2)"
                              : "1px solid var(--sp-border)",

                          color:
                            active
                              ? "var(--sp-cyan)"
                              : "var(--sp-text-secondary)",
                        }}
                      >
                        {item}
                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* PLATFORMS */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color:
                    "var(--sp-subtle)",
                }}
              >
                Destinations
              </p>


              <p
                className="mb-3 text-xs"
                style={{
                  color:
                    "var(--sp-muted)",
                }}
              >
                Select one or more platforms
              </p>


              <div className="grid grid-cols-2 gap-2">

                {platforms.map(
                  (item) => {

                    const active =
                      selectedPlatforms.includes(
                        item
                      );


                    return (
                      <button
                        key={item}
                        onClick={() =>
                          togglePlatform(
                            item
                          )
                        }
                        className="rounded-xl p-3 text-left text-xs transition-all"
                        style={{
                          background:
                            active
                              ? "rgba(155,92,255,0.1)"
                              : "var(--sp-hover)",

                          border:
                            active
                              ? "1px solid rgba(155,92,255,0.25)"
                              : "1px solid var(--sp-border)",

                          color:
                            active
                              ? "var(--sp-purple)"
                              : "var(--sp-text-secondary)",
                        }}
                      >
                        {active
                          ? "✓ "
                          : ""}
                        {item}
                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* CONTENT TYPE */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color:
                    "var(--sp-subtle)",
                }}
              >
                Content Type
              </p>


              <div className="grid grid-cols-2 gap-2">

                {contentTypes.map(
                  (item) => {

                    const active =
                      contentType === item;


                    return (
                      <button
                        key={item}
                        onClick={() =>
                          setContentType(
                            item
                          )
                        }
                        className="rounded-xl p-3 text-left text-xs"
                        style={{
                          background:
                            active
                              ? "rgba(0,229,255,0.1)"
                              : "var(--sp-hover)",

                          border:
                            active
                              ? "1px solid rgba(0,229,255,0.2)"
                              : "1px solid var(--sp-border)",

                          color:
                            active
                              ? "var(--sp-cyan)"
                              : "var(--sp-text-secondary)",
                        }}
                      >
                        {item
                          .charAt(0)
                          .toUpperCase() +
                          item.slice(1)}
                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* TONE */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color:
                    "var(--sp-subtle)",
                }}
              >
                Voice
              </p>


              <div className="flex flex-wrap gap-2">

                {tones.map(
                  (item) => {

                    const active =
                      tone === item;


                    return (
                      <button
                        key={item}
                        onClick={() =>
                          setTone(
                            item
                          )
                        }
                        className="rounded-xl px-4 py-2.5 text-xs"
                        style={{
                          background:
                            active
                              ? "rgba(155,92,255,0.1)"
                              : "var(--sp-hover)",

                          border:
                            active
                              ? "1px solid rgba(155,92,255,0.2)"
                              : "1px solid var(--sp-border)",

                          color:
                            active
                              ? "var(--sp-purple)"
                              : "var(--sp-text-secondary)",
                        }}
                      >
                        {item}
                      </button>
                    );
                  }
                )}

              </div>

            </div>


            {/* GENERATE */}

            <button
              onClick={
                generatePreview
              }
              disabled={
                generating ||
                !idea.trim()
              }
              className="mt-8 w-full rounded-2xl py-4 text-sm font-semibold transition-opacity disabled:opacity-30"
              style={{
                background:
                  "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))",

                color:
                  "#05060A",
              }}
            >
              {generating
                ? "✦ Thinking..."
                : "✦ Generate with AI"}
            </button>

          </section>


          {/* ==================================================
              RIGHT — PREVIEW
          ================================================== */}

          <section
            className="rounded-3xl p-6 md:p-8"
            style={{
              background:
                "var(--sp-hover)",

              border:
                "1px solid var(--sp-border)",
            }}
          >

            <div className="mb-6">

              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color:
                    "var(--sp-subtle)",
                }}
              >
                02 / Preview
              </p>


              <div className="mt-1 flex items-center justify-between">

                <h2
                  className="text-lg"
                  style={{
                    fontFamily:
                      "var(--font-fraunces), serif",
                  }}
                >
                  {selectedPlatforms.length ===
                  1
                    ? selectedPlatforms[0]
                    : `${selectedPlatforms.length} platforms`}{" "}
                  signal
                </h2>


                <span
                  className="rounded-full px-3 py-1 text-[9px]"
                  style={{
                    background:
                      "rgba(53,230,161,0.08)",

                    color:
                      "var(--sp-green)",
                  }}
                >
                  AI READY
                </span>

              </div>

            </div>


            {/* PREVIEW */}

            <div
              className="min-h-[380px] rounded-2xl p-6"
              style={{
                background:
                  "var(--sp-input)",

                border:
                  "1px solid var(--sp-border)",
              }}
            >

              {generatedPost ? (

                <div className="whitespace-pre-wrap text-sm leading-7">
                  {generatedPost}
                </div>

              ) : (

                <div className="flex min-h-[330px] items-center justify-center text-center">

                  <div>

                    <div
                      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl"
                      style={{
                        background:
                          "rgba(0,229,255,0.07)",

                        color:
                          "var(--sp-cyan)",
                      }}
                    >
                      ✦
                    </div>


                    <p
                      className="mt-5 text-sm"
                      style={{
                        color:
                          "var(--sp-text-secondary)",
                      }}
                    >
                      Your generated content
                      will appear here.
                    </p>


                    <p
                      className="mt-2 text-xs"
                      style={{
                        color:
                          "var(--sp-subtle)",
                      }}
                    >
                      Start with an idea →
                    </p>

                  </div>

                </div>

              )}

            </div>


            {/* SCHEDULING + ACTIONS */}

            {generatedPost && (

              <>

                {/* SCHEDULE */}

                <div className="mt-6">

                  <p
                    className="mb-3 text-[10px] uppercase tracking-widest"
                    style={{
                      color:
                        "var(--sp-subtle)",
                    }}
                  >
                    Schedule
                  </p>


                  <div className="grid grid-cols-2 gap-3">

                    <input
                      type="date"
                      value={
                        scheduleDate
                      }
                      onChange={(e) =>
                        setScheduleDate(
                          e.target.value
                        )
                      }
                      className="rounded-xl px-4 py-3 text-xs outline-none"
                      style={{
                        background:
                          "var(--sp-input)",

                        border:
                          "1px solid var(--sp-border)",

                        color:
                          "var(--sp-input-text)",
                      }}
                    />


                    <input
                      type="time"
                      value={
                        scheduleTime
                      }
                      onChange={(e) =>
                        setScheduleTime(
                          e.target.value
                        )
                      }
                      className="rounded-xl px-4 py-3 text-xs outline-none"
                      style={{
                        background:
                          "var(--sp-input)",

                        border:
                          "1px solid var(--sp-border)",

                        color:
                          "var(--sp-input-text)",
                      }}
                    />

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="mt-4 grid grid-cols-2 gap-3">

                  <button
                    onClick={
                      generatePreview
                    }
                    disabled={
                      saving ||
                      publishing
                    }
                    className="rounded-xl py-3 text-xs"
                    style={{
                      background:
                        "var(--sp-hover)",

                      border:
                        "1px solid var(--sp-border)",

                      color:
                        "var(--sp-text-secondary)",
                    }}
                  >
                    ↻ Regenerate
                  </button>


                  <button
                    onClick={() =>
                      savePost("draft")
                    }
                    disabled={
                      saving ||
                      publishing
                    }
                    className="rounded-xl py-3 text-xs font-semibold"
                    style={{
                      background:
                        "rgba(0,229,255,0.1)",

                      border:
                        "1px solid rgba(0,229,255,0.15)",

                      color:
                        "var(--sp-cyan)",
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Draft →"}
                  </button>

                </div>


                {/* SCHEDULE */}

                <button
                  onClick={() =>
                    savePost(
                      "scheduled"
                    )
                  }
                  disabled={
                    saving ||
                    publishing
                  }
                  className="mt-3 w-full rounded-xl py-3 text-xs font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))",

                    color:
                      "#05060A",
                  }}
                >
                  {saving
                    ? "Scheduling..."
                    : "Schedule Post →"}
                </button>


                {/* =================================================
                    LINKEDIN DIRECT PUBLISH
                ================================================= */}

                <button
                  onClick={
                    publishPost
                  }
                  disabled={
                    saving ||
                    publishing ||
                    !selectedPlatforms.some(
                      (platform) =>
                        platform.toLowerCase() ===
                        "linkedin"
                    )
                  }
                  className="mt-3 w-full rounded-xl py-3 text-xs font-semibold transition"
                  style={{
                    background:
                      "linear-gradient(135deg,#0A66C2,#004182)",

                    color:
                      "#FFFFFF",

                    opacity:
                      saving ||
                      publishing ||
                      !selectedPlatforms.some(
                        (platform) =>
                          platform.toLowerCase() ===
                          "linkedin"
                      )
                        ? 0.5
                        : 1,
                  }}
                >
                  {publishing
                    ? "Publishing to LinkedIn..."
                    : "Publish to LinkedIn →"}
                </button>

              </>

            )}

          </section>

        </div>

      </div>

    </main>
  );
}