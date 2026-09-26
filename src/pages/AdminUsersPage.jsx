import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./AdminUsersPage.css";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get("/admin/users");
        setUsers(response.data);
      } catch (error) {
        setError(
          error.response?.data?.detail ||
            "Failed to load users"
        );
      }
    };

    loadUsers();
  }, []);

  if (error) {
    return (
      <div className="admin-users-error">
        {error}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="admin-users-loading">
        Loading users...
      </div>
    );
  }

  return (
    <div className="admin-users-page">

      {/* Header */}
      <div className="admin-users-header">

        <div className="admin-users-title">
          <h1>All Users</h1>
          <p>Manage and monitor all SocialPilot users</p>
        </div>

        <button
          className="admin-back-button"
          onClick={() => navigate("/admin/dashboard")}
        >
          ← Back to Dashboard
        </button>

      </div>

      {/* Users Card */}
      <div className="admin-users-card">

        <div className="admin-users-card-header">

          <h2>User Directory</h2>

          <span className="admin-users-count">
            {users.length} Users
          </span>

        </div>

        <div className="admin-users-table-wrapper">

          <table className="admin-users-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Social Accounts</th>
                <th>Posts</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>

              {users.map((user) => (
                <tr key={user.id}>

                  <td className="admin-number">
                    #{user.id}
                  </td>

                  <td>
                    <div className="admin-user-name">

                      <div className="admin-user-avatar">
                        {user.name
                          ? user.name.charAt(0).toUpperCase()
                          : "U"}
                      </div>

                      <span>
                        {user.name}
                      </span>

                    </div>
                  </td>

                  <td className="admin-user-email">
                    {user.email}
                  </td>

                  <td>
                    <span
                      className={`admin-role ${
                        user.system_role === "ADMIN"
                          ? "admin"
                          : "user"
                      }`}
                    >
                      {user.system_role}
                    </span>
                  </td>

                  <td className="admin-number">
                    {user.social_accounts}
                  </td>

                  <td className="admin-number">
                    {user.posts}
                  </td>

                  <td className="admin-created-date">
                    {new Date(
                      user.created_at
                    ).toLocaleDateString()}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}