import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateCampaign.css";
import "./CampaignWorkspace.css";

const API_URL = "http://127.0.0.1:8000";
const STATUSES = ["Draft", "Scheduled", "Active", "Paused", "Completed", "Archived"];

function CreateCampaign() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    objective: "",
    target_audience: "",
    budget: "",
    start_date: "",
    end_date: "",
    status: "Draft",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);

  useEffect(() => {
    const loadAccounts = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;
      const response = await fetch(`${API_URL}/social-accounts/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) setAccounts(await response.json());
    };
    loadAccounts();
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await fetch(`${API_URL}/campaigns`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          budget: form.budget === "" ? null : form.budget,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          social_account_ids: selectedAccountIds,
        }),
      });

      if (response.status === 401) {
        localStorage.removeItem("access_token");
        navigate("/login", { replace: true });
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to create campaign.");
      }
      navigate(`/campaigns/${data.id}`);
    } catch (requestError) {
      setError(requestError.message || "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="create-campaign-page">
      <div className="create-campaign-shell">
        <header className="create-campaign-header">
          <div>
            <p className="campaigns-eyebrow">Planning workspace</p>
            <h1>Create Campaign</h1>
            <p>Shape the brief before your content starts moving.</p>
          </div>
          <button type="button" className="campaigns-back-button" onClick={() => navigate("/campaigns")}>Back to campaigns</button>
        </header>

        <form className="create-campaign-form" onSubmit={submitForm}>
          {error && <div className="campaigns-alert" role="alert">{error}</div>}
          <div className="create-campaign-form-grid">
            <label>Campaign Name<input name="name" value={form.name} onChange={updateField} required maxLength="150" placeholder="Summer product launch" /></label>
            <label>Objective<textarea name="objective" value={form.objective} onChange={updateField} rows="3" placeholder="Build awareness for the new collection" /></label>
            <label className="create-campaign-full">Description<textarea name="description" value={form.description} onChange={updateField} rows="4" placeholder="Add context, themes, and success criteria" /></label>
            <label>Target Audience<textarea name="target_audience" value={form.target_audience} onChange={updateField} rows="3" placeholder="Who should this campaign reach?" /></label>
            <label>Budget<input name="budget" type="number" min="0" step="0.01" value={form.budget} onChange={updateField} placeholder="0.00" /></label>
            <label>Start Date<input name="start_date" type="date" value={form.start_date} onChange={updateField} /></label>
            <label>End Date<input name="end_date" type="date" value={form.end_date} onChange={updateField} /></label>
            <label>Status<select name="status" value={form.status} onChange={updateField}>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
            <fieldset className="create-campaign-accounts">
              <legend>Connected social accounts</legend>
              {accounts.length === 0 ? <p>No connected accounts found.</p> : accounts.map((account) => (
                <label key={account.id} className="account-option">
                  <input type="checkbox" checked={selectedAccountIds.includes(account.id)} onChange={() => setSelectedAccountIds((current) => current.includes(account.id) ? current.filter((id) => id !== account.id) : [...current, account.id])} />
                  <span>{account.platform} · {account.username}</span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="create-campaign-actions">
            <button type="button" className="campaign-cancel-button" onClick={() => navigate("/campaigns")}>Cancel</button>
            <button type="submit" className="campaign-save-button" disabled={saving}>{saving ? "Creating..." : "Create Campaign"}</button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default CreateCampaign;