
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./ProfilePage.css";

export default function ProfilePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/auth/me",
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

        setUser(data);
      } catch (err) {
        setError("Unable to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <h2>Loading profile...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-error">
        <h2>Profile Error</h2>
        <p>{error}</p>

        <Link to="/login">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-card">

        <div className="profile-header">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>

          <h1>{user?.name || "User"}</h1>

          <p className="profile-subtitle">
            {user?.email}
          </p>
        </div>

        <div className="profile-info">

          <div className="profile-row">
            <span className="profile-label">Name</span>
            <span className="profile-value">
              {user?.name || "Not provided"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Email</span>
            <span className="profile-value">
              {user?.email || "Not provided"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">System Role</span>
            <span className="profile-value">
              {user?.system_role || "USER"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Profile Role</span>
            <span className="profile-value">
              {user?.profile?.role || "Not provided"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Date of Birth</span>
            <span className="profile-value">
              {user?.profile?.date_of_birth || "Not provided"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Phone</span>
            <span className="profile-value">
              {user?.profile?.phone || "Not provided"}
            </span>
          </div>

          <div className="profile-row">
            <span className="profile-label">Bio</span>
            <span className="profile-value">
              {user?.profile?.bio || "Not provided"}
            </span>
          </div>

        </div>

        <div className="profile-actions">

          <Link
            to="/profile/update"
            className="profile-button update-button"
          >
            Update Profile
          </Link>

          <Link
            to="/"
            className="profile-button home-button"
          >
            Home
          </Link>

          <button
            onClick={handleLogout}
            className="profile-button logout-button"
          >
            Logout
          </button>

        </div>

      </div>
    </div>
  );
}

