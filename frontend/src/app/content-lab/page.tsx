"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ContentStatus = "idea" | "draft" | "ready";

type ContentItem = {
  id: number;
  title: string;
  text: string;
  platform: string;
  status: ContentStatus;
  createdAt: string;
};

const STORAGE_KEY = "socialpilot_content";

const PLATFORM_DATA: Record<
  string,
  { icon: string; label: string }
> = {
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
  twitter: {
    icon: "𝕏",
    label: "X",
  },
  youtube: {
    icon: "▶",
    label: "YouTube",
  },
  pinterest: {
    icon: "P",
    label: "Pinterest",
  },
};

const SAMPLE_CONTENT: ContentItem[] = [
  {
    id: 1,
    title: "AI is changing how we work",
    text:
      "Artificial intelligence is not simply replacing tasks. It is changing how people think, create and solve problems.",
    platform: "linkedin",
    status: "ready",
    createdAt: "Today",
  },
  {
    id: 2,
    title: "5 lessons from building with AI",
    text:
      "Start small. Test quickly. Listen to users. Improve continuously. The best AI products are built around real problems.",
    platform: "linkedin",
    status: "draft",
    createdAt: "Yesterday",
  },
  {
    id: 3,
    title: "Weekend content idea",
    text:
      "Share a simple behind-the-scenes story about your latest project.",
    platform: "instagram",
    status: "idea",
    createdAt: "2 days ago",
  },
];

