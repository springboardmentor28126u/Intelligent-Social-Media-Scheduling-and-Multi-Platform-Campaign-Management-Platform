import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState("");

  const navigate = useNavigate();

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
    <div>
      <h1>SocialPilot Admin Dashboard</h1>

      {error && (
        <div>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </button>
        </div>
      )}

      {admin && (
        <div>
          <h2>{admin.message}</h2>

          <p>
            <strong>Email:</strong> {admin.user}
          </p>

          <p>
            <strong>Role:</strong> {admin.role}
          </p>

          <button onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;