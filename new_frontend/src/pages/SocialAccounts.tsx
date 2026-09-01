import { useState, useEffect } from 'react';
import { Link2, CheckCircle2, Plus, RefreshCw, X, Loader2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { platforms, type PlatformKey } from '@/components/common/PlatformIcons';

const API_BASE = 'http://localhost:8000';

interface SocialAccountData {
  id: number;
  platform: string;
  account_name: string;
  status: string;
}

function backendPlatformToKey(backendPlatform: string): PlatformKey {
  const normalized = backendPlatform.toLowerCase();
  if (normalized.includes('linkedin')) return 'linkedin';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('instagram')) return 'instagram';
  if (normalized.includes('facebook')) return 'facebook';
  if (normalized === 'x' || normalized.includes('twitter')) return 'x';
  return normalized as PlatformKey;
}

function keyToBackendPlatform(key: PlatformKey): string {
  if (key === 'linkedin') return 'LinkedIn';
  if (key === 'youtube') return 'YouTube';
  if (key === 'instagram') return 'Instagram';
  if (key === 'facebook') return 'Facebook';
  if (key === 'x') return 'X (Twitter)';
  return key;
}

export default function SocialAccounts() {
  const [accounts, setAccounts] = useState<SocialAccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<PlatformKey | null>(null);
  const [accountNameInput, setAccountNameInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<number | null>(null);

  const token = localStorage.getItem('token');

  const fetchAccounts = async (showSyncSpinner = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (showSyncSpinner) setSyncing(true);
    try {
      const response = await fetch(`${API_BASE}/social-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Check if redirect query parameters exist from OAuth redirect callback (e.g. ?linkedin=connected or ?youtube=connected)
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin') === 'connected' || params.get('youtube') === 'connected') {
      // Clear query params from the browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchAccounts();
    }
  }, []);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPlatform || !token) return;
    setConnecting(true);

    try {
      const backendPlatform = keyToBackendPlatform(modalPlatform);
      const response = await fetch(`${API_BASE}/social-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: backendPlatform,
          account_name: accountNameInput,
        }),
      });

      if (response.ok) {
        setAccountNameInput('');
        setModalPlatform(null);
        await fetchAccounts();
      }
    } catch (error) {
      console.error('Error connecting account:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectClick = (platformKey: PlatformKey) => {
    if (!token) return;
    if (platformKey === 'linkedin' || platformKey === 'youtube') {
      if (platformKey === 'linkedin') {
        window.location.href = `${API_BASE}/auth/linkedin/login?token=${token}`;
      } else {
        window.location.href = `${API_BASE}/auth/youtube/login?token=${token}`;
      }
    } else {
      setModalPlatform(platformKey);
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!token) return;
    setDisconnectingId(id);
    try {
      const response = await fetch(`${API_BASE}/social-accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        await fetchAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
    } finally {
      setDisconnectingId(null);
    }
  };

  const getConnectedAccount = (platformKey: PlatformKey) => {
    return accounts.find((acc) => backendPlatformToKey(acc.platform) === platformKey);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-ink-400">Loading channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Social Accounts"
        description="Connect and manage your social media platforms."
      />

      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-soft">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ink-50 text-ink-400">
          <Link2 className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">Connected Accounts</p>
          <p className="text-xs text-ink-400">{accounts.length} of {platforms.length} platforms connected</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAccounts(true)}
            disabled={syncing}
            leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />}
          >
            Sync All
          </Button>
          <Badge variant={accounts.length > 0 ? 'brand' : 'neutral'}>
            {accounts.length} active
          </Badge>
        </div>
      </div>

      {/* Platform cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {platforms.map((p) => {
          const connectedAcc = getConnectedAccount(p.key);
          const isConnected = !!connectedAcc;

          return (
            <Card key={p.key} hover className="p-6">
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${p.bg} ${p.color}`}
                >
                  <p.Icon className="h-7 w-7" />
                </div>
                <Badge variant={isConnected ? 'brand' : 'neutral'}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </Badge>
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{p.name}</h3>
              <p className="mt-1 text-sm text-ink-400 truncate">
                {isConnected ? (connectedAcc.account_name || 'Connected') : 'Connect to start publishing and tracking.'}
              </p>
              <div className="mt-5">
                {isConnected ? (
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => handleDisconnect(connectedAcc.id)}
                    disabled={disconnectingId === connectedAcc.id}
                    leftIcon={
                      disconnectingId === connectedAcc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-danger-600" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-danger-600" />
                      )
                    }
                    className="text-danger-600 border-danger-100 hover:bg-danger-50"
                  >
                    {disconnectingId === connectedAcc.id ? 'Disconnecting...' : 'Disconnect Account'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    onClick={() => handleConnectClick(p.key)}
                    leftIcon={<Link2 className="h-3.5 w-3.5" />}
                  >
                    Connect Account
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Empty state banner */}
      {accounts.length === 0 && (
        <Card className="border-dashed">
          <EmptyState
            icon={<CheckCircle2 className="h-7 w-7" />}
            title="No social accounts connected yet."
            description="Connect your first account to start scheduling posts and viewing analytics across all your platforms."
            action={
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleConnectClick('instagram')}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Connect your first account
              </Button>
            }
          />
        </Card>
      )}

      {/* Connect Modal */}
      {modalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-ink-100">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-ink-900">
                Connect {platforms.find(x => x.key === modalPlatform)?.name}
              </h3>
              <button
                onClick={() => setModalPlatform(null)}
                className="text-ink-400 hover:text-ink-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-ink-500">Account Username / Handle</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. @username"
                  value={accountNameInput}
                  onChange={(e) => setAccountNameInput(e.target.value)}
                  className="w-full mt-1.5 rounded-xl border border-ink-100 bg-ink-50/30 px-3.5 py-2.5 text-sm text-ink-800 focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setModalPlatform(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={connecting}
                >
                  {connecting ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

