import { useState } from "react";
import "./AiPostRewriter.css";

const REWRITE_STYLES = [
  "Professional",
  "Friendly",
  "Promotional",
  "Casual",
  "Shorten",
  "Expand",
  "Improve Grammar",
];

function AiPostRewriter({ apiBaseUrl, content, onUseContent }) {
  const [isOpen, setIsOpen] = useState(false);
  const [style, setStyle] = useState("Professional");
  const [rewrittenContent, setRewrittenContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const rewrite = async () => {
    if (!content.trim()) {
      setError("Add post content before using AI Rewrite.");
      setNotice("");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Your session has expired. Sign in again to rewrite this post.");
      setNotice("");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${apiBaseUrl}/ai/captions/rewrite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, style }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || `Rewrite failed (${response.status}).`);
      }
      if (
        typeof result.rewritten_content !== "string" ||
        !result.rewritten_content.trim()
      ) {
        throw new Error("The AI service returned empty rewritten content.");
      }

      setRewrittenContent(result.rewritten_content);
      setNotice("Review the rewrite below. Your post has not been changed.");
    } catch (rewriteError) {
      setError(
        rewriteError instanceof Error
          ? rewriteError.message
          : "Could not rewrite this post. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    setIsOpen(false);
    setRewrittenContent("");
    setError("");
    setNotice("");
  };

  const useRewrite = () => {
    onUseContent(rewrittenContent);
    setNotice("Rewritten content placed in Post content. It has not been published or scheduled.");
    setError("");
    setIsOpen(false);
  };

  const copyRewrite = async () => {
    try {
      await navigator.clipboard.writeText(rewrittenContent);
      setError("");
      setNotice("Rewritten content copied to your clipboard.");
    } catch {
      setNotice("");
      setError("Could not copy the rewrite. Check your browser clipboard permissions.");
    }
  };

  return (
    <div className="ai-post-rewriter">
      <button
        type="button"
        className="ai-rewrite-trigger"
        onClick={() => {
          setIsOpen(true);
          setError("");
          setNotice("");
        }}
        disabled={loading}
      >
        ✦ AI Rewrite
      </button>

      {isOpen && (
        <section className="ai-rewrite-panel" aria-labelledby="ai-rewrite-title">
          <div className="ai-rewrite-heading">
            <div>
              <span className="ai-rewrite-eyebrow">AI WRITING ASSISTANT</span>
              <h3 id="ai-rewrite-title">Rewrite post content</h3>
            </div>
            <button
              type="button"
              className="ai-rewrite-close"
              onClick={cancel}
              aria-label="Cancel AI rewrite"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <label className="ai-rewrite-style" htmlFor="ai-rewrite-style">
            <span>Rewriting style</span>
            <select
              id="ai-rewrite-style"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              disabled={loading}
            >
              {REWRITE_STYLES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>

          <div className={`ai-rewrite-comparison${rewrittenContent ? " has-result" : ""}`}>
            <div className="ai-rewrite-copy">
              <h4>Original content</h4>
              <p>{content || "No post content entered yet."}</p>
            </div>
            <div className="ai-rewrite-copy is-rewritten">
              <h4>Rewritten content</h4>
              {rewrittenContent ? (
                <textarea
                  value={rewrittenContent}
                  onChange={(event) => {
                    setRewrittenContent(event.target.value);
                    setNotice("");
                  }}
                  maxLength={5000}
                  rows={6}
                  aria-label="Rewritten post content"
                />
              ) : (
                <p className="ai-rewrite-placeholder">
                  Your rewrite will appear here. The original post stays unchanged until you use it.
                </p>
              )}
            </div>
          </div>

          {error && <p className="ai-rewrite-message is-error" role="alert">{error}</p>}
          {notice && <p className="ai-rewrite-message is-success" role="status">{notice}</p>}

          <div className="ai-rewrite-actions">
            <button
              type="button"
              className="ai-rewrite-primary"
              onClick={rewrite}
              disabled={loading || !content.trim()}
            >
              {loading ? "Rewriting…" : rewrittenContent ? "Generate Again" : "Generate Rewrite"}
            </button>
            {rewrittenContent && (
              <>
                <button type="button" className="ai-rewrite-secondary" onClick={copyRewrite}>
                  Copy
                </button>
                <button type="button" className="ai-rewrite-primary" onClick={useRewrite}>
                  Use Rewritten Content
                </button>
              </>
            )}
            <button
              type="button"
              className="ai-rewrite-secondary"
              onClick={cancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default AiPostRewriter;
