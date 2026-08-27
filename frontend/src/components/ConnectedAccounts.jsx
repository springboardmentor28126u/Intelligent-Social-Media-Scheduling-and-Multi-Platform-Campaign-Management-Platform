import React, { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Plus, X } from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedinIcon, XIcon } from './SocialIcons';

const PLATFORM_CONFIG = {
  Instagram: { icon: InstagramIcon, bg: 'bg-pink-50 text-pink-600 border-pink-100' },
  Facebook: { icon: FacebookIcon, bg: 'bg-blue-50 text-blue-600 border-blue-100' },
  LinkedIn: { icon: LinkedinIcon, bg: 'bg-sky-50 text-sky-600 border-sky-100' },
  'X (Twitter)': { icon: XIcon, bg: 'bg-slate-100 text-slate-800 border-slate-200' },
  YouTube: { icon: XIcon, bg: 'bg-red-50 text-red-600 border-red-100' },
  Pinterest: { icon: XIcon, bg: 'bg-rose-50 text-rose-600 border-rose-100' },
};

const ALL_PLATFORMS = Object.keys(PLATFORM_CONFIG);

const API_BASE = 'http://localhost:8000';

const ConnectedAccounts = () => {
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [platform, setPlatform] = useState('Instagram');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');

  const fetchAccounts = async () => {
    const res = await fetch(`${API_BASE}/social-accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setConnectedAccounts(data);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch(`${API_BASE}/social-accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ platform, account_name: accountName }),
    });
    setAccountName('');
    setShowModal(false);
    setLoading(false);
    fetchAccounts();
  };

  const handleLinkedInConnect = () => {
    window.location.href = `${API_BASE}/auth/linkedin/login?token=${token}`;
  };
  const handleYouTubeConnect = () => {
  window.location.href = `${API_BASE}/auth/youtube/login?token=${token}`;
  };
  const handleDisconnect = async (id) => {
    await fetch(`${API_BASE}/social-accounts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAccounts();
  };

  // Build display list: merge connected accounts with unconnected platform placeholders
  const connectedPlatformNames = connectedAccounts.map((a) => a.platform);
  const displayCards = [
    ...connectedAccounts.map((acc) => ({
      ...acc,
      status: 'Connected',
      config: PLATFORM_CONFIG[acc.platform] || PLATFORM_CONFIG.Instagram,
    })),
    ...ALL_PLATFORMS.filter((p) => !connectedPlatformNames.includes(p)).map((p) => ({
      platform: p,
      status: 'Disconnected',
      config: PLATFORM_CONFIG[p],
    })),
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Connected Accounts
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {connectedAccounts.length} Active
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Channels authorized for automated publishing & live tracking
          </p>
        </div>

        <button
          onClick={fetchAccounts}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync All</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayCards.map((account) => {
          const Icon = account.config.icon;
          return (
            <div
              key={account.id || account.platform}
              className="group bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${account.config.bg} transition-transform group-hover:scale-105 duration-200`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    account.status === 'Connected'
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200/60'
                      : 'text-slate-500 bg-slate-50 border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${account.status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    {account.status}
                  </span>
                </div>

                <div className="space-y-0.5 mb-3">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {account.platform}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium truncate">
                    {account.account_name || 'Not Connected'}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">--</span>

                {account.status === 'Connected' ? (
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>Disconnect</span>
                    <X className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (account.platform === 'LinkedIn') {
                        handleLinkedInConnect();
                      } else if(account.platform === 'YouTube'){
                        handleYouTubeConnect();
                      } else {
                        setPlatform(account.platform);
                        setShowModal(true);
                      }
                        
                      }
                    }
                    className="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-100 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <span>Connect</span>
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Simple Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4">Connect {platform}</h3>
            <form onSubmit={handleConnect} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Account handle / username"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full text-xs text-slate-800 px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 text-xs font-semibold text-slate-600 bg-slate-100 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 text-xs font-semibold text-white bg-indigo-600 py-2 rounded-xl disabled:opacity-60"
                >
                  {loading ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectedAccounts;