import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate
} from "react-router-dom";
import React from "react";

import "./App.css";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import SocialAccounts from "./pages/SocialAccounts";
import Posts from "./pages/Posts";
import CreatePost from "./pages/CreatePost";
import Calendar from "./pages/Calendar";
import Drafts from "./pages/Drafts";
import PublishingLogs from "./pages/PublishingLogs";
import PublishingQueue from "./pages/PublishingQueue";
import Campaigns from "./pages/Campaigns";
import CreateCampaign from "./pages/CreateCampaign";
import CampaignDetails from "./pages/CampaignDetails";

function ThemeToggle() {
  const [theme, setTheme] = React.useState(() => {
    const savedTheme = localStorage.getItem("socialpilot-theme");
    return savedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("socialpilot-theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
// =====================================================
// PROTECTED ROUTE
// =====================================================

function ProtectedRoute({ children }) {

  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


// =====================================================
// ADMIN ROUTE
// =====================================================

function AdminRoute({ children }) {

  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


// =====================================================
// HOME PAGE
// =====================================================

function Home() {

  return (

    <div className="home-page">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="logo">
          SocialPilot
        </div>

        <div className="nav-links">

          <Link
            to="/login"
            className="nav-login"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="nav-register"
          >
            Register
          </Link>

        </div>

      </nav>


      {/* HERO */}

      <section className="hero">

        <div className="hero-content">

          <div className="hero-badge">
            🚀 Social Media Management Platform
          </div>

          <h1>
            Manage Your Social Media
            <span>
              {" "}in One Place
            </span>
          </h1>

          <p>
            Create, schedule and manage your social media
            content from a single, simple and powerful platform.
          </p>

          <div className="hero-buttons">

            <Link
              to="/register"
              className="primary-button"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="secondary-button"
            >
              Login
            </Link>

          </div>

        </div>

      </section>


      {/* FEATURES */}

      <section className="features">

        <div className="section-heading">

          <h2>
            Everything You Need
          </h2>

          <p>
            Manage your social media workflow efficiently
            from one platform.
          </p>

        </div>


        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">
              👥
            </div>

            <h3>
              Social Account Management
            </h3>

            <p>
              Connect and manage multiple social media
              accounts from a single dashboard.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              📝
            </div>

            <h3>
              Content Management
            </h3>

            <p>
              Create, edit, publish and delete social media
              posts easily.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              📅
            </div>

            <h3>
              Post Scheduling
            </h3>

            <p>
              Schedule your content and manage upcoming
              posts efficiently.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              📊
            </div>

            <h3>
              Dashboard
            </h3>

            <p>
              View your social accounts and post activity
              through a centralized dashboard.
            </p>

          </div>

        </div>

      </section>


      {/* WORKFLOW */}

      <section className="workflow">

        <div className="section-heading">

          <h2>
            Simple Social Media Workflow
          </h2>

          <p>
            Manage your content in a few simple steps.
          </p>

        </div>


        <div className="workflow-grid">

          <div className="workflow-step">

            <div className="step-number">
              1
            </div>

            <h3>
              Connect
            </h3>

            <p>
              Add your social media account.
            </p>

          </div>


          <div className="workflow-arrow">
            →
          </div>


          <div className="workflow-step">

            <div className="step-number">
              2
            </div>

            <h3>
              Create
            </h3>

            <p>
              Create your social media content.
            </p>

          </div>


          <div className="workflow-arrow">
            →
          </div>


          <div className="workflow-step">

            <div className="step-number">
              3
            </div>

            <h3>
              Schedule
            </h3>

            <p>
              Choose your preferred date and time.
            </p>

          </div>


          <div className="workflow-arrow">
            →
          </div>


          <div className="workflow-step">

            <div className="step-number">
              4
            </div>

            <h3>
              Publish
            </h3>

            <p>
              Publish and manage your posts.
            </p>

          </div>

        </div>

      </section>


      {/* CTA */}

      <section className="cta">

        <h2>
          Start Managing Your Social Media
        </h2>

        <p>
          Create your SocialPilot account and get started.
        </p>

        <Link
          to="/register"
          className="primary-button"
        >
          Create Account
        </Link>

      </section>


      {/* FOOTER */}

      <footer>

        <div className="footer-logo">
          SocialPilot
        </div>

        <p>
          Social Media Scheduler & Campaign Management Platform
        </p>

        <div className="footer-links">

          <Link to="/login">
            Login
          </Link>

          <Link to="/register">
            Register
          </Link>

        </div>

        <p className="copyright">
          © 2026 SocialPilot. All rights reserved.
        </p>

      </footer>

    </div>

  );

}


// =====================================================
// APP
// =====================================================

function App() {

  return (

    <BrowserRouter>

      <ThemeToggle />

      <Routes>

        {/* =================================================
            PUBLIC ROUTES
        ================================================= */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =================================================
            USER DASHBOARD
        ================================================= */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN DASHBOARD
        ================================================= */}

        <Route
          path="/admin-dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />


        {/* =================================================
            ADMIN USER MANAGEMENT
        ================================================= */}

        <Route
          path="/admin-users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />


        {/* =================================================
            SOCIAL ACCOUNTS
        ================================================= */}

        <Route
          path="/social-accounts"
          element={
            <ProtectedRoute>
              <SocialAccounts />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            CREATE POST
        ================================================= */}

        <Route
          path="/create-post"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            POSTS
        ================================================= */}

        <Route
          path="/posts"
          element={
            <ProtectedRoute>
              <Posts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaigns"
          element={
            <ProtectedRoute>
              <Campaigns />
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaigns/create"
          element={
            <ProtectedRoute>
              <CreateCampaign />
            </ProtectedRoute>
          }
        />

        <Route
          path="/campaigns/:id"
          element={
            <ProtectedRoute>
              <CampaignDetails />
            </ProtectedRoute>
          }
        />


        <Route
          path="/calendar"
          element={
          <ProtectedRoute>
          <Calendar />
          </ProtectedRoute>
        }
       />


       <Route
         path="/drafts"
         element={
         <ProtectedRoute>
         <Drafts />
         </ProtectedRoute>
       }
      />
      <Route path="/publishing-logs" element={<PublishingLogs />} />



      <Route
      path="/publishing-queue"
      element={<PublishingQueue />}
     />


        {/* =================================================
            UNKNOWN ROUTE
        ================================================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

    </BrowserRouter>

  );

}

export default App;