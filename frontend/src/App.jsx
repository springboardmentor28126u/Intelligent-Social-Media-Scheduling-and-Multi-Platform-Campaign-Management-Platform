import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation
} from "react-router-dom";
import React from "react";

import { useTheme } from "./context/ThemeContext";
import "./App.css";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSection from "./pages/AdminSection";
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
import Notifications from "./pages/Notifications";
import Reports from "./pages/Reports";
import { ForgotPassword, ResetPassword } from "./pages/PasswordRecovery";
import WorkspaceLayout from "./components/WorkspaceLayout";

function ThemeToggle() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const workspaceRoute = /^\/(dashboard|analytics|campaigns|social-accounts|posts|create-post|calendar|drafts|publishing-|reports|notifications|settings|admin(?:\/|$)|admin-)/.test(location.pathname);

  if (workspaceRoute) return null;

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
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
  const { pathname } = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const active = pathname === "/publishing-queue" ? "publishing-queue"
    : pathname.startsWith("/campaigns") ? "campaigns"
    : pathname === "/calendar" ? "calendar"
      : ["/create-post", "/drafts", "/publishing-logs", "/publishing-queue"].includes(pathname) ? "posts"
      : pathname === "/social-accounts" ? "accounts"
        : pathname === "/analytics" ? "analytics"
          : pathname === "/reports" ? "reports"
            : pathname === "/notifications" ? "notifications"
              : pathname === "/settings" ? "settings"
                : "dashboard";

  return <WorkspaceLayout active={active}>{children}</WorkspaceLayout>;
}


// =====================================================
// ADMIN ROUTE
// =====================================================

function AdminRoute({ children }) {

  const token = localStorage.getItem("access_token");
  const { pathname } = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (localStorage.getItem("role") !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  const section = pathname.split("/")[2];
  const active = section ? `admin-${section}` : "admin";
  return <WorkspaceLayout active={active} admin>{children}</WorkspaceLayout>;
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

        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />


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

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />


        {/* =================================================
            ADMIN DASHBOARD
        ================================================= */}

        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/:section" element={<AdminRoute><AdminSection /></AdminRoute>} />
        <Route path="/admin-dashboard" element={<AdminRoute><Navigate to="/admin" replace /></AdminRoute>} />
        <Route path="/admin-users" element={<AdminRoute><Navigate to="/admin/users" replace /></AdminRoute>} />


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
      <Route path="/publishing-logs" element={<ProtectedRoute><PublishingLogs /></ProtectedRoute>} />



      <Route
      path="/publishing-queue"
      element={<ProtectedRoute><PublishingQueue /></ProtectedRoute>}
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