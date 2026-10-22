import { useState } from 'react';
import {
  X,
  Check,
  Shield,
  Briefcase,
  PenTool,
  BarChart3,
  Lock,
  ChevronDown,
  Loader2,
  Key,
} from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import {
  ALL_ROLES,
  ROLE_CONFIGS,
  PERMISSION_CONFIGS,
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  normalizeRole,
  type RoleName,
} from '@/lib/permissions';

interface UserAccessModalProps {
  user: {
    id: string;
    email: string | null;
    full_name?: string | null;
    role: string;
    created_at?: string;
  };
  isCurrentAdmin: boolean;
  onClose: () => void;
  onRoleChange: (userId: string, newRole: RoleName) => Promise<void>;
}

export default function UserAccessModal({
  user,
  isCurrentAdmin,
  onClose,
  onRoleChange,
}: UserAccessModalProps) {
  const currentRole = normalizeRole(user.role);
  const roleConfig = ROLE_CONFIGS[currentRole];
  const Icon = roleConfig.icon;
  const grantedSet = PERMISSIONS[currentRole] || new Set();

  const [updating, setUpdating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleName>(currentRole);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewSet = PERMISSIONS[selectedRole] || new Set();
  const grantedCount = previewSet.size;

  const handleApplyRole = async () => {
    if (selectedRole === currentRole) {
      onClose();
      return;
    }
    setUpdating(true);
    setErrorMsg(null);
    try {
      await onRoleChange(user.id, selectedRole);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-100 p-5 bg-ink-50/50">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${roleConfig.bgClass} ${roleConfig.colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink-900">
                  {user.full_name || 'User Profile'}
                </h3>
                {isCurrentAdmin && (
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                    You (Admin)
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-500">{user.email || 'No email'}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Assignment Switcher */}
        <div className="border-b border-ink-100 bg-white p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Assigned Role of Access
              </label>
              <p className="text-xs text-ink-600 mt-0.5">
                {isCurrentAdmin
                  ? "Your own role cannot be changed from this account."
                  : "Change this user's role to adjust their capabilities in real-time."}
              </p>
            </div>

            {isCurrentAdmin ? (
              <div className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs text-ink-500">
                <Lock className="h-3.5 w-3.5 text-ink-400" />
                <span>Role Locked</span>
              </div>
            ) : (
              <div className="relative inline-block">
                <select
                  value={selectedRole}
                  disabled={updating}
                  onChange={(e) => setSelectedRole(e.target.value as RoleName)}
                  className="appearance-none rounded-xl border border-ink-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-ink-800 transition-all hover:border-brand-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 cursor-pointer"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r} ({ROLE_CONFIGS[r].permissionCount} privileges)
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-danger-50 border border-danger-200 px-3 py-2 text-xs text-danger-700">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-ink-50/70 p-3 text-xs">
            <span className="text-ink-600 font-medium">Effective Permissions Level:</span>
            <Badge variant={ROLE_CONFIGS[selectedRole].badgeVariant}>
              {grantedCount} / 12 Privileges Active
            </Badge>
          </div>
        </div>

        {/* Scrollable Permissions List by Category */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Permission Capabilities Breakdown
          </h4>

          {PERMISSION_CATEGORIES.map((cat) => {
            const catPerms = PERMISSION_CONFIGS.filter((p) => p.category === cat);
            return (
              <div key={cat} className="space-y-2">
                <p className="text-xs font-semibold text-ink-700">{cat}</p>
                <div className="space-y-1.5">
                  {catPerms.map((perm) => {
                    const isGranted = previewSet.has(perm.key);
                    return (
                      <div
                        key={perm.key}
                        className={`flex items-start justify-between gap-3 rounded-xl border p-2.5 transition-colors ${
                          isGranted
                            ? 'border-emerald-200/80 bg-emerald-50/30'
                            : 'border-ink-100 bg-ink-50/30 opacity-70'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium ${isGranted ? 'text-ink-900' : 'text-ink-600'}`}>
                            {perm.label}
                          </p>
                          <p className="text-[11px] text-ink-400 mt-0.5">{perm.description}</p>
                        </div>

                        <div>
                          {isGranted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              <Check className="h-3 w-3 stroke-[2.5]" />
                              Granted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                              <X className="h-3 w-3" />
                              Restricted
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-ink-100 p-4 bg-ink-50/50 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updating}>
            Close
          </Button>
          {!isCurrentAdmin && selectedRole !== currentRole && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleApplyRole}
              disabled={updating}
              leftIcon={updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            >
              {updating ? 'Saving...' : `Save as ${selectedRole}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
