import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Briefcase,
  Link2,
  Bell,
  Shield,
  SlidersHorizontal,
  Camera,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Key,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import UserAccessModal from '@/components/admin/UserAccessModal';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/lib/permissions';

const API_BASE = 'http://localhost:8000';

const tabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'workspace', label: 'Workspace', icon: Briefcase },
  { key: 'integrations', label: 'Social Integrations', icon: Link2 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
        checked ? 'bg-brand-600' : 'bg-ink-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const [active, setActive] = useState('profile');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader title="Settings" description="Manage your personal profile, team workspace, social integrations, and account security." />

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tab sidebar */}
        <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all lg:w-full ${
                active === t.key
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <t.icon className="h-[18px] w-[18px]" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-6">
          {active === 'profile' && <ProfileSettings />}
          {active === 'workspace' && <WorkspaceSettings />}
          {active === 'integrations' && <IntegrationsSettings />}
          {active === 'notifications' && <NotificationSettings />}
          {active === 'security' && <SecuritySettings />}
          {active === 'preferences' && <PreferencesSettings />}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [timezone, setTimezone] = useState('UTC+05:30 (India Standard Time)');
  const [saving, setSaving] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          email,
          preferences: { timezone },
        }),
      });
      if (res.ok) {
        setSuccess('Profile updated successfully.');
        setTimeout(() => setSuccess(null), 3500);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to update profile.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Personal Profile</h3>
      <p className="mt-0.5 text-sm text-ink-400">Update your personal account information and timezone.</p>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 border border-success-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger-700 border border-danger-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Avatar */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 font-bold text-xl shadow-soft">
          {(name || email || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">{name || 'User'}</p>
          <p className="text-xs text-ink-400">{email}</p>
        </div>
      </div>

      {/* Form fields */}
      <form onSubmit={handleSave}>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-500">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-ink-500">Platform Role</label>
              <button
                type="button"
                onClick={() => setShowAccessModal(true)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                title="View your role's permissions and access capabilities"
              >
                <Key className="h-3 w-3" />
                View Roles of Access
              </button>
            </div>
            <input
              type="text"
              disabled
              value={profile?.role ? normalizeRole(profile.role) : 'Content Creator'}
              className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-100/60 px-4 py-2.5 text-sm text-ink-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500">Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {showAccessModal && profile && (
        <UserAccessModal
          user={{
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            created_at: profile.created_at,
          }}
          isCurrentAdmin={true}
          onClose={() => setShowAccessModal(false)}
          onRoleChange={async () => {}}
        />
      )}
    </Card>
  );
}

