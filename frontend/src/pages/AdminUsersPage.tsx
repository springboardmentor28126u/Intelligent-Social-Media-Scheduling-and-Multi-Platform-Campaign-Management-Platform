import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth, RoleType } from "../context/AuthContext";
import UserAvatar from "../components/UserAvatar";
import {
  Users,
  Shield,
  Trash2,
  Edit2,
  X,
  Search,
  CheckCircle2,
} from "lucide-react";

export default function AdminUsersPage() {
  const { user: currentUser, showToast, triggerRoleChangeLogout } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.list();
      setUsers(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await api.users.update(editingUser.id, { role: selectedRole });
      showToast("Role Updated 👍", `Role for ${editingUser.email} updated to ${selectedRole}.`, "success");

      const isModifyingSelf = currentUser?.id === editingUser.id || currentUser?.email === editingUser.email;
      setEditingUser(null);

      if (isModifyingSelf) {
        // Enforce re-login
        triggerRoleChangeLogout(selectedRole as RoleType);
      } else {
        loadUsers();
      }
    } catch (err: any) {
      showToast("Update Error", err.message, "error");
    }
  };

  const handleDeleteUser = async (id: number, email: string) => {
    if (email === "admin@socialpilot.io") {
      alert("The primary admin account cannot be deleted.");
      return;
    }
    if (!confirm(`Permanently remove ${email} from the system?`)) return;

    try {
      await api.users.delete(id);
      showToast("User Removed", `${email} has been deleted.`, "info");
      loadUsers();
    } catch (err: any) {
      showToast("Delete Error", err.message, "error");
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "administrator":
        return { label: "Administrator", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "business_user":
        return { label: "Business User", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "marketing_team":
        return { label: "Marketing Lead", bg: "bg-blue-50 text-blue-700 border-blue-200" };
      case "content_creator":
      default:
        return { label: "Content Creator", bg: "bg-pink-50 text-pink-700 border-pink-200" };
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            User Administration
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage system users, change role privilege tiers, and monitor active sessions.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-xs"
          />
        </div>
      </div>

      {/* Users Directory Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Registered Accounts</h3>
            <p className="text-xs text-slate-500 mt-0.5">Live platform users and RBAC permission assignments</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
            {filteredUsers.length} Users
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading users...
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((u) => {
              const b = getRoleBadge(u.role);
              return (
                <div
                  key={u.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <UserAvatar name={u.name} email={u.email} role={u.role} size="md" />

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.2 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${b.bg}`}>
                      {b.label}
                    </span>

                    <button
                      onClick={() => {
                        setEditingUser(u);
                        setSelectedRole(u.role);
                      }}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Edit User Role"
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Change User Role
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleUpdateRole}>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500">Target User</p>
                <p className="text-sm font-bold text-slate-900">{editingUser.name}</p>
                <p className="text-xs text-slate-500 font-mono">{editingUser.email}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select New Privilege Tier
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="administrator">Administrator (Full Master Access)</option>
                  <option value="business_user">Business User (Executive ROI & Growth)</option>
                  <option value="marketing_team">Marketing Lead (Queue & Calendar)</option>
                  <option value="content_creator">Content Creator (Compose & Submissions)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 leading-relaxed font-medium">
                ⚠️ Modifying role permissions takes effect immediately. If you change your own role, you will be logged out and required to log in again.
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
