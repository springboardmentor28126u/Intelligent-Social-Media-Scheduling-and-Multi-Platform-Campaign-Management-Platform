import { useState } from "react";
import "./AiCaptionGenerator.css";

const PLATFORMS = [
  "Facebook",
  "Instagram",
  "LinkedIn",
  "YouTube",
  "X (Twitter)",
];

const TONES = [
  "Professional",
  "Friendly",
  "Promotional",
  "Casual",
  "Creative",
];

function AiCaptionGenerator({ apiBaseUrl, onUseCaption }) {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("Friendly");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const generateCaption = async () => {
    if (!topic.trim()) {
      setError("Enter a topic or product description to generate a caption.");
      setNotice("");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Your session has expired. Sign in again to generate a caption.");
      setNotice("");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${apiBaseUrl}/ai/captions/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic: topic.trim(), platform, tone }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.detail || `Caption and hashtag generation failed (${response.status}).`
        );
      }

      if (typeof result.caption !== "string" || !result.caption.trim()) {
        throw new Error("The AI service returned an empty result. Please try again.");
      }

      setCaption(result.caption);
      setNotice("Caption and hashtags generated. Edit them before using in your post.");
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Caption generation failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setError("");
      setNotice("Caption copied to your clipboard.");
    } catch {
      setNotice("");
      setError("Could not copy the caption. Check your browser clipboard permissions.");
    }
  };

  const useCaption = () => {
    onUseCaption(caption);
    setError("");
    setNotice("Caption added to Post content. It has not been published or scheduled.");
  };

  return (
    <section className="ai-caption-generator" aria-labelledby="ai-caption-title">
      <div className="ai-caption-heading">
        <div>
          <span className="ai-caption-eyebrow">AI WRITING ASSISTANT</span>
          <h3 id="ai-caption-title">AI Caption &amp; Hashtag Generator</h3>
          <p>Generate a caption with relevant hashtags together, then edit before adding it to your post.</p>
        </div>
        <span className="ai-caption-mark" aria-hidden="true">✦</span>
      </div>

      <div className="ai-caption-fields">
        <label className="ai-caption-field ai-caption-topic" htmlFor="ai-caption-topic">
          <span>Topic or product description</span>
          <textarea
            id="ai-caption-topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Describe what you want to share..."
            maxLength={2000}
            rows={3}
            disabled={loading}
          />
        </label>

        <label className="ai-caption-field" htmlFor="ai-caption-platform">
          <span>Platform</span>
          <select
            id="ai-caption-platform"
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            disabled={loading}
          >
            {PLATFORMS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="ai-caption-field" htmlFor="ai-caption-tone">
          <span>Tone</span>
          <select
            id="ai-caption-tone"
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            disabled={loading}
          >
            {TONES.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <button
        className="ai-caption-generate"
        type="button"
        onClick={generateCaption}
        disabled={loading}
      >
        {loading ? "Generating..." : caption ? "Generate Again" : "Generate Caption + Hashtags"}
      </button>

      {error && <p className="ai-caption-message is-error" role="alert">{error}</p>}
      {notice && <p className="ai-caption-message is-success" role="status">{notice}</p>}

      {caption && (
        <div className="ai-caption-result">
          <label className="ai-caption-field" htmlFor="ai-caption-result">
            <span>Generated caption + hashtags <small>Editable</small></span>
            <textarea
              id="ai-caption-result"
              value={caption}
              onChange={(event) => {
                setCaption(event.target.value);
                setNotice("");
              }}
              maxLength={5000}
              rows={5}
            />
          </label>
          <div className="ai-caption-actions">
            <button type="button" className="ai-caption-secondary" onClick={copyCaption}>
              Copy Caption + Hashtags
            </button>
            <button
              type="button"
              className="ai-caption-use"
              onClick={useCaption}
              disabled={!caption.trim()}
            >
              Use Caption
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default AiCaptionGenerator;
