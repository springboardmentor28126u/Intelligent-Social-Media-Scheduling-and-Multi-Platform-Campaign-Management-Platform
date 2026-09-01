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

const PLATFORM_DATA: Record<string, { icon: string; label: string }> = {
  linkedin: { icon: "in", label: "LinkedIn" },
  instagram: { icon: "◎", label: "Instagram" },
  facebook: { icon: "f", label: "Facebook" },
  twitter: { icon: "𝕏", label: "X" },
  youtube: { icon: "▶", label: "YouTube" },
  pinterest: { icon: "P", label: "Pinterest" },
};

const SAMPLE_CONTENT: ContentItem[] = [
  {
    id: 1,
    title: "AI is changing how we work",
    text: "Artificial intelligence is not simply replacing tasks. It is changing how people think, create and solve problems.",
    platform: "linkedin",
    status: "ready",
    createdAt: "Today",
  },
  {
    id: 2,
    title: "5 lessons from building with AI",
    text: "Start small. Test quickly. Listen to users. Improve continuously. The best AI products are built around real problems.",
    platform: "linkedin",
    status: "draft",
    createdAt: "Yesterday",
  },
  {
    id: 3,
    title: "Weekend content idea",
    text: "Share a simple behind-the-scenes story about your latest project.",
    platform: "instagram",
    status: "idea",
    createdAt: "2 days ago",
  },
];

