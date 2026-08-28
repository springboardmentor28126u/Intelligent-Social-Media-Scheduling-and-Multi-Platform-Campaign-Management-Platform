import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./RegisterPage.css";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    date_of_birth: "",
    role: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Registration failed");
        setLoading(false);
        return;
      }

      alert("Registration successful!");

      navigate("/login");
    } catch (err) {
      setError("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="register-page">
      <div className="register-card">

        <div className="register-header">
          <Link to="/" className="back-home">
            ← Back to home
          </Link>

          <div className="register-logo">S</div>

          <h1>Create your account</h1>

          <p>
            Start managing your social media from one place.
          </p>
        </div>

        {error && (
          <div className="register-error">
            {typeof error === "string"
              ? error
              : "Please check your information."}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Full name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Email address</label>

            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={8}
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Date of birth</label>

            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>What best describes you?</label>

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              required
            >
              <option value="">Select your role</option>
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

          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

        </form>

        <div className="login-link">
          Already have an account?
          <Link to="/login"> Sign in</Link>
        </div>

      </div>
    </div>
  );
}