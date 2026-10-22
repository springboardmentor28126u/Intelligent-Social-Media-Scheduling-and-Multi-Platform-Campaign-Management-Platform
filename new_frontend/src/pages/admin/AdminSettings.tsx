import { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  AlertCircle,
  Loader2,
  HardDrive,
  Users,
  Bell,
  Radio,
  Sliders,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminSettings } from '@/types/admin';
import { getAdminSettings, updateAdminSettings } from '@/services/admin';

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        checked ? 'bg-brand-600' : 'bg-ink-200'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const ALL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'x', name: 'X (Twitter)' },
];

export default function AdminSettingsPage() {
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [settings, setSettings] = useState<AdminSettings>({
    allow_signups: true,
    require_approval: false,
    max_upload_size_mb: 200,
    default_user_role: 'Content Creator',
    maintenance_mode: false,
    system_announcement: '',
    allowed_platforms: ['instagram', 'facebook', 'linkedin', 'youtube', 'x'],
    email_notifications: true,
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await getAdminSettings();
        setSettings(data);
      } catch (err: any) {
        console.error('Failed to load settings:', err);
        setErrorMsg(err.message || 'Could not load platform settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const updated = await updateAdminSettings(settings);
      setSettings(updated);
      setSuccessMsg('Platform settings saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setSettings({
      allow_signups: true,
      require_approval: false,
      max_upload_size_mb: 200,
      default_user_role: 'Content Creator',
      maintenance_mode: false,
      system_announcement: '',
      allowed_platforms: ['instagram', 'facebook', 'linkedin', 'youtube', 'x'],
      email_notifications: true,
    });
  };

  const togglePlatform = (platformId: string) => {
    setSettings((prev) => {
      const current = prev.allowed_platforms || [];
      const updated = current.includes(platformId)
        ? current.filter((p) => p !== platformId)
        : [...current, platformId];
      return { ...prev, allowed_platforms: updated };
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Admin Settings"
        description="Configure platform policies, upload limits, registration rules, and system announcements."
      />

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-success-200 bg-success-50 p-4 text-sm font-medium text-success-700 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm font-medium text-danger-700 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Admin Profile Overview */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink-900">{profile?.full_name || 'System Administrator'}</h3>
                <Badge variant="brand" size="sm">Active Admin</Badge>
              </div>
              <p className="text-xs text-ink-400 mt-0.5">{profile?.email || 'admin@socialflow.app'}</p>
              <p className="text-xs text-ink-500 mt-1">Superuser privileges & full platform control.</p>
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-ink-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          <p className="text-sm">Loading system settings...</p>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: User Registration & Access */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-ink-100 pb-3">
              <Users className="h-5 w-5 text-brand-600" />
              <div>
                <h3 className="text-base font-semibold text-ink-900">User Registration & Access</h3>
                <p className="text-xs text-ink-400">Control account creation and approval flow.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4 transition-colors hover:bg-ink-100/50">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Allow New User Signups</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Allow new creators and team members to register on the platform.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings.allow_signups}
                  onChange={(val) => setSettings((s) => ({ ...s, allow_signups: val }))}
                />
              </div>

              <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4 transition-colors hover:bg-ink-100/50">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Require Administrator Approval</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    New accounts must be reviewed and activated by an admin before signing in.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings.require_approval}
                  onChange={(val) => setSettings((s) => ({ ...s, require_approval: val }))}
                />
              </div>

              <div className="rounded-xl border border-ink-100 p-4">
                <label className="text-xs font-semibold text-ink-700">Default Assigned Role</label>
                <p className="text-xs text-ink-400 mb-2">
                  Role automatically given to new users upon registration. Administrator cannot be assigned by default upon signup for platform security.
                </p>
                <select
                  value={settings.default_user_role}
                  onChange={(e) => setSettings((s) => ({ ...s, default_user_role: e.target.value }))}
                  className="w-full sm:w-72 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 cursor-pointer"
                >
                  <option value="Content Creator">Content Creator</option>
                  <option value="Social Media Manager">Social Media Manager</option>
                  <option value="Analyst">Analyst</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Section 2: Storage & Media Limits */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-ink-100 pb-3">
              <HardDrive className="h-5 w-5 text-purple-600" />
              <div>
                <h3 className="text-base font-semibold text-ink-900">Storage & Media Limits</h3>
                <p className="text-xs text-ink-400">Configure file upload limits and platform connectors.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-ink-100 p-4">
                <label className="text-xs font-semibold text-ink-700">Maximum Upload Size (MB)</label>
                <p className="text-xs text-ink-400 mb-2">
                  Limit for video and image file uploads in Media Library and Create Post.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="10"
                    max="1024"
                    value={settings.max_upload_size_mb}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        max_upload_size_mb: parseInt(e.target.value) || 200,
                      }))
                    }
                    className="w-36 rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                  />
                  <span className="text-xs text-ink-500">Megabytes (Recommended: 200MB - 500MB)</span>
                </div>
              </div>

              <div className="rounded-xl border border-ink-100 p-4">
                <label className="text-xs font-semibold text-ink-700">Enabled Social Platforms</label>
                <p className="text-xs text-ink-400 mb-3">
                  Enable or disable target social networks for multi-platform publishing.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALL_PLATFORMS.map((platform) => {
                    const isChecked = (settings.allowed_platforms || []).includes(platform.id);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => togglePlatform(platform.id)}
                        className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                          isChecked
                            ? 'border-brand-500 bg-brand-50/50 text-brand-900 font-medium'
                            : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                        }`}
                      >
                        <span className="text-sm">{platform.name}</span>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                            isChecked
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-ink-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: Maintenance & Announcements */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-ink-100 pb-3">
              <Radio className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-base font-semibold text-ink-900">System Announcement & Maintenance</h3>
                <p className="text-xs text-ink-400">Broadcast platform notices and manage downtime.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4 transition-colors hover:bg-ink-100/50">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Maintenance Mode</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Display a maintenance banner to all non-admin users.
                  </p>
                </div>
                <ToggleSwitch
                  checked={settings.maintenance_mode}
                  onChange={(val) => setSettings((s) => ({ ...s, maintenance_mode: val }))}
                />
              </div>

              <div className="rounded-xl border border-ink-100 p-4">
                <label className="text-xs font-semibold text-ink-700">Platform Announcement Banner</label>
                <p className="text-xs text-ink-400 mb-2">
                  Optional message displayed across creator dashboards.
                </p>
                <textarea
                  rows={2}
                  value={settings.system_announcement || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, system_announcement: e.target.value }))}
                  placeholder="e.g. Scheduled system upgrade this Sunday at 2:00 AM UTC."
                  className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2 text-sm text-ink-700 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                />
              </div>
            </div>
          </Card>

          {/* Section 4: System Notifications */}
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2.5 border-b border-ink-100 pb-3">
              <Bell className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-semibold text-ink-900">Notifications & Alerts</h3>
                <p className="text-xs text-ink-400">Configure administrative notifications.</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4 transition-colors hover:bg-ink-100/50">
              <div>
                <p className="text-sm font-semibold text-ink-900">Email Alerts & Digests</p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Send transactional emails for failed post alerts and system events.
                </p>
              </div>
              <ToggleSwitch
                checked={settings.email_notifications}
                onChange={(val) => setSettings((s) => ({ ...s, email_notifications: val }))}
              />
            </div>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleResetDefaults}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Reset to Defaults
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            >
              {saving ? 'Saving Settings...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
