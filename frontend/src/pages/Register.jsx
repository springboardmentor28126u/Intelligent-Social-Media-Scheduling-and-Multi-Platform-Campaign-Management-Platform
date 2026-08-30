import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

function Register() {

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleRegister = async (e) => {

    e.preventDefault();

    try {

      const response = await fetch(
        "http://127.0.0.1:8000/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name,
            email: email,
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {

        alert(
          data.detail || "Registration failed"
        );

        return;
      }

      alert("Registration successful!");

      console.log(data);

      // Go to login after successful registration
      navigate("/login");

    } catch (error) {

      console.error(error);

      alert(
        "Cannot connect to backend"
      );

    }
  };


  return (

    <div className="register-page">

      <div className="register-container">


        {/* =========================================
            LEFT SIDE
        ========================================= */}

        <div className="register-info">

          <div className="register-logo">
            🚀 SocialPilot
          </div>

          <h1>
            Start Managing Your Social Media
          </h1>

          <p>
            Create your SocialPilot account and manage
            all your social media activities from one
            powerful platform.
          </p>


          <div className="register-features">

            <div className="register-feature">
              <span>👥</span>
              <div>
                <h3>Manage Accounts</h3>
                <p>
                  Connect multiple social media accounts.
                </p>
              </div>
            </div>


            <div className="register-feature">
              <span>📝</span>
              <div>
                <h3>Create Content</h3>
                <p>
                  Create and manage your social media posts.
                </p>
              </div>
            </div>


            <div className="register-feature">
              <span>📅</span>
              <div>
                <h3>Schedule Posts</h3>
                <p>
                  Plan and schedule content easily.
                </p>
              </div>
            </div>


            <div className="register-feature">
              <span>📊</span>
              <div>
                <h3>View Analytics</h3>
                <p>
                  Track your social media activity.
                </p>
              </div>
            </div>

          </div>

        </div>


        {/* =========================================
            REGISTER CARD
        ========================================= */}

        <div className="register-card">

          <div className="register-header">

            <h2>
              Create Account
            </h2>

            <p>
              Register to get started with SocialPilot
            </p>

          </div>


          <form onSubmit={handleRegister}>


            {/* NAME */}

            <div className="register-form-group">

              <label htmlFor="name">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

            </div>


            {/* EMAIL */}

            <div className="register-form-group">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

            </div>


            {/* PASSWORD */}

            <div className="register-form-group">

              <label htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

            </div>


            {/* REGISTER BUTTON */}

            <button
              type="submit"
              className="register-button"
            >
              Create Account
            </button>

          </form>


          {/* LOGIN */}

          <div className="login-link">

            <span>
              Already have an account?
            </span>

            <Link to="/login">
              Login
            </Link>

          </div>


          {/* HOME */}

          <div className="register-home">

            <Link to="/">
              ← Back to Home
            </Link>

          </div>

        </div>

      </div>

    </div>

  );
}

export default Register;