import { useEffect, useState } from "react";
import api from "../services/api";
import "./CampaignsPage.css";

const initialForm = {
  name: "",
  platform: "Instagram",
  description: "",
  start_date: "",
  end_date: "",
  budget: "",
  currency: "INR",
  objectives: "",
  target_audience: "",
  target_reach: "",
  target_engagement: "",
  target_clicks: "",
  color: "#E11D48",
  tags: "",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Stores the ID when editing an existing campaign
  const [editingCampaignId, setEditingCampaignId] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // ==========================================
  // GET CAMPAIGNS
  // ==========================================

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/campaigns/");
      setCampaigns(response.data);
    } catch (err) {
      console.error("Failed to load campaigns:", err);

      setError(
        err.response?.data?.detail ||
          "Failed to load campaigns."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // CREATE / UPDATE CAMPAIGN
  // ==========================================

  const handleCreateCampaign = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setFormError("");

      const payload = {
        name: form.name,
        platform: form.platform,

        description: form.description || null,

        start_date: form.start_date
          ? `${form.start_date}T00:00:00`
          : null,

        end_date: form.end_date
          ? `${form.end_date}T23:59:00`
          : null,

        budget: form.budget
          ? Number(form.budget)
          : null,

        currency: form.currency || null,

        objectives: form.objectives || null,

        target_audience: form.target_audience || null,

        target_reach: form.target_reach
          ? Number(form.target_reach)
          : null,

        target_engagement: form.target_engagement
          ? Number(form.target_engagement)
          : null,

        target_clicks: form.target_clicks
          ? Number(form.target_clicks)
          : null,

        color: form.color || null,

        tags: form.tags || null,
      };

      // ======================================
      // EDIT EXISTING CAMPAIGN
      // ======================================

      if (editingCampaignId) {
        await api.put(
          `/campaigns/${editingCampaignId}`,
          payload
        );
      }

      // ======================================
      // CREATE NEW CAMPAIGN
      // ======================================

      else {
        await api.post("/campaigns/", payload);
      }

      // Reset form
      setForm(initialForm);

      // Exit edit mode
      setEditingCampaignId(null);

      // Close form
      setShowForm(false);

      // Refresh campaign list
      await fetchCampaigns();
    } catch (err) {
      console.error("Failed to save campaign:", err);

      setFormError(
        err.response?.data?.detail ||
          "Failed to save campaign."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // START EDITING
  // ==========================================

  const handleEdit = (campaign) => {
    setEditingCampaignId(campaign.id);

    setForm({
      name: campaign.name || "",

      platform:
        campaign.platform || "Instagram",

      description:
        campaign.description || "",

      start_date: campaign.start_date
        ? campaign.start_date.slice(0, 10)
        : "",

      end_date: campaign.end_date
        ? campaign.end_date.slice(0, 10)
        : "",

      budget:
        campaign.budget ?? "",

      currency:
        campaign.currency || "INR",

      objectives:
        campaign.objectives || "",

      target_audience:
        campaign.target_audience || "",

      target_reach:
        campaign.target_reach ?? "",

      target_engagement:
        campaign.target_engagement ?? "",

      target_clicks:
        campaign.target_clicks ?? "",

      color:
        campaign.color || "#E11D48",

      tags:
        campaign.tags || "",
    });

    setFormError("");
    setShowForm(true);
  };

  // ==========================================
  // VIEW CAMPAIGN
  // ==========================================

  const handleView = (campaign) => {
    alert(
      `Campaign Details\n\n` +
      `Name: ${campaign.name}\n` +
      `Platform: ${campaign.platform}\n` +
      `Status: ${campaign.status}\n` +
      `Budget: ${
        campaign.budget
          ? `₹${campaign.budget}`
          : "Not set"
      }\n` +
      `Reach: ${
        campaign.actual_reach ?? "N/A"
      }\n` +
      `Engagement: ${
        campaign.actual_engagement ?? "N/A"
      }\n` +
      `Clicks: ${
        campaign.actual_clicks ?? "N/A"
      }\n` +
      `ROI: ${
        campaign.roi ?? "N/A"
      }`
    );
  };

  // ==========================================
  // DELETE CAMPAIGN
  // ==========================================

  const handleDelete = async (campaign) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${campaign.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/campaigns/${campaign.id}`
      );

      await fetchCampaigns();
    } catch (err) {
      console.error(
        "Failed to delete campaign:",
        err
      );

      alert(
        err.response?.data?.detail ||
          "Failed to delete campaign."
      );
    }
  };

  // ==========================================
  // CANCEL FORM
  // ==========================================

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCampaignId(null);
    setForm(initialForm);
    setFormError("");
  };

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="campaigns-page">
      <div className="campaigns-container">

        {/* ==================================
            HEADER
        ================================== */}

        <div className="campaigns-header">
          <div>
            <h1>Campaign Management</h1>

            <p>
              Create, manage, and track your
              social media campaigns.
            </p>
          </div>

          <button
            className="create-campaign-btn"
            onClick={() => {
              if (showForm) {
                handleCancelForm();
              } else {
                setEditingCampaignId(null);
                setForm(initialForm);
                setFormError("");
                setShowForm(true);
              }
            }}
          >
            {showForm
              ? "Cancel"
              : "+ Create Campaign"}
          </button>
        </div>

        {/* ==================================
            CREATE / EDIT FORM
        ================================== */}

        {showForm && (
          <form
            onSubmit={handleCreateCampaign}
            style={{
              marginBottom: "30px",
              padding: "25px",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              background: "#ffffff",
              boxShadow:
                "0 2px 8px rgba(15, 23, 42, 0.05)",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                color: "#172033",
              }}
            >
              {editingCampaignId
                ? "Edit Campaign"
                : "Create Campaign"}
            </h2>

            {formError && (
              <p
                style={{
                  color: "#dc2626",
                  background: "#fef2f2",
                  padding: "10px",
                  borderRadius: "6px",
                }}
              >
                {formError}
              </p>
            )}

            {/* Campaign Name */}

            <div style={formGroupStyle}>
              <label>Campaign Name</label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Enter campaign name"
                style={inputStyle}
              />
            </div>

            {/* Platform */}

            <div style={formGroupStyle}>
              <label>Platform</label>

              <select
                name="platform"
                value={form.platform}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Instagram">
                  Instagram
                </option>

                <option value="Facebook">
                  Facebook
                </option>

                <option value="LinkedIn">
                  LinkedIn
                </option>

                <option value="Twitter">
                  Twitter
                </option>

                <option value="YouTube">
                  YouTube
                </option>

                <option value="Pinterest">
                  Pinterest
                </option>
              </select>
            </div>

            {/* Description */}

            <div style={formGroupStyle}>
              <label>Description</label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                placeholder="Describe your campaign"
                style={inputStyle}
              />
            </div>

            {/* Dates */}

            <div style={rowStyle}>
              <div style={{ flex: 1 }}>
                <label>Start Date</label>

                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>End Date</label>

                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Budget */}

            <div style={rowStyle}>
              <div style={{ flex: 1 }}>
                <label>Budget</label>

                <input
                  type="number"
                  name="budget"
                  value={form.budget}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="50000"
                  style={inputStyle}
                />
              </div>

              <div style={{ width: "150px" }}>
                <label>Currency</label>

                <input
                  type="text"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Objectives */}

            <div style={formGroupStyle}>
              <label>Objectives</label>

              <input
                type="text"
                name="objectives"
                value={form.objectives}
                onChange={handleChange}
                placeholder="Increase engagement and reach"
                style={inputStyle}
              />
            </div>

            {/* Target Audience */}

            <div style={formGroupStyle}>
              <label>Target Audience</label>

              <input
                type="text"
                name="target_audience"
                value={form.target_audience}
                onChange={handleChange}
                placeholder="18-35"
                style={inputStyle}
              />
            </div>

            {/* Targets */}

            <div style={rowStyle}>
              <div style={{ flex: 1 }}>
                <label>Target Reach</label>

                <input
                  type="number"
                  name="target_reach"
                  value={form.target_reach}
                  onChange={handleChange}
                  min="0"
                  placeholder="100000"
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>
                  Target Engagement (%)
                </label>

                <input
                  type="number"
                  name="target_engagement"
                  value={form.target_engagement}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="8.5"
                  style={inputStyle}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Target Clicks</label>

                <input
                  type="number"
                  name="target_clicks"
                  value={form.target_clicks}
                  onChange={handleChange}
                  min="0"
                  placeholder="5000"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Color + Tags */}

            <div style={rowStyle}>
              <div>
                <label>Campaign Color</label>

                <br />

                <input
                  type="color"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  style={{
                    marginTop: "8px",
                    width: "60px",
                    height: "40px",
                    cursor: "pointer",
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label>Tags</label>

                <input
                  type="text"
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="diwali, festival, promotion"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* ==================================
                SUBMIT BUTTON
            ================================== */}

            <button
              type="submit"
              disabled={saving}
              className="create-campaign-btn"
              style={{
                marginTop: "25px",
              }}
            >
              {saving
                ? editingCampaignId
                  ? "Saving..."
                  : "Creating..."
                : editingCampaignId
                  ? "Save Edits"
                  : "Create Campaign"}
            </button>
          </form>
        )}

        {/* ==================================
            LOADING
        ================================== */}

        {loading && (
          <p>Loading campaigns...</p>
        )}

        {/* ==================================
            ERROR
        ================================== */}

        {error && (
          <p
            style={{
              color: "#dc2626",
              background: "#fef2f2",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            {error}
          </p>
        )}

        {/* ==================================
            EMPTY
        ================================== */}

        {!loading &&
          !error &&
          campaigns.length === 0 && (
            <div className="empty-campaigns">
              No campaigns found.
            </div>
          )}

        {/* ==================================
            CAMPAIGN LIST
        ================================== */}

        {!loading &&
          campaigns.length > 0 && (
            <div className="campaigns-list">

              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="campaign-card"
                >

                  {/* Card Header */}

                  <div className="campaign-card-header">

                    <div>
                      <h2>
                        {campaign.name}
                      </h2>

                      <div className="campaign-platform">
                        {campaign.platform}
                      </div>
                    </div>

                    <span className="campaign-status">
                      {campaign.status}
                    </span>

                  </div>

                  {/* Metrics */}

                  <div className="campaign-metrics">

                    <div className="metric-box">
                      <span className="metric-label">
                        Budget
                      </span>

                      <span className="metric-value">
                        {campaign.budget
                          ? `₹${campaign.budget}`
                          : "Not set"}
                      </span>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">
                        Reach
                      </span>

                      <span className="metric-value">
                        {campaign.actual_reach ??
                          "N/A"}
                      </span>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">
                        Engagement
                      </span>

                      <span className="metric-value">
                        {campaign.actual_engagement ??
                          "N/A"}
                      </span>
                    </div>

                    <div className="metric-box">
                      <span className="metric-label">
                        Clicks
                      </span>

                      <span className="metric-value">
                        {campaign.actual_clicks ??
                          "N/A"}
                      </span>
                    </div>

                  </div>

                  {/* ROI */}

                  <div
                    className="metric-box"
                    style={{
                      marginTop: "14px",
                    }}
                  >
                    <span className="metric-label">
                      ROI
                    </span>

                    <span className="metric-value">
                      {campaign.roi ?? "N/A"}
                    </span>
                  </div>

                  {/* ==================================
                      ACTION BUTTONS
                  ================================== */}

                  <div className="campaign-actions">

                    {/* VIEW */}

                    <button
                      type="button"
                      className="campaign-action-btn"
                      onClick={() =>
                        handleView(campaign)
                      }
                    >
                      View
                    </button>

                    {/* EDIT */}

                    <button
                      type="button"
                      className="campaign-action-btn"
                      onClick={() =>
                        handleEdit(campaign)
                      }
                    >
                      Edit
                    </button>

                    {/* DELETE */}

                    <button
                      type="button"
                      className="campaign-action-btn"
                      onClick={() =>
                        handleDelete(campaign)
                      }
                    >
                      Delete
                    </button>

                  </div>

                </div>
              ))}

            </div>
          )}

      </div>
    </div>
  );
}

// ==========================================
// FORM STYLES
// ==========================================

const formGroupStyle = {
  marginTop: "15px",
};

const rowStyle = {
  display: "flex",
  gap: "15px",
  marginTop: "15px",
  alignItems: "flex-start",
};

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "6px",
  padding: "10px",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  fontSize: "14px",
  background: "#ffffff",
};