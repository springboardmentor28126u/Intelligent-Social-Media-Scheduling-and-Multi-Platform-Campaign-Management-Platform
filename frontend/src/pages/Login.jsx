import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    // -----------------------------
    // VALIDATION
    // -----------------------------

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      // =================================================
      // STEP 1: LOGIN
      // =================================================

      const loginResponse = await fetch(
        "http://127.0.0.1:8000/auth/login",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            email: email.trim(),
            password: password,
          }),
        }
      );

      const loginData = await loginResponse.json();

      console.log("LOGIN RESPONSE:", loginData);

      // -----------------------------
      // LOGIN FAILED
      // -----------------------------

      if (!loginResponse.ok) {
        setError(
          loginData.detail ||
            "Invalid email or password."
        );

        return;
      }

      // -----------------------------
      // CHECK TOKEN
      // -----------------------------

      if (!loginData.access_token) {
        setError(
          "Login failed: access token not received."
        );

        return;
      }

      // =================================================
      // STEP 2: SAVE TOKEN
      // =================================================

      localStorage.setItem(
        "access_token",
        loginData.access_token
      );

      // =================================================
      // STEP 3: GET CURRENT USER
      // =================================================

      const meResponse = await fetch(
        "http://127.0.0.1:8000/auth/me",
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${loginData.access_token}`,
          },
        }
      );

      const meData = await meResponse.json();

      console.log("CURRENT USER:", meData);

      // -----------------------------
      // /auth/me FAILED
      // -----------------------------

      if (!meResponse.ok) {
        localStorage.removeItem("access_token");

        setError(
          meData.detail ||
            "Unable to get user information."
        );

        return;
      }

      // =================================================
      // STEP 4: GET ROLE
      // =================================================

      const role = meData.role
        ? meData.role.toUpperCase()
        : "USER";

      console.log("USER ROLE:", role);

      // Save role
      localStorage.setItem("role", role);

      // =================================================
      // STEP 5: REDIRECT
      // =================================================

      if (role === "ADMIN") {

        console.log(
          "ADMIN DETECTED → ADMIN DASHBOARD"
        );

        navigate("/admin-dashboard");

      } else {

        console.log(
          "NORMAL USER → USER DASHBOARD"
        );

        navigate("/dashboard");
      }

    } catch (error) {

      console.error(
        "Login error:",
        error
      );

      setError(
        "Unable to connect to the server. Please make sure FastAPI is running."
      );

    } finally {

      setLoading(false);

    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="login-page">

      <div className="login-container">

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="login-info">

          <div className="login-logo">
            SocialPilot
          </div>

          <h1>
            Welcome Back!
          </h1>

          <p>
            Login to manage your social media accounts,
            create posts and manage your content.
          </p>

          <div className="login-features">

            <div className="login-feature">
              📊 View Dashboard
            </div>

            <div className="login-feature">
              👥 Manage Social Accounts
            </div>

            <div className="login-feature">
              📝 Create Posts
            </div>

            <div className="login-feature">
              📅 Schedule Content
            </div>

          </div>

        </div>


        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="login-card">

          <div className="login-header">

            <h2>
              Login
            </h2>

            <p>
              Sign in to your SocialPilot account
            </p>

          </div>


          {/* ERROR */}

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}


          {/* =================================================
              FORM
          ================================================= */}

          <form onSubmit={handleLogin}>

            {/* EMAIL */}

            <div className="form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                disabled={loading}
                autoComplete="email"
              />

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <div className="password-input-row">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button type="button" className="password-visibility-button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
              </div>

              <div className="login-form-options">
                <span>Signed in securely with your SocialPilot account</span>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>

            </div>


            {/* LOGIN */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </button>

          </form>


          {/* REGISTER */}

          <div className="register-link">

            <span>
              Don't have an account?
            </span>

            <Link to="/register">
              Create Account
            </Link>

          </div>


          {/* HOME */}

          <div className="back-home">

            <Link to="/">
              ← Back to Home
            </Link>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;