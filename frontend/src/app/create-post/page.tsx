"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
];

export default function CreatePostPage() {
  const router = useRouter();

  const [idea, setIdea] = useState("");
  const [purpose, setPurpose] = useState("Educate");
  const [tone, setTone] = useState("Professional");
  const [platform, setPlatform] = useState("LinkedIn");

  const [generatedPost, setGeneratedPost] =
    useState("");

  const [generating, setGenerating] =
    useState(false);

  function generatePreview() {
    if (!idea.trim()) return;

    setGenerating(true);

    // Temporary AI simulation.
    // We will connect this to FastAPI next.
    setTimeout(() => {
      setGeneratedPost(
        `🚀 ${idea.trim()}

Here's an engaging ${purpose.toLowerCase()} post designed for ${platform}.

The future belongs to people who don't just follow change — they understand it, experiment with it, and turn it into opportunity.

What do you think?

#Innovation #Technology #Growth`
      );

      setGenerating(false);
    }, 800);
  }

  function clearComposer() {
    setIdea("");
    setGeneratedPost("");
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background: "#07080C",
        color: "#E8E9F5",
        fontFamily:
          "var(--font-plex-mono), monospace",
      }}
    >

      {/* TOP BAR */}

      <header
        className="border-b px-6 py-5 md:px-10"
        style={{
          borderColor:
            "rgba(255,255,255,0.07)",
        }}
      >

        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <button
            onClick={() =>
              router.push("/dashboard")
            }
            className="flex items-center gap-3"
          >

            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl font-bold"
              style={{
                background:
                  "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                color: "#05060A",
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
              router.push("/dashboard")
            }
            className="text-xs"
            style={{
              color: "#686B7D",
            }}
          >
            ← Command Center
          </button>

        </div>

      </header>

      {/* CONTENT */}

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">

        {/* TITLE */}

        <div className="mb-10">

          <p
            className="text-[10px] uppercase tracking-[0.3em]"
            style={{
              color: "#00E5FF",
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
              color: "#686B7D",
            }}
          >
            Give SocialPilot the thought.
            Shape the intent. Let AI help
            transform it into content your
            audience can understand.
          </p>

        </div>

        {/* WORKSPACE */}

        <div className="grid gap-6 lg:grid-cols-2">

          {/* LEFT — COMPOSER */}

          <section
            className="rounded-3xl p-6 md:p-8"
            style={{
              background:
                "rgba(255,255,255,0.025)",
              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >

            <div className="mb-6 flex items-center justify-between">

              <div>

                <p
                  className="text-[10px] uppercase tracking-widest"
                  style={{
                    color: "#55596B",
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
                onClick={clearComposer}
                className="text-xs"
                style={{
                  color: "#55596B",
                }}
              >
                Clear
              </button>

            </div>

            {/* IDEA */}

            <textarea
              value={idea}
              onChange={(e) =>
                setIdea(e.target.value)
              }
              placeholder="Example: Explain why AI skills are becoming important for students..."
              className="h-44 w-full resize-none rounded-2xl p-5 text-sm leading-6 outline-none"
              style={{
                background:
                  "rgba(0,0,0,0.2)",
                border:
                  "1px solid rgba(255,255,255,0.07)",
                color: "#E8E9F5",
              }}
            />

            {/* PURPOSE */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color: "#55596B",
                }}
              >
                Purpose
              </p>

              <div className="flex flex-wrap gap-2">

                {purposes.map((item) => {

                  const active =
                    purpose === item;

                  return (
                    <button
                      key={item}
                      onClick={() =>
                        setPurpose(item)
                      }
                      className="rounded-xl px-4 py-2.5 text-xs transition-all"
                      style={{
                        background: active
                          ? "rgba(0,229,255,0.1)"
                          : "rgba(255,255,255,0.03)",

                        border: active
                          ? "1px solid rgba(0,229,255,0.2)"
                          : "1px solid rgba(255,255,255,0.06)",

                        color: active
                          ? "#00E5FF"
                          : "#777A8D",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}

              </div>

            </div>

            {/* PLATFORM */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color: "#55596B",
                }}
              >
                Destination
              </p>

              <div className="grid grid-cols-2 gap-2">

                {platforms.map((item) => {

                  const active =
                    platform === item;

                  return (
                    <button
                      key={item}
                      onClick={() =>
                        setPlatform(item)
                      }
                      className="rounded-xl p-3 text-left text-xs"
                      style={{
                        background: active
                          ? "rgba(155,92,255,0.1)"
                          : "rgba(255,255,255,0.025)",

                        border: active
                          ? "1px solid rgba(155,92,255,0.25)"
                          : "1px solid rgba(255,255,255,0.06)",

                        color: active
                          ? "#B58CFF"
                          : "#777A8D",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}

              </div>

            </div>

            {/* TONE */}

            <div className="mt-7">

              <p
                className="mb-3 text-[10px] uppercase tracking-widest"
                style={{
                  color: "#55596B",
                }}
              >
                Voice
              </p>

              <div className="flex flex-wrap gap-2">

                {tones.map((item) => {

                  const active =
                    tone === item;

                  return (
                    <button
                      key={item}
                      onClick={() =>
                        setTone(item)
                      }
                      className="rounded-xl px-4 py-2.5 text-xs"
                      style={{
                        background: active
                          ? "rgba(155,92,255,0.1)"
                          : "rgba(255,255,255,0.03)",

                        border: active
                          ? "1px solid rgba(155,92,255,0.2)"
                          : "1px solid rgba(255,255,255,0.06)",

                        color: active
                          ? "#B58CFF"
                          : "#777A8D",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}

              </div>

            </div>

            {/* GENERATE */}

            <button
              onClick={generatePreview}
              disabled={
                generating || !idea.trim()
              }
              className="mt-8 w-full rounded-2xl py-4 text-sm font-semibold transition-opacity disabled:opacity-30"
              style={{
                background:
                  "linear-gradient(135deg,#00E5FF,#9B5CFF)",
                color: "#05060A",
              }}
            >
              {generating
                ? "✦ Thinking..."
                : "✦ Generate with AI"}
            </button>

          </section>

          {/* RIGHT — PREVIEW */}

          <section
            className="rounded-3xl p-6 md:p-8"
            style={{
              background:
                "rgba(255,255,255,0.025)",
              border:
                "1px solid rgba(255,255,255,0.07)",
            }}
          >

            <div className="mb-6">

              <p
                className="text-[10px] uppercase tracking-widest"
                style={{
                  color: "#55596B",
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
                  {platform} signal
                </h2>

                <span
                  className="rounded-full px-3 py-1 text-[9px]"
                  style={{
                    background:
                      "rgba(53,230,161,0.08)",
                    color: "#35E6A1",
                  }}
                >
                  AI READY
                </span>

              </div>

            </div>

            {/* POST */}

            <div
              className="min-h-[380px] rounded-2xl p-6"
              style={{
                background: "#0B0C12",
                border:
                  "1px solid rgba(255,255,255,0.06)",
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
                        color: "#00E5FF",
                      }}
                    >
                      ✦
                    </div>

                    <p
                      className="mt-5 text-sm"
                      style={{
                        color: "#777A8D",
                      }}
                    >
                      Your generated content
                      will appear here.
                    </p>

                    <p
                      className="mt-2 text-xs"
                      style={{
                        color: "#4F5262",
                      }}
                    >
                      Start with an idea →
                    </p>

                  </div>

                </div>

              )}

            </div>

            {/* ACTIONS */}

            {generatedPost && (

              <div className="mt-4 grid grid-cols-2 gap-3">

                <button
                  onClick={generatePreview}
                  className="rounded-xl py-3 text-xs"
                  style={{
                    background:
                      "rgba(255,255,255,0.04)",
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                    color: "#85889A",
                  }}
                >
                  ↻ Regenerate
                </button>

                <button
                  onClick={() =>
                    router.push("/dashboard")
                  }
                  className="rounded-xl py-3 text-xs font-semibold"
                  style={{
                    background:
                      "rgba(0,229,255,0.1)",
                    border:
                      "1px solid rgba(0,229,255,0.15)",
                    color: "#00E5FF",
                  }}
                >
                  Save draft →
                </button>

              </div>

            )}

          </section>

        </div>

      </div>

    </main>
  );
}