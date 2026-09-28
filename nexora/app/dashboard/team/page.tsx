"use client";

import { useState } from "react";
import {
  Users,
  Plus,
  ShieldCheck,
  Check,
  X,
  Mail,
  UserCheck,
  MoreHorizontal,
  Trash2
} from "lucide-react";

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: "Active" | "Invited";
  permissions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    publish: boolean;
    analytics: boolean;
    manageTeam: boolean;
  };
}

export default function TeamPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Content Creator");

  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 1,
      name: "Team Member 1",
      email: "admin@socialpilot.com",
      role: "Admin",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      permissions: { view: true, create: true, edit: true, delete: true, publish: true, analytics: true, manageTeam: true }
    },
    {
      id: 2,
      name: "Team Member 2",
      email: "member2@socialpilot.com",
      role: "Content Creator",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      permissions: { view: true, create: true, edit: true, delete: false, publish: true, analytics: false, manageTeam: false }
    },
    {
      id: 3,
      name: "Team Member 3",
      email: "member3@socialpilot.com",
      role: "Marketing Team",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      permissions: { view: true, create: true, edit: true, delete: false, publish: true, analytics: true, manageTeam: false }
    },
    {
      id: 4,
      name: "Team Member 4",
      email: "member4@socialpilot.com",
      role: "Business User",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      status: "Active",
      permissions: { view: true, create: false, edit: false, delete: false, publish: false, analytics: true, manageTeam: false }
    }
  ]);

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;

    const newMember: TeamMember = {
      id: Date.now(),
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${inviteName.replace(' ', '')}`,
      status: "Active",
      permissions: {
        view: true,
        create: inviteRole !== "Business User",
        edit: inviteRole !== "Business User",
        delete: inviteRole === "Admin",
        publish: inviteRole !== "Business User",
        analytics: true,
        manageTeam: inviteRole === "Admin"
      }
    };

    setMembers([...members, newMember]);
    setShowInviteModal(false);
    setInviteName("");
    setInviteEmail("");
  };

  const handleRemoveMember = (id: number) => {
    if (id === 1) return; // protect primary admin
    setMembers(members.filter((m) => m.id !== id));
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-[#635BFF]" />
            Team Collaboration & RBAC
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Manage your marketing workspace members and customize role-based security permissions.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Members Cards & RBAC Matrix */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs overflow-hidden">
        <div className="pb-4 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">Workspace Members & Permissions Matrix</h3>
          <p className="text-xs text-slate-500">Granular rights configured per role</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="pb-3">Member</th>
                <th className="pb-3">Role</th>
                <th className="pb-3 text-center">View</th>
                <th className="pb-3 text-center">Create</th>
                <th className="pb-3 text-center">Edit</th>
                <th className="pb-3 text-center">Delete</th>
                <th className="pb-3 text-center">Publish</th>
                <th className="pb-3 text-center">Analytics</th>
                <th className="pb-3 text-center">Admin</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                  
                  {/* Member Name + Avatar */}
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-3">
                      <img src={m.avatar} alt="" className="h-9 w-9 rounded-xl object-cover border border-slate-200" />
                      <div>
                        <p className="font-bold text-slate-900 leading-tight">{m.name}</p>
                        <p className="text-[11px] text-slate-400">{m.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="py-3.5 pr-4">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                        m.role === "Admin"
                          ? "bg-indigo-50 text-[#635BFF] border border-indigo-200"
                          : m.role === "Marketing Team"
                          ? "bg-purple-50 text-[#7C3AED] border border-purple-200"
                          : m.role === "Content Creator"
                          ? "bg-cyan-50 text-[#06B6D4] border border-cyan-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>

                  {/* Permissions checkboxes */}
                  <td className="py-3.5 text-center">{m.permissions.view ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-3.5 text-center">{m.permissions.create ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-3.5 text-center">{m.permissions.edit ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-3.5 text-center">{m.permissions.delete ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-3.5 text-center">{m.permissions.publish ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-3.5 text-center">{m.permissions.analytics ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}</td>
                  <td className="py-3.5 text-center">{m.permissions.manageTeam ? <Check className="h-4 w-4 text-[#635BFF] mx-auto font-bold" /> : <span className="text-slate-300">—</span>}</td>

                  {/* Actions */}
                  <td className="py-3.5 text-right">
                    {m.id !== 1 ? (
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Owner</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Invite New Team Member
              </h3>
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Maya Krishnan"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="maya@company.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Role & Access Level</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
                >
                  <option value="Admin">Administrator (Full Access)</option>
                  <option value="Marketing Team">Marketing Team (Create, Edit, Publish, Analytics)</option>
                  <option value="Content Creator">Content Creator (Create, Edit, Publish)</option>
                  <option value="Business User">Business User (View & Analytics Only)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#635BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5046E5]"
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