export default function ContentLabPage() {
  const router = useRouter();

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    "all" | ContentStatus
  >("all");

  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] =
    useState<ContentItem | null>(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [status, setStatus] =
    useState<ContentStatus>("draft");

  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* =========================================================
     LOAD CONTENT
  ========================================================= */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setContents(SAMPLE_CONTENT);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(SAMPLE_CONTENT)
        );
        return;
      }

      try {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setContents(parsed);
        } else {
          setContents(SAMPLE_CONTENT);
        }
      } catch (error) {
        console.error(
          "Failed to load saved content:",
          error
        );

        setContents(SAMPLE_CONTENT);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  /* =========================================================
     SAVE CONTENT
  ========================================================= */

  function saveContents(updated: ContentItem[]) {
    setContents(updated);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated)
    );
  }

  /* =========================================================
     FILTER CONTENT
  ========================================================= */

  const filteredContents = useMemo(() => {
    return contents.filter((item) => {
      const matchesFilter =
        activeFilter === "all" ||
        item.status === activeFilter;

      const searchText = search
        .trim()
        .toLowerCase();

      const matchesSearch =
        !searchText ||
        item.title
          .toLowerCase()
          .includes(searchText) ||
        item.text
          .toLowerCase()
          .includes(searchText) ||
        item.platform
          .toLowerCase()
          .includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [contents, activeFilter, search]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const ideaCount = contents.filter(
    (item) => item.status === "idea"
  ).length;

  const draftCount = contents.filter(
    (item) => item.status === "draft"
  ).length;

  const readyCount = contents.filter(
    (item) => item.status === "ready"
  ).length;

  /* =========================================================
     OPEN COMPOSER
  ========================================================= */

  function openComposer() {
    setEditingId(null);
    setTitle("");
    setText("");
    setPlatform("linkedin");
    setStatus("draft");
    setMessage("");
    setShowComposer(true);
  }

  /* =========================================================
     EDIT CONTENT
  ========================================================= */

  function editContent(item: ContentItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setText(item.text);
    setPlatform(item.platform);
    setStatus(item.status);
    setMessage("");
    setShowComposer(true);
  }

  /* =========================================================
     SAVE / UPDATE CONTENT
  ========================================================= */

  function handleSaveContent(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      setMessage(
        "Please enter a title and content."
      );
      return;
    }

    if (editingId !== null) {
      const updated = contents.map((item) =>
        item.id === editingId
          ? {
              ...item,
              title: title.trim(),
              text: text.trim(),
              platform,
              status,
            }
          : item
      );

      saveContents(updated);

      setMessage(
        "Content updated successfully."
      );
    } else {
      const newContent: ContentItem = {
        id: Date.now(),
        title: title.trim(),
        text: text.trim(),
        platform,
        status,
        createdAt: "Just now",
      };

      saveContents([
        newContent,
        ...contents,
      ]);

      setMessage(
        "Content saved successfully."
      );
    }

    setTitle("");
    setText("");
    setEditingId(null);
    setShowComposer(false);
  }

  /* =========================================================
     DELETE CONTENT
  ========================================================= */

  function deleteContent(id: number) {
    const confirmed = window.confirm(
      "Delete this content?"
    );

    if (!confirmed) return;

    const updated = contents.filter(
      (item) => item.id !== id
    );

    saveContents(updated);
    setSelectedContent(null);
  }

  /* =========================================================
     CHANGE STATUS
  ========================================================= */

  function changeStatus(
    id: number,
    newStatus: ContentStatus
  ) {
    const updated = contents.map((item) =>
      item.id === id
        ? {
            ...item,
            status: newStatus,
          }
        : item
    );

    saveContents(updated);

    if (selectedContent?.id === id) {
      setSelectedContent({
        ...selectedContent,
        status: newStatus,
      });
    }
  }

  /* =========================================================
     AI REGENERATE
  ========================================================= */

  function regenerateWithAI() {
    if (!text.trim()) {
      setMessage(
        "Write some content first."
      );
      return;
    }

    setAiLoading(true);
    setMessage("");

    window.setTimeout(() => {
      const regenerated = `Here is a refreshed version of your idea:

${text.trim()}

The key message is simple: create useful content, experiment consistently, and learn from your audience.`;

      setText(regenerated);
      setAiLoading(false);
      setMessage(
        "AI generated a refreshed version."
      );
    }, 1200);
  }

  /* =========================================================
     CLEAR ALL CONTENT
  ========================================================= */

  function clearAllContent() {
    const confirmed = window.confirm(
      "Remove all saved content?"
    );

    if (!confirmed) return;

    saveContents([]);
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">

        {/* =====================================================
            MASTER SIDEBAR
        ===================================================== */}

        <aside className="hidden w-72 shrink-0 bg-slate-200 border-r border-slate-300 flex-col shadow-sm md:flex">

          {/* LOGO */}
          <div className="px-6 py-7 border-b border-slate-300">
            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="text-left"
            >
              <div className="text-2xl font-bold text-sky-600 tracking-tight">
                SocialPilot
              </div>

              <p className="text-sm text-slate-500 mt-1">
                Social Media Command Center
              </p>
            </button>
          </div>

          {/* NAVIGATION */}
          <nav className="flex-1 p-4">

            <p className="px-3 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Workspace
            </p>

            {/* COMMAND CENTER */}
            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-sky-700 transition mb-1"
            >
              <span className="text-xl">
                ⌂
              </span>

              Command Center
            </button>

            {/* CREATE */}
            <button
              onClick={() =>
                router.push("/create-post")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-sky-700 transition mb-1"
            >
              <span className="text-xl">
                ＋
              </span>

              Create
            </button>

            {/* CONTENT LAB - ACTIVE */}
            <button
              onClick={() =>
                router.push("/content-lab")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-semibold bg-white text-sky-700 border border-slate-300 mb-1 shadow-sm"
            >
              <span className="text-xl">
                ✦
              </span>

              Content Lab
            </button>

            {/* INSIGHTS */}
            <button
              onClick={() =>
                router.push("/insights")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-sky-700 transition mb-1"
            >
              <span className="text-xl">
                ◷
              </span>

              Insights
            </button>

            {/* AUDIENCE */}
            <button
              onClick={() =>
                router.push("/audience")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-sky-700 transition mb-1"
            >
              <span className="text-xl">
                ◎
              </span>

              Audience
            </button>

            {/* PUBLISHING CALENDAR */}
            <button
              onClick={() =>
                router.push("/calender")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-sky-700 transition mb-1"
            >
              <span className="text-xl">
                ▣
              </span>

              Publishing Calendar
            </button>

            <div className="my-6 border-t border-slate-300" />

            {/* ACCOUNT */}
            <p className="px-3 mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Account
            </p>

            {/* SETTINGS */}
            <button
              onClick={() =>
                router.push("/settings")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-sky-700 transition mb-1"
            >
              <span className="text-xl">
                ⚙
              </span>

              Settings
            </button>
          </nav>

          {/* USER FOOTER */}
          <div className="border-t border-slate-300 p-5">

            <div className="flex items-center gap-3 mb-4">

              <div className="w-11 h-11 rounded-full bg-sky-500 text-white flex items-center justify-center text-base font-bold">
                SP
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  SocialPilot User
                </p>

                <p className="text-xs text-slate-500 truncate">
                  Social Media Manager
                </p>
              </div>

            </div>

            <button
              onClick={() => {
                localStorage.removeItem(
                  "access_token"
                );

                router.push("/login");
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-base font-medium text-red-500 hover:bg-red-50 transition"
            >
              Sign out
            </button>

          </div>
        </aside>

        {/* =====================================================
            MAIN CONTENT
        ===================================================== */}

        <section className="flex-1 min-w-0">

          {/* HEADER */}
          <header className="flex items-center justify-between bg-white border-b border-slate-300 px-6 py-5 md:px-10 shadow-sm">

            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-sky-600">
                Content Lab
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Turn ideas into publish-ready content.
              </p>
            </div>

            <button
              onClick={openComposer}
              className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-600 transition"
            >
              + New content
            </button>

          </header>

          {/* CONTENT AREA */}
          <div className="mx-auto max-w-7xl p-6 md:p-10">

            {/* PAGE INTRO */}
            <div className="mb-8">

              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Your content, evolving.
              </h1>

              <p className="mt-2 max-w-xl text-base leading-7 text-slate-500">
                Capture ideas, shape drafts, and move your strongest content toward ready.
              </p>

            </div>

            {/* =================================================
                STAT CARDS
            ================================================= */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <StatCard
                label="Everything"
                value={contents.length}
                active={
                  activeFilter === "all"
                }
                onClick={() =>
                  setActiveFilter("all")
                }
              />

              <StatCard
                label="Ideas"
                value={ideaCount}
                active={
                  activeFilter === "idea"
                }
                onClick={() =>
                  setActiveFilter("idea")
                }
              />

              <StatCard
                label="Drafts"
                value={draftCount}
                active={
                  activeFilter === "draft"
                }
                onClick={() =>
                  setActiveFilter("draft")
                }
              />

              <StatCard
                label="Ready"
                value={readyCount}
                active={
                  activeFilter === "ready"
                }
                onClick={() =>
                  setActiveFilter("ready")
                }
              />

            </div>

            {/* =================================================
                SEARCH
            ================================================= */}

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <div className="relative flex-1">

                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  ⌕
                </span>

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search your content..."
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />

              </div>

              {contents.length > 0 && (
                <button
                  onClick={clearAllContent}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Clear library
                </button>
              )}

            </div>

            {/* =================================================
                CONTENT GRID
            ================================================= */}

            <div className="mt-8">

              {filteredContents.length === 0 ? (

                /* EMPTY STATE */

                <div className="rounded-2xl border border-slate-300 bg-white p-12 text-center shadow-sm">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-2xl text-sky-500">
                    ✦
                  </div>

                  <h2 className="mt-5 text-xl font-bold text-slate-900">
                    Nothing here yet.
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Start with an idea and build it into something worth sharing.
                  </p>

                  <button
                    onClick={openComposer}
                    className="mt-6 rounded-xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-600 transition"
                  >
                    Create your first piece
                  </button>

                </div>

              ) : (

                /* CONTENT CARDS */

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

                  {filteredContents.map(
                    (item) => {

                      const platformInfo =
                        PLATFORM_DATA[
                          item.platform
                        ];

                      return (
                        <article
                          key={item.id}
                          className="group rounded-2xl border border-slate-300 bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                        >

                          {/* PLATFORM + STATUS */}
                          <div className="flex items-center justify-between">

                            <div className="flex items-center gap-2">

                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                                {platformInfo?.icon ||
                                  "●"}
                              </span>

                              <span className="text-sm text-slate-500">
                                {platformInfo?.label ||
                                  item.platform}
                              </span>

                            </div>

                            <StatusBadge
                              status={
                                item.status
                              }
                            />

                          </div>

                          {/* TITLE */}
                          <h2 className="mt-5 text-lg font-bold leading-6 text-slate-900">
                            {item.title}
                          </h2>

                          {/* CONTENT */}
                          <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-600">
                            {item.text}
                          </p>

                          {/* FOOTER */}
                          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">

                            <span className="text-xs text-slate-400">
                              {item.createdAt}
                            </span>

                            <div className="flex gap-2">

                              <button
                                onClick={() =>
                                  setSelectedContent(
                                    item
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                              >
                                View
                              </button>

                              <button
                                onClick={() =>
                                  editContent(
                                    item
                                  )
                                }
                                className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
                              >
                                Edit
                              </button>

                            </div>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>
        </section>
      </div>

      {/* =======================================================
          COMPOSER MODAL
      ======================================================= */}

      {showComposer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setShowComposer(false);
            }
          }}
        >

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-300 bg-white p-6 shadow-xl">

            {/* MODAL HEADER */}
            <div className="flex items-start justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-widest text-sky-600">
                  {editingId
                    ? "Edit content"
                    : "Content studio"}
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  Shape your next idea.
                </h2>

              </div>

              <button
                onClick={() =>
                  setShowComposer(false)
                }
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>

            </div>

            {/* FORM */}
            <form
              onSubmit={handleSaveContent}
              className="mt-8 space-y-5"
            >

              {/* TITLE */}
              <div>

                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Title
                </label>

                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Give your content a name"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />

              </div>

              {/* PLATFORM + STAGE */}
              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Platform
                  </label>

                  <select
                    value={platform}
                    onChange={(e) =>
                      setPlatform(
                        e.target.value
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="linkedin">
                      LinkedIn
                    </option>

                    <option value="instagram">
                      Instagram
                    </option>

                    <option value="facebook">
                      Facebook
                    </option>

                    <option value="twitter">
                      X
                    </option>

                    <option value="youtube">
                      YouTube
                    </option>

                    <option value="pinterest">
                      Pinterest
                    </option>
                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Stage
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(
                        e.target.value as ContentStatus
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  >
                    <option value="idea">
                      Idea
                    </option>

                    <option value="draft">
                      Draft
                    </option>

                    <option value="ready">
                      Ready
                    </option>
                  </select>

                </div>

              </div>

              {/* CONTENT */}
              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    Content
                  </label>

                  <button
                    type="button"
                    onClick={regenerateWithAI}
                    disabled={aiLoading}
                    className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50 transition"
                  >
                    {aiLoading
                      ? "Generating..."
                      : "✦ Regenerate with AI"}
                  </button>

                </div>

                <textarea
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value)
                  }
                  rows={9}
                  placeholder="Write your idea or draft here..."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />

                <div className="mt-2 text-right text-xs text-slate-400">
                  {text.length} characters
                </div>

              </div>

              {/* MESSAGE */}
              {message && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-700">
                  {message}
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setShowComposer(false)
                  }
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white hover:bg-sky-600 transition"
                >
                  {editingId
                    ? "Update content"
                    : "Save content"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =======================================================
          VIEW MODAL
      ======================================================= */}

      {selectedContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setSelectedContent(null);
            }
          }}
        >

          <div className="w-full max-w-xl rounded-2xl border border-slate-300 bg-white p-6 shadow-xl">

            {/* HEADER */}
            <div className="flex items-center justify-between">

              <StatusBadge
                status={
                  selectedContent.status
                }
              />

              <button
                onClick={() =>
                  setSelectedContent(null)
                }
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>

            </div>

            {/* TITLE */}
            <h2 className="mt-6 text-2xl font-bold text-slate-900">
              {selectedContent.title}
            </h2>

            {/* CONTENT */}
            <div className="mt-5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              {selectedContent.text}
            </div>

            {/* STATUS ACTIONS */}
            <div className="mt-6 flex flex-wrap gap-2">

              <button
                onClick={() =>
                  changeStatus(
                    selectedContent.id,
                    "idea"
                  )
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Move to Idea
              </button>

              <button
                onClick={() =>
                  changeStatus(
                    selectedContent.id,
                    "draft"
                  )
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
              >
                Move to Draft
              </button>

              <button
                onClick={() =>
                  changeStatus(
                    selectedContent.id,
                    "ready"
                  )
                }
                className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
              >
                Mark Ready
              </button>

            </div>

            {/* FOOTER ACTIONS */}
            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() => {
                  setSelectedContent(null);
                  editContent(
                    selectedContent
                  );
                }}
                className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 hover:bg-sky-100 transition"
              >
                Edit
              </button>

              <button
                onClick={() =>
                  deleteContent(
                    selectedContent.id
                  )
                }
                className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition"
              >
                Delete
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}

/* =============================================================
   STAT CARD
============================================================= */

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? "border-sky-300 bg-sky-50"
          : "border-slate-300 bg-white"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>

      <p
        className={`mt-4 text-2xl font-bold ${
          active
            ? "text-sky-600"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </button>
  );
}

/* =============================================================
   STATUS BADGE
============================================================= */

function StatusBadge({
  status,
}: {
  status: ContentStatus;
}) {
  const config = {
    idea: {
      label: "Idea",
      className:
        "bg-slate-100 text-slate-600 border-slate-200",
    },

    draft: {
      label: "Draft",
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    },

    ready: {
      label: "Ready",
      className:
        "bg-sky-50 text-sky-700 border-sky-200",
    },
  };

  const current = config[status];

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${current.className}`}
    >
      {current.label}
    </span>
  );
}