export default function ContentLabPage() {
  const router = useRouter();

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | ContentStatus>("all");
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        setContents(SAMPLE_CONTENT);
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
        console.error("Failed to load saved content:", error);
        setContents(SAMPLE_CONTENT);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function saveContents(updated: ContentItem[]) {
    setContents(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const filteredContents = useMemo(() => {
    return contents.filter((item) => {
      const matchesFilter = activeFilter === "all" || item.status === activeFilter;
      const searchText = search.trim().toLowerCase();
      const matchesSearch =
        !searchText ||
        item.title.toLowerCase().includes(searchText) ||
        item.text.toLowerCase().includes(searchText) ||
        item.platform.toLowerCase().includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [contents, activeFilter, search]);

  const ideaCount = contents.filter((item) => item.status === "idea").length;
  const draftCount = contents.filter((item) => item.status === "draft").length;
  const readyCount = contents.filter((item) => item.status === "ready").length;

  function openComposer() {
    setEditingId(null);
    setTitle("");
    setText("");
    setPlatform("linkedin");
    setStatus("draft");
    setMessage("");
    setShowComposer(true);
  }

  function editContent(item: ContentItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setText(item.text);
    setPlatform(item.platform);
    setStatus(item.status);
    setMessage("");
    setShowComposer(true);
  }

  function handleSaveContent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!title.trim() || !text.trim()) {
      setMessage("Please enter a title and content.");
      return;
    }

    if (editingId !== null) {
      const updated = contents.map((item) =>
        item.id === editingId
          ? { ...item, title: title.trim(), text: text.trim(), platform, status }
          : item
      );

      saveContents(updated);
      setMessage("Content updated successfully.");
    } else {
      const newContent: ContentItem = {
        id: Date.now(),
        title: title.trim(),
        text: text.trim(),
        platform,
        status,
        createdAt: "Just now",
      };

      saveContents([newContent, ...contents]);
      setMessage("Content saved successfully.");
    }

    setTitle("");
    setText("");
    setEditingId(null);
    setShowComposer(false);
  }

  function deleteContent(id: number) {
    const confirmed = window.confirm("Delete this content?");
    if (!confirmed) return;

    const updated = contents.filter((item) => item.id !== id);
    saveContents(updated);
    setSelectedContent(null);
  }

  function changeStatus(id: number, newStatus: ContentStatus) {
    const updated = contents.map((item) =>
      item.id === id ? { ...item, status: newStatus } : item
    );

    saveContents(updated);

    if (selectedContent?.id === id) {
      setSelectedContent({ ...selectedContent, status: newStatus });
    }
  }

  function regenerateWithAI() {
    if (!text.trim()) {
      setMessage("Write some content first.");
      return;
    }

    setAiLoading(true);
    setMessage("");

    window.setTimeout(() => {
      const regenerated = `Here is a refreshed version of your idea:\n\n${text.trim()}\n\nThe key message is simple: create useful content, experiment consistently, and learn from your audience.`;

      setText(regenerated);
      setAiLoading(false);
      setMessage("AI generated a refreshed version.");
    }, 1200);
  }

  function clearAllContent() {
    const confirmed = window.confirm("Remove all saved content?");
    if (!confirmed) return;
    saveContents([]);
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--sp-bg)", color: "var(--sp-text)", fontFamily: "var(--font-plex-mono), monospace" }}
    >
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside
          className="hidden w-64 shrink-0 border-r p-5 md:flex md:flex-col"
          style={{ borderColor: "var(--sp-border)", background: "var(--sp-surface)" }}
        >
          <button onClick={() => router.push("/dashboard")} className="mb-10 flex items-center gap-3 text-left">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl font-bold"
              style={{ background: "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))", color: "#05060A" }}
            >
              S
            </div>
            <div>
              <div className="font-semibold" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                SocialPilot
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--sp-subtle)" }}>
                Creator workspace
              </div>
            </div>
          </button>

          <p className="mb-3 px-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--sp-subtle)" }}>
            Workspace
          </p>

          <div className="space-y-1">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>◉</span>
              Command Center
            </button>

            <button
              onClick={() => router.push("/create-post")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>✦</span>
              Create
            </button>

            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{ background: "rgba(0,229,255,0.09)", color: "var(--sp-cyan)" }}
            >
              <span>◇</span>
              Content Lab
            </button>

            <button
              onClick={() => router.push("/insights")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>◌</span>
              Insights
            </button>

            <button
              onClick={() => router.push("/audience")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              <span>◎</span>
              Audience
            </button>
          </div>

          <p className="mb-3 mt-10 px-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--sp-subtle)" }}>
            Pipeline
          </p>

          <div className="space-y-2 px-2">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--sp-text-secondary)" }}>Ideas</span>
              <span>{ideaCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--sp-text-secondary)" }}>Drafts</span>
              <span>{draftCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--sp-text-secondary)" }}>Ready</span>
              <span>{readyCount}</span>
            </div>
          </div>

          <div className="mt-auto space-y-1">
            <button
              onClick={() => router.push("/settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              ⚙ Preferences
            </button>

            <button
              onClick={() => router.push("/")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm"
              style={{ color: "var(--sp-text-secondary)" }}
            >
              ↪ Exit
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1">
          <header
            className="flex items-center justify-between border-b px-6 py-5 md:px-10"
            style={{ borderColor: "var(--sp-border)" }}
          >
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--sp-cyan)" }}>
                Content Lab
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--sp-subtle)" }}>
                Turn ideas into publish-ready content.
              </p>
            </div>

            <button
              onClick={openComposer}
              className="rounded-xl px-4 py-2.5 text-xs font-semibold"
              style={{ background: "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))", color: "#05060A" }}
            >
              + New content
            </button>
          </header>

          <div className="mx-auto max-w-7xl p-6 md:p-10">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl" style={{ fontFamily: "var(--font-fraunces), serif", fontWeight: 600 }}>
                Your content, evolving.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--sp-muted)" }}>
                Capture ideas, shape drafts, and move your strongest content toward ready.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Everything" value={contents.length} active={activeFilter === "all"} onClick={() => setActiveFilter("all")} />
              <StatCard label="Ideas" value={ideaCount} active={activeFilter === "idea"} onClick={() => setActiveFilter("idea")} />
              <StatCard label="Drafts" value={draftCount} active={activeFilter === "draft"} onClick={() => setActiveFilter("draft")} />
              <StatCard label="Ready" value={readyCount} active={activeFilter === "ready"} onClick={() => setActiveFilter("ready")} />
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "var(--sp-subtle)" }}>
                  ⌕
                </span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your content..."
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-xs outline-none"
                  style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)", color: "var(--sp-text)" }}
                />
              </div>

              {contents.length > 0 && (
                <button
                  onClick={clearAllContent}
                  className="rounded-xl px-4 py-3 text-xs"
                  style={{ color: "var(--sp-text-secondary)", border: "1px solid var(--sp-border)" }}
                >
                  Clear library
                </button>
              )}
            </div>

            <div className="mt-8">
              {filteredContents.length === 0 ? (
                <div
                  className="rounded-2xl p-12 text-center"
                  style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}
                >
                  <div
                    className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{ background: "rgba(0,229,255,0.08)", color: "var(--sp-cyan)" }}
                  >
                    ✦
                  </div>
                  <h2 className="mt-5 text-xl" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                    Nothing here yet.
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--sp-muted)" }}>
                    Start with an idea and build it into something worth sharing.
                  </p>
                  <button
                    onClick={openComposer}
                    className="mt-6 rounded-xl px-5 py-3 text-xs font-semibold"
                    style={{ background: "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))", color: "#05060A" }}
                  >
                    Create your first piece
                  </button>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredContents.map((item) => {
                    const platformInfo = PLATFORM_DATA[item.platform];

                    return (
                      <article
                        key={item.id}
                        className="group rounded-2xl p-5 transition-all hover:-translate-y-1"
                        style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border)" }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold"
                              style={{ background: "var(--sp-card)", color: "var(--sp-text-secondary)" }}
                            >
                              {platformInfo?.icon || "●"}
                            </span>
                            <span className="text-[10px]" style={{ color: "var(--sp-muted)" }}>
                              {platformInfo?.label || item.platform}
                            </span>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>

                        <h2 className="mt-5 text-lg leading-6" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                          {item.title}
                        </h2>

                        <p className="mt-3 line-clamp-4 text-xs leading-6" style={{ color: "var(--sp-text-secondary)" }}>
                          {item.text}
                        </p>

                        <div
                          className="mt-6 flex items-center justify-between border-t pt-4"
                          style={{ borderColor: "var(--sp-border)" }}
                        >
                          <span className="text-[10px]" style={{ color: "var(--sp-subtle)" }}>
                            {item.createdAt}
                          </span>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedContent(item)}
                              className="rounded-lg px-3 py-2 text-[10px]"
                              style={{ background: "var(--sp-card)", color: "var(--sp-text-secondary)" }}
                            >
                              View
                            </button>
                            <button
                              onClick={() => editContent(item)}
                              className="rounded-lg px-3 py-2 text-[10px]"
                              style={{ background: "rgba(0,229,255,0.07)", color: "var(--sp-cyan)" }}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* COMPOSER MODAL */}
      {showComposer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowComposer(false);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--sp-card)", border: "1px solid var(--sp-border-strong)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-cyan)" }}>
                  {editingId ? "Edit content" : "Content studio"}
                </p>
                <h2 className="mt-2 text-2xl" style={{ fontFamily: "var(--font-fraunces), serif" }}>
                  Shape your next idea.
                </h2>
              </div>
              <button onClick={() => setShowComposer(false)} className="text-xl" style={{ color: "var(--sp-muted)" }}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveContent} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-muted)" }}>
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your content a name"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border-strong)", color: "var(--sp-text)" }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-muted)" }}>
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-xs outline-none"
                    style={{ background: "var(--sp-input)", border: "1px solid var(--sp-border-strong)", color: "var(--sp-input-text)" }}
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">X</option>
                    <option value="youtube">YouTube</option>
                    <option value="pinterest">Pinterest</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-muted)" }}>
                    Stage
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContentStatus)}
                    className="w-full rounded-xl px-4 py-3 text-xs outline-none"
                    style={{ background: "var(--sp-input)", border: "1px solid var(--sp-border-strong)", color: "var(--sp-input-text)" }}
                  >
                    <option value="idea">Idea</option>
                    <option value="draft">Draft</option>
                    <option value="ready">Ready</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-muted)" }}>
                    Content
                  </label>
                  <button
                    type="button"
                    onClick={regenerateWithAI}
                    disabled={aiLoading}
                    className="rounded-lg px-3 py-2 text-[10px] font-semibold disabled:opacity-50"
                    style={{ background: "rgba(155,92,255,0.1)", color: "var(--sp-purple)", border: "1px solid rgba(155,92,255,0.18)" }}
                  >
                    {aiLoading ? "Generating..." : "✦ Regenerate with AI"}
                  </button>
                </div>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={9}
                  placeholder="Write your idea or draft here..."
                  className="w-full resize-none rounded-xl px-4 py-4 text-sm leading-6 outline-none"
                  style={{ background: "var(--sp-hover)", border: "1px solid var(--sp-border-strong)", color: "var(--sp-text)" }}
                />

                <div className="mt-2 text-right text-[10px]" style={{ color: "var(--sp-subtle)" }}>
                  {text.length} characters
                </div>
              </div>

              {message && (
                <div
                  className="rounded-xl p-3 text-xs"
                  style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.12)", color: "var(--sp-cyan)" }}
                >
                  {message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowComposer(false)}
                  className="rounded-xl px-5 py-3 text-xs"
                  style={{ color: "var(--sp-text-secondary)", border: "1px solid var(--sp-border)" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-6 py-3 text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg,var(--sp-cyan),var(--sp-purple))", color: "#05060A" }}
                >
                  {editingId ? "Update content" : "Save content"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {selectedContent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedContent(null);
          }}
        >
          <div className="w-full max-w-xl rounded-2xl p-6" style={{ background: "var(--sp-card)", border: "1px solid var(--sp-border-strong)" }}>
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedContent.status} />
              <button onClick={() => setSelectedContent(null)} className="text-xl" style={{ color: "var(--sp-muted)" }}>
                ×
              </button>
            </div>

            <h2 className="mt-6 text-2xl" style={{ fontFamily: "var(--font-fraunces), serif" }}>
              {selectedContent.title}
            </h2>

            <div
              className="mt-5 whitespace-pre-wrap rounded-xl p-5 text-sm leading-7"
              style={{ background: "var(--sp-hover)", color: "var(--sp-text-secondary)" }}
            >
              {selectedContent.text}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => changeStatus(selectedContent.id, "idea")}
                className="rounded-lg px-3 py-2 text-[10px]"
                style={{ background: "var(--sp-hover)", color: "var(--sp-text-secondary)" }}
              >
                Move to Idea
              </button>
              <button
                onClick={() => changeStatus(selectedContent.id, "draft")}
                className="rounded-lg px-3 py-2 text-[10px]"
                style={{ background: "var(--sp-hover)", color: "var(--sp-text-secondary)" }}
              >
                Move to Draft
              </button>
              <button
                onClick={() => changeStatus(selectedContent.id, "ready")}
                className="rounded-lg px-3 py-2 text-[10px]"
                style={{ background: "rgba(0,229,255,0.08)", color: "var(--sp-cyan)" }}
              >
                Mark Ready
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedContent(null);
                  editContent(selectedContent);
                }}
                className="rounded-xl px-4 py-3 text-xs"
                style={{ color: "var(--sp-cyan)", border: "1px solid rgba(0,229,255,0.15)" }}
              >
                Edit
              </button>
              <button
                onClick={() => deleteContent(selectedContent.id)}
                className="rounded-xl px-4 py-3 text-xs"
                style={{ color: "var(--sp-danger)", border: "1px solid rgba(255,61,110,0.15)" }}
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
      className="rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5"
      style={{
        background: active ? "rgba(0,229,255,0.06)" : "var(--sp-hover)",
        border: active ? "1px solid rgba(0,229,255,0.18)" : "1px solid var(--sp-border)",
      }}
    >
      <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--sp-muted)" }}>
        {label}
      </p>
      <p className="mt-4 text-2xl font-semibold" style={{ color: active ? "var(--sp-cyan)" : "var(--sp-text)" }}>
        {value}
      </p>
    </button>
  );
}

function StatusBadge({ status }: { status: ContentStatus }) {
  const config = {
    idea: { label: "Idea", background: "rgba(155,92,255,0.09)", color: "var(--sp-purple)" },
    draft: { label: "Draft", background: "rgba(255,190,92,0.08)", color: "#FFC36B" },
    ready: { label: "Ready", background: "rgba(53,230,161,0.08)", color: "var(--sp-green)" },
  };

  const current = config[status];

  return (
    <span
      className="rounded-full px-3 py-1 text-[9px] uppercase tracking-wider"
      style={{ background: current.background, color: current.color }}
    >
      {current.label}
    </span>
  );
}