function WorkspaceSettings() {
  const [workspaceName, setWorkspaceName] = useState('My Social Studio');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(null);
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch(`${API_BASE}/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferences: { workspace_name: workspaceName },
          }),
        });
      }
      setSuccess('Workspace settings updated.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Workspace</h3>
      <p className="mt-0.5 text-sm text-ink-400">Manage your workspace branding and connected assets.</p>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 border border-success-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-ink-500">Workspace Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500">Workspace URL</label>
            <input
              type="text"
              disabled
              value="socialflow.app/my-workspace"
              className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-100/60 px-4 py-2.5 text-sm text-ink-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-ink-50 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-800">Current Plan</p>
            <p className="text-xs text-ink-400">Professional Creator — Multi-Platform Scheduling Enabled</p>
          </div>
          <Badge variant="brand">Active Plan</Badge>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={saving}
            leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          >
            {saving ? 'Saving...' : 'Save Workspace'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function IntegrationsSettings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/social-accounts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setAccounts(data);
      })
      .catch((err) => console.error('Error fetching integrations:', err));
  }, []);

  const getStatus = (name: string) => {
    const found = accounts.find(
      (a) => a.platform.toLowerCase().includes(name.toLowerCase())
    );
    return found ? `Connected as ${found.account_name}` : 'Not connected';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between border-b border-ink-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-ink-900">Social Integrations</h3>
          <p className="mt-0.5 text-sm text-ink-400">Manage connected social media platforms.</p>
        </div>
        <Link to="/app/accounts">
          <Button variant="secondary" size="sm" leftIcon={<Link2 className="h-4 w-4" />}>
            Manage Channels
          </Button>
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {['Instagram', 'Facebook', 'LinkedIn', 'X', 'YouTube'].map((name) => {
          const isConnected = accounts.some(
            (a) => a.platform.toLowerCase().includes(name.toLowerCase())
          );
          return (
            <div
              key={name}
              className="flex items-center justify-between rounded-xl border border-ink-100 p-4 transition-colors hover:bg-ink-50/50"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">{name}</p>
                <p className={`text-xs mt-0.5 ${isConnected ? 'text-emerald-600 font-medium' : 'text-ink-400'}`}>
                  {getStatus(name)}
                </p>
              </div>
              <Link to="/app/accounts">
                <Button variant={isConnected ? 'outline' : 'primary'} size="sm">
                  {isConnected ? 'View Account' : 'Connect'}
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function NotificationSettings() {
  const [notifications, setNotifications] = useState({
    scheduled_posts: true,
    engagement_alerts: true,
    campaign_milestones: false,
    weekly_digest: true,
    product_updates: false,
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch(`${API_BASE}/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferences: { notifications },
          }),
        });
      }
      setSuccess('Notification preferences saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Notifications</h3>
      <p className="mt-0.5 text-sm text-ink-400">Choose what you want to receive alerts and digests about.</p>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 border border-success-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-800">Scheduled post published</p>
            <p className="text-xs text-ink-400">Get notified immediately when a scheduled post goes live.</p>
          </div>
          <ToggleSwitch
            checked={notifications.scheduled_posts}
            onChange={(val) => setNotifications((n) => ({ ...n, scheduled_posts: val }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-800">Engagement alerts</p>
            <p className="text-xs text-ink-400">Receive alerts when engagement surges on published content.</p>
          </div>
          <ToggleSwitch
            checked={notifications.engagement_alerts}
            onChange={(val) => setNotifications((n) => ({ ...n, engagement_alerts: val }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-800">Campaign milestones</p>
            <p className="text-xs text-ink-400">Updates when campaign goals and dates are reached.</p>
          </div>
          <ToggleSwitch
            checked={notifications.campaign_milestones}
            onChange={(val) => setNotifications((n) => ({ ...n, campaign_milestones: val }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-800">Weekly performance summary</p>
            <p className="text-xs text-ink-400">Receive an email digest with overall reach and impressions.</p>
          </div>
          <ToggleSwitch
            checked={notifications.weekly_digest}
            onChange={(val) => setNotifications((n) => ({ ...n, weekly_digest: val }))}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={saving}
          leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </Card>
  );
}

function SecuritySettings() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setUpdating(true);
    setSuccess(null);
    setError(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Not authenticated');
      setUpdating(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        setSuccess('Password updated successfully.');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccess(null), 3500);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Security & Password</h3>
      <p className="mt-0.5 text-sm text-ink-400">Keep your account credentials secure.</p>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 border border-success-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-danger-50 p-3 text-xs font-semibold text-danger-700 border border-danger-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-500">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
            className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={updating}
            leftIcon={updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          >
            {updating ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PreferencesSettings() {
  const [compactLayout, setCompactLayout] = useState(false);
  const [autoPublish, setAutoPublish] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    const token = localStorage.getItem('token');
    try {
      if (token) {
        await fetch(`${API_BASE}/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            preferences: { compact_layout: compactLayout, auto_publish: autoPublish },
          }),
        });
      }
      setSuccess('App preferences saved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Application Preferences</h3>
      <p className="mt-0.5 text-sm text-ink-400">Customize display density and default post publishing behavior.</p>

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-success-50 p-3 text-xs font-semibold text-success-700 border border-success-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600" />
          <span>{success}</span>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-800">Compact Layout</p>
            <p className="text-xs text-ink-400">Reduce spacing for higher information density.</p>
          </div>
          <ToggleSwitch checked={compactLayout} onChange={setCompactLayout} />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
          <div>
            <p className="text-sm font-semibold text-ink-800">Auto-Publish On Schedule</p>
            <p className="text-xs text-ink-400">Automatically trigger publisher background worker when post reaches time.</p>
          </div>
          <ToggleSwitch checked={autoPublish} onChange={setAutoPublish} />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={saving}
          leftIcon={saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </Card>
  );
}
