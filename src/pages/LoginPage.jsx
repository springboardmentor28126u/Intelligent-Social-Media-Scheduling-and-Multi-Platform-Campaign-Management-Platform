import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./ProfilePage.css";
import "./LoginPage.css";

export default function Loginpage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Invalid email or password");
        setLoading(false);
        return;
      }

      // Save JWT token
      localStorage.setItem("access_token", data.access_token);

      // Go to dashboard after login
      navigate("/dashboard");

    } catch (error) {
      setError("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">

        <Link to="/" className="back-home">
          ← Back to home
        </Link>

        <div className="login-logo">S</div>

        <h1>Welcome back</h1>

        <p className="login-subtitle">
          Sign in to your SocialPilot account
        </p>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Email address</label>

            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

        </form>

        <p className="register-link">
          Don't have an account?{" "}
          <Link to="/register">
            Create account
          </Link>
        </p>

      </div>
    </div>
  );
}