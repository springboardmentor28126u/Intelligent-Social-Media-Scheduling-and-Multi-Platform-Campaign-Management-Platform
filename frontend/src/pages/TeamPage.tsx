import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "../components/UserAvatar";
import {
  Users,
  Plus,
  Mail,
  Shield,
  Trash2,
  X,
  Share2,
} from "lucide-react";

export default function TeamPage() {
  const { showToast } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("content_creator");

  const loadTeam = async () => {
    setLoading(true);
    try {
      const data = await api.team.listMembers();
      setMembers(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.team.inviteMember({
        email: inviteEmail,
        role: inviteRole,
      });
      showToast("Invitation Dispatched! ✉️", `Invited ${inviteEmail} to workspace.`, "success");
      setIsInviteModalOpen(false);
      setInviteEmail("");
      loadTeam();
    } catch (err: any) {
      showToast("Invite Error", err.message, "error");
    }
  };

  const handleRemoveMember = async (id: number) => {
    if (!confirm("Remove this member from the organization workspace?")) return;
    try {
      await api.team.removeMember(id);
      showToast("Removed", "Member removed from workspace.", "info");
      loadTeam();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "administrator":
        return { label: "Admin User", bg: "bg-purple-50 text-purple-700 border-purple-200" };
      case "business_user":
        return { label: "Business User", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "marketing_team":
        return { label: "Marketing Lead", bg: "bg-blue-50 text-blue-700 border-blue-200" };
      case "content_creator":
      default:
        return { label: "Content Creator", bg: "bg-pink-50 text-pink-700 border-pink-200" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Team Workspaces & Collaborators
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Invite team members, assign workspace permission tiers, and manage collaboration.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Organization Details Banner */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <Share2 size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Acme Global Marketing Organization</h3>
            <p className="text-xs text-slate-500 mt-0.5">Primary Enterprise Workspace • 4 Member Seats Used</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            Enterprise Plan (Unlimited Seats)
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Workspace Members</h3>
            <p className="text-xs text-slate-500 mt-0.5">Authorized collaborators with role-based access</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-xl">
            {members.length} Members
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading team members...
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center p-8 space-y-3">
            <Users className="mx-auto text-slate-300" size={36} />
            <h3 className="text-base font-bold text-slate-800">No members found</h3>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((m) => {
              const b = getRoleBadge(m.role);
              return (
                <div
                  key={m.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <UserAvatar name={m.name || m.user_email} email={m.user_email} role={m.role} size="md" />

                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {m.name || (m.role ? m.role.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "User")}
                      </p>
                      <p className="text-xs text-slate-500 font-mono truncate">{m.user_email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 self-end sm:self-auto">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${b.bg}`}>
                      {b.label}
                    </span>

                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Remove Member"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Mail size={20} className="text-blue-600" />
                Invite Workspace Collaborator
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleInviteMember}>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Member Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Permission Tier
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                >
                  <option value="content_creator">Content Creator (Compose & Submit Drafts)</option>
                  <option value="marketing_team">Marketing Lead (Queue & Manage Campaigns)</option>
                  <option value="business_user">Business Owner (ROI Analytics & Reports)</option>
                  <option value="administrator">Administrator (Full Access & Security)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 cursor-pointer"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
