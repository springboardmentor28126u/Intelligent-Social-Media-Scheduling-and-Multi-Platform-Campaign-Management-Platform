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
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';

const tabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'workspace', label: 'Workspace', icon: Briefcase },
  { key: 'integrations', label: 'Social Integrations', icon: Link2 },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
];

export default function Settings() {
  const [active, setActive] = useState('profile');

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader title="Settings" description="Manage your account and preferences." />

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
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Profile</h3>
      <p className="mt-0.5 text-sm text-ink-400">Update your personal information.</p>

      {/* Avatar */}
      <div className="mt-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
          <User className="h-8 w-8" />
        </div>
        <Button variant="outline" size="sm" leftIcon={<Camera className="h-3.5 w-3.5" />}>
          Upload photo
        </Button>
      </div>

      {/* Form fields */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Full name" placeholder="Enter your name" />
        <Field label="Email" placeholder="Enter your email" type="email" />
        <Field label="Role" placeholder="e.g. Social Media Manager" />
        <Field label="Time zone" placeholder="Select time zone" />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" size="md">Cancel</Button>
        <Button variant="primary" size="md" leftIcon={<Check className="h-4 w-4" />}>
          Save Changes
        </Button>
      </div>
    </Card>
  );
}

function WorkspaceSettings() {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Workspace</h3>
      <p className="mt-0.5 text-sm text-ink-400">Manage your workspace settings.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Workspace name" placeholder="My Workspace" />
        <Field label="Workspace URL" placeholder="socialflow.app/my-workspace" />
      </div>
      <div className="mt-6 rounded-xl bg-ink-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-800">Current plan</p>
            <p className="text-xs text-ink-400">Free plan — 1 social account</p>
          </div>
          <Button variant="secondary" size="sm">Upgrade</Button>
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" size="md">Save Changes</Button>
      </div>
    </Card>
  );
}

function IntegrationsSettings() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8000/social-accounts', {
      headers: {
        'Authorization': `Bearer ${token}`,
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
          <p className="mt-0.5 text-sm text-ink-400">Manage connected social media accounts.</p>
        </div>
        <Link to="/app/accounts">
          <Button variant="secondary" size="sm" leftIcon={<Link2 className="h-4 w-4" />}>
            Manage Channels
          </Button>
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {['Instagram', 'Facebook', 'LinkedIn', 'X', 'YouTube', 'TikTok'].map((name) => {
          const isConnected = accounts.some(
            (a) => a.platform.toLowerCase().includes(name.toLowerCase())
          );
          return (
            <div
              key={name}
              className="flex items-center justify-between rounded-xl border border-ink-100 p-4"
            >
              <div>
                <p className="text-sm font-medium text-ink-900">{name}</p>
                <p className={`text-xs ${isConnected ? 'text-brand-600 font-medium' : 'text-ink-400'}`}>
                  {getStatus(name)}
                </p>
              </div>
              <Link to="/app/accounts">
                <Button variant="outline" size="sm">
                  {isConnected ? 'View' : 'Connect'}
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
  const items = [
    { label: 'Scheduled post published', desc: 'Get notified when a scheduled post goes live' },
    { label: 'Engagement alerts', desc: 'Receive alerts for likes, comments, and shares' },
    { label: 'Campaign milestones', desc: 'Updates on campaign progress and completion' },
    { label: 'Weekly summary', desc: 'A weekly digest of your performance' },
    { label: 'Product updates', desc: 'News about SocialFlow features and improvements' },
  ];
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Notifications</h3>
      <p className="mt-0.5 text-sm text-ink-400">Choose what you want to be notified about.</p>
      <div className="mt-6 space-y-1">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-ink-800">{item.label}</p>
              <p className="text-xs text-ink-400">{item.desc}</p>
            </div>
            <Toggle defaultOn={i < 2} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Security</h3>
      <p className="mt-0.5 text-sm text-ink-400">Keep your account secure.</p>
      <div className="mt-6 space-y-4">
        <Field label="Current password" placeholder="Enter current password" type="password" />
        <Field label="New password" placeholder="Enter new password" type="password" />
        <Field label="Confirm password" placeholder="Confirm new password" type="password" />
        <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4">
          <div>
            <p className="text-sm font-medium text-ink-800">Two-factor authentication</p>
            <p className="text-xs text-ink-400">Add an extra layer of security</p>
          </div>
          <Toggle />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button variant="primary" size="md">Update Password</Button>
      </div>
    </Card>
  );
}

function PreferencesSettings() {
  const prefs = [
    { label: 'Dark mode', desc: 'Use a dark theme throughout the app' },
    { label: 'Compact layout', desc: 'Reduce spacing for a denser interface' },
    { label: 'Auto-publish', desc: 'Automatically publish posts at scheduled time' },
    { label: 'Email digest', desc: 'Receive a summary of activity via email' },
  ];
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-ink-900">Preferences</h3>
      <p className="mt-0.5 text-sm text-ink-400">Customize your experience.</p>
      <div className="mt-6 space-y-1">
        {prefs.map((p) => (
          <div key={p.label} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-ink-800">{p.label}</p>
              <p className="text-xs text-ink-400">{p.desc}</p>
            </div>
            <Toggle />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Field label="Default language" placeholder="English" />
      </div>
    </Card>
  );
}

function Field({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-500">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-ink-100 bg-ink-50/30 px-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
      />
    </div>
  );
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
        on ? 'bg-brand-600' : 'bg-ink-200'
      }`}
      role="switch"
      aria-checked={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          on ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
