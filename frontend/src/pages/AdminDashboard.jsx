import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/auth/admin",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          setError(data.detail || "Admin access denied");
          return;
        }

        setAdmin(data);
      } catch (error) {
        console.error(error);
        setError("Cannot connect to backend");
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div className="admin-dashboard-page">

      <div className="admin-dashboard-container">

        <div className="admin-dashboard-header">

          <div>
            <div className="admin-logo">
              🚀 SocialPilot
            </div>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Manage and monitor the SocialPilot platform.
            </p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

        {error && (
          <div className="admin-error">
            <h2>Access Denied</h2>
            <p>{error}</p>

            <button
              onClick={() => navigate("/dashboard")}
            >
              Go to User Dashboard
            </button>
          </div>
        )}

        {admin && (
          <>
            {/* ADMIN INFORMATION */}

            <div className="admin-welcome-card">

              <h2>
                👋 {admin.message}
              </h2>

              <p>
                <strong>Email:</strong>{" "}
                {admin.user}
              </p>

              <p>
                <strong>Role:</strong>{" "}
                {admin.role}
              </p>

            </div>


            {/* ADMIN OPTIONS */}

            <div className="admin-options">

              {/* USER MANAGEMENT */}

              <div
                className="admin-option-card"
                onClick={() =>
                  navigate("/admin-users")
                }
              >

                <div className="admin-option-icon">
                  👥
                </div>

                <h2>
                  User Management
                </h2>

                <p>
                  View all registered users
                  on the platform.
                </p>

                <button>
                  Manage Users →
                </button>

              </div>


              {/* PLATFORM OVERVIEW */}

              <div className="admin-option-card">

                <div className="admin-option-icon">
                  📊
                </div>

                <h2>
                  Platform Overview
                </h2>

                <p>
                  Monitor platform activity
                  and system information.
                </p>

                <button>
                  View Overview →
                </button>

              </div>


              {/* SYSTEM MANAGEMENT */}

              <div className="admin-option-card">

                <div className="admin-option-icon">
                  ⚙️
                </div>

                <h2>
                  System Management
                </h2>

                <p>
                  Manage platform settings
                  and administration.
                </p>

                <button>
                  Manage System →
                </button>

              </div>

            </div>

          </>
        )}

      </div>

    </div>
  );
}

export default AdminDashboard;