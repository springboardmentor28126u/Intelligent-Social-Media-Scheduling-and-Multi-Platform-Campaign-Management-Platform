import { useState } from 'react';
import { Shield } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';

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

export default function AdminSettings() {
  const { profile } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader title="Admin Settings" description="Manage your admin account and platform settings." />

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink-900">Admin Profile</h3>
        <p className="mt-0.5 text-sm text-ink-400">Your admin account information.</p>

        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">{profile?.full_name || 'Admin'}</p>
            <p className="text-xs text-ink-400">{profile?.email || 'No email'}</p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
              Administrator
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink-900">Platform Settings</h3>
        <p className="mt-0.5 text-sm text-ink-400">Configure platform-wide settings.</p>
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4">
            <div>
              <p className="text-sm font-medium text-ink-800">Allow new signups</p>
              <p className="text-xs text-ink-400">Let new users create accounts</p>
            </div>
            <Toggle defaultOn />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-ink-50 p-4">
            <div>
              <p className="text-sm font-medium text-ink-800">Require admin approval</p>
              <p className="text-xs text-ink-400">New accounts need admin approval before access</p>
            </div>
            <Toggle />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button variant="primary" size="md">Save Settings</Button>
        </div>
      </Card>
    </div>
  );
}
