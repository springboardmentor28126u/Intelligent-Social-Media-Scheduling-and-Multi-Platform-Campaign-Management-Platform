import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Check,
  X,
  Lock,
} from "lucide-react";

export default function AdminRolesPage() {
  const { showToast } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await api.admin.listRoles();
      setRoles(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const permissionModules = [
    {
      module: "Authentication & Users",
      permissions: [
        { key: "users.create", label: "Create & Invite Users" },
        { key: "users.edit", label: "Edit User Role Privileges" },
        { key: "users.delete", label: "Delete Platform Accounts" },
      ],
    },
    {
      module: "Content & Publishing",
      permissions: [
        { key: "posts.create", label: "Compose Posts & Attach Media" },
        { key: "posts.publish", label: "Publish Directly to Social Networks" },
        { key: "posts.approve", label: "Approve Content Submissions" },
        { key: "posts.delete", label: "Delete Scheduled / Draft Posts" },
      ],
    },
    {
      module: "Campaigns & Marketing",
      permissions: [
        { key: "campaigns.manage", label: "Create & Edit Campaigns" },
        { key: "campaigns.budgets", label: "Manage Campaign Budget Limits" },
      ],
    },
    {
      module: "Analytics & Executive Reports",
      permissions: [
        { key: "analytics.view", label: "View Aggregate Audience Metrics" },
        { key: "reports.export", label: "Generate PDF & Excel Reports" },
      ],
    },
    {
      module: "System & Audit Governance",
      permissions: [
        { key: "system.audit", label: "View SOC2 Audit Trail Logs" },
        { key: "system.retry", label: "Retry Background Worker Tasks" },
      ],
    },
  ];

  const hasPermission = (role: any, permKey: string) => {
    if (role.name === "administrator") return true;
    return role.permissions?.includes(permKey) || role.permissions?.includes("*");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enforce role privileges, module capabilities, and SOC2 governance across all 4 system tiers.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
          <ShieldCheck size={16} />
          <span>Strict Server-Enforced RBAC</span>
        </div>
      </div>

      {/* RBAC Matrix Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Privilege & Capability Matrix</h3>
            <p className="text-xs text-slate-500 mt-0.5">Summary of operations granted per role</p>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
            Loading role definitions...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-4 px-6">Capability / Module</th>
                  <th className="py-4 px-4 text-center">Administrator</th>
                  <th className="py-4 px-4 text-center">Business User</th>
                  <th className="py-4 px-4 text-center">Marketing Lead</th>
                  <th className="py-4 px-4 text-center">Content Creator</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {permissionModules.map((group) => (
                  <React.Fragment key={group.module}>
                    <tr className="bg-slate-50/60">
                      <td colSpan={5} className="py-3 px-6 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {group.module}
                      </td>
                    </tr>

                    {group.permissions.map((perm) => (
                      <tr key={perm.key} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-6 font-semibold text-slate-800">
                          {perm.label}
                          <span className="block text-[11px] font-mono text-slate-400 font-normal mt-0.5">
                            {perm.key}
                          </span>
                        </td>

                        {/* Administrator */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-200">
                            <Check size={16} />
                          </div>
                        </td>

                        {/* Business User */}
                        <td className="py-3.5 px-4 text-center">
                          {perm.key.startsWith("campaigns") || perm.key.startsWith("analytics") || perm.key.startsWith("reports") ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <Check size={16} />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400">
                              <X size={14} />
                            </div>
                          )}
                        </td>

                        {/* Marketing Team */}
                        <td className="py-3.5 px-4 text-center">
                          {perm.key.startsWith("posts") || perm.key.startsWith("campaigns") || perm.key.startsWith("analytics") || perm.key.startsWith("reports") ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                              <Check size={16} />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400">
                              <X size={14} />
                            </div>
                          )}
                        </td>

                        {/* Content Creator */}
                        <td className="py-3.5 px-4 text-center">
                          {perm.key === "posts.create" ? (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-pink-50 text-pink-600 border border-pink-200">
                              <Check size={16} />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-400">
                              <X size={14} />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
