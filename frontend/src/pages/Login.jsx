import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");


    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

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
      // CALL FASTAPI LOGIN ENDPOINT
      // =================================================

      const response = await fetch(
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


      // =================================================
      // READ RESPONSE
      // =================================================

      const data = await response.json();


      // =================================================
      // LOGIN FAILED
      // =================================================

      if (!response.ok) {

        setError(
          data.detail || "Invalid email or password."
        );

        return;
      }


      // =================================================
      // CHECK TOKEN
      // =================================================

      if (!data.access_token) {

        setError(
          "Login failed: access token was not received."
        );

        return;
      }


      // =================================================
      // SAVE ACCESS TOKEN
      // =================================================

      localStorage.setItem(
        "access_token",
        data.access_token
      );


      // =================================================
      // LOGIN SUCCESS
      // GO TO DASHBOARD
      // =================================================

      navigate("/dashboard");

    } catch (error) {

      console.error("Login error:", error);

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
            create posts and view your analytics.
          </p>


          <div className="login-features">

            <div className="login-feature">
              📊 View Analytics
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


          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {error && (

            <div className="login-error">
              {error}
            </div>

          )}


          {/* =================================================
              LOGIN FORM
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
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />

            </div>


            {/* LOGIN BUTTON */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading ? "Logging in..." : "Login"}

            </button>

          </form>


          {/* =================================================
              REGISTER
          ================================================= */}

          <div className="register-link">

            <span>
              Don't have an account?
            </span>

            <Link to="/register">
              Create Account
            </Link>

          </div>


          {/* =================================================
              BACK TO HOME
          ================================================= */}

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