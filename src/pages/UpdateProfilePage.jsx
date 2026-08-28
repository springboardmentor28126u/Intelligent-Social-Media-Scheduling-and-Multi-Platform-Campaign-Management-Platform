
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function UpdateProfilePage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date_of_birth: "",
    role: "",
    phone: "",
    bio: "",
    profile_image: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load existing profile
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/profile/me",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.detail || "Unable to load profile.");
          return;
        }

        setFormData({
          date_of_birth: data.date_of_birth || "",
          role: data.role || "",
          phone: data.phone || "",
          bio: data.bio || "",
          profile_image: data.profile_image || "",
        });
      } catch (err) {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Save profile
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/profile/me",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            date_of_birth: formData.date_of_birth || null,
            role: formData.role || null,
            phone: formData.phone || null,
            bio: formData.bio || null,
            profile_image: formData.profile_image || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Unable to update profile.");
        return;
      }

      setSuccess("Profile updated successfully!");

      // Go back to profile after saving
      setTimeout(() => {
        navigate("/profile");
      }, 1000);
    } catch (err) {
      setError("Unable to connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <h2>Loading profile...</h2>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <Link to="/profile" style={styles.backLink}>
          ← Back to Profile
        </Link>

        <h1 style={styles.title}>Update Profile</h1>

        <p style={styles.subtitle}>
          Update your SocialPilot profile information.
        </p>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Date of Birth */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Date of Birth
            </label>

            <input
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {/* Role */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Profile Role
            </label>

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="">
                Select your role
              </option>

              <option value="content_creator">
                Content Creator
              </option>

              <option value="business">
                Business
              </option>

              <option value="marketing_team">
                Marketing Team
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>

          {/* Phone */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Phone Number
            </label>

            <input
              type="tel"
              name="phone"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
              maxLength="20"
              style={styles.input}
            />
          </div>

          {/* Profile Image */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Profile Image URL
            </label>

            <input
              type="text"
              name="profile_image"
              placeholder="Enter image URL"
              value={formData.profile_image}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {/* Bio */}
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Bio
            </label>

            <textarea
              name="bio"
              placeholder="Tell us about yourself..."
              value={formData.bio}
              onChange={handleChange}
              maxLength="500"
              rows="5"
              style={styles.textarea}
            />

            <small style={styles.counter}>
              {formData.bio.length}/500 characters
            </small>
          </div>

          {/* Buttons */}
          <div style={styles.actions}>

            <Link
              to="/profile"
              style={styles.cancelButton}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              style={styles.saveButton}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "50px 20px",
    boxSizing: "border-box",
  },

  card: {
    width: "100%",
    maxWidth: "650px",
    margin: "0 auto",
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)",
    boxSizing: "border-box",
  },

  backLink: {
    color: "#374151",
    textDecoration: "none",
    fontWeight: "600",
  },

  title: {
    marginTop: "25px",
    marginBottom: "8px",
    fontSize: "30px",
    color: "#111827",
  },

  subtitle: {
    marginBottom: "30px",
    color: "#6b7280",
  },

  formGroup: {
    marginBottom: "22px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "600",
    color: "#374151",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    outline: "none",
  },

  textarea: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "15px",
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
  },

  counter: {
    display: "block",
    marginTop: "5px",
    textAlign: "right",
    color: "#6b7280",
  },

  error: {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    background: "#fee2e2",
    color: "#b91c1c",
  },

  success: {
    padding: "12px",
    marginBottom: "20px",
    borderRadius: "8px",
    background: "#dcfce7",
    color: "#15803d",
  },

  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    marginTop: "30px",
  },

  cancelButton: {
    padding: "12px 22px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    color: "#374151",
    textDecoration: "none",
    fontWeight: "600",
  },

  saveButton: {
    padding: "12px 22px",
    borderRadius: "8px",
    border: "none",
    background: "#111827",
    color: "#ffffff",
    fontWeight: "600",
    cursor: "pointer",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

