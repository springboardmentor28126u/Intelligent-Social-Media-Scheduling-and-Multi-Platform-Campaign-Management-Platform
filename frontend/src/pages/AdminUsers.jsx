import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUsers.css";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUsers = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/auth/users",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("access_token");
          navigate("/login");
          return;
        }

        if (response.status === 403) {
          setError("You do not have permission to view users.");
          return;
        }

        if (!response.ok) {
          setError(data.detail || "Failed to load users.");
          return;
        }

        setUsers(data);
      } catch (error) {
        console.error("Fetch users error:", error);
        setError("Cannot connect to backend.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

  return (
    <div className="admin-users-page">

      <div className="admin-users-container">

        {/* HEADER */}
        <div className="admin-users-header">

          <div>
            <div className="admin-users-logo">
              🚀 SocialPilot
            </div>

            <h1>User Management</h1>

            <p>
              View all registered users on the platform.
            </p>
          </div>

          <button
            className="back-admin-button"
            onClick={() => navigate("/admin-dashboard")}
          >
            ← Admin Dashboard
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <div className="users-error">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading && !error && (
          <div className="users-loading">
            <h2>Loading users...</h2>
          </div>
        )}

        {/* USERS */}
        {!loading && !error && (
          <div className="users-card">

            <div className="users-card-header">

              <h2>Registered Users</h2>

              <p>
                Total Users: {users.length}
              </p>

            </div>

            {users.length === 0 ? (

              <div className="no-users">

                <div className="empty-users-icon">
                  👥
                </div>

                <h2>No users found</h2>

                <p>
                  There are no registered users.
                </p>

              </div>

            ) : (

              <div className="users-table-wrapper">

                <table className="users-table">

                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>

                  <tbody>

                    {users.map((user) => (

                      <tr key={user.id}>

                        <td>
                          {user.id}
                        </td>

                        <td>
                          <strong>
                            {user.name}
                          </strong>
                        </td>

                        <td>
                          {user.email}
                        </td>

                        <td>

                          <span
                            className={
                              user.role === "ADMIN"
                                ? "role-admin"
                                : "role-user"
                            }
                          >
                            {user.role}
                          </span>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>
        )}

      </div>

    </div>
  );
}

export default AdminUsers;