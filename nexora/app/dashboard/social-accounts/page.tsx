"use client";

import { useState } from "react";
import {
  Share2,
  CheckCircle2,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Power,
  Trash2,
  X
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface Account {
  id: number;
  platform: string;
  name: string;
  handle: string;
  avatar: string;
  followers: number;
  growth: string;
  isConnected: boolean;
  tokenStatus: "Valid" | "Expiring Soon" | "Needs Reconnection";
  lastSynced: string;
}

export default function SocialAccountsPage() {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [modalPlatform, setModalPlatform] = useState("instagram");
  const [modalHandle, setModalHandle] = useState("");
  const [modalAccountName, setModalAccountName] = useState("");
  const [isSyncing, setIsSyncing] = useState<number | null>(null);

  // Initialized with all available channels in DISCONNECTED / CLEAN state as requested by the user
  const [accounts, setAccounts] = useState<Account[]>([
    {
      id: 1,
      platform: "facebook",
      name: "Facebook Page",
      handle: "Not connected",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      followers: 0,
      growth: "+0%",
      isConnected: false,
      tokenStatus: "Needs Reconnection",
      lastSynced: "Never",
    },
    {
      id: 2,
      platform: "instagram",
      name: "Instagram Professional",
      handle: "Not connected",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      followers: 0,
      growth: "+0%",
      isConnected: false,
      tokenStatus: "Needs Reconnection",
      lastSynced: "Never",
    },
    {
      id: 3,
      platform: "linkedin",
      name: "LinkedIn Company Page",
      handle: "Not connected",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      followers: 0,
      growth: "+0%",
      isConnected: false,
      tokenStatus: "Needs Reconnection",
      lastSynced: "Never",
    },
    {
      id: 4,
      platform: "twitter",
      name: "X (Twitter) Profile",
      handle: "Not connected",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      followers: 0,
      growth: "+0%",
      isConnected: false,
      tokenStatus: "Needs Reconnection",
      lastSynced: "Never",
    },
    {
      id: 5,
      platform: "youtube",
      name: "YouTube Channel",
      handle: "Not connected",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      followers: 0,
      growth: "+0%",
      isConnected: false,
      tokenStatus: "Needs Reconnection",
      lastSynced: "Never",
    },
    {
      id: 6,
      platform: "pinterest",
      name: "Pinterest Business",
      handle: "Not connected",
      avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
      followers: 0,
      growth: "+0%",
      isConnected: false,
      tokenStatus: "Needs Reconnection",
      lastSynced: "Never",
    },
  ]);

  const connectedCount = accounts.filter((a) => a.isConnected).length;

  const handleSync = (id: number) => {
    setIsSyncing(id);
    setTimeout(() => {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, lastSynced: "Just now", tokenStatus: "Valid" } : acc
        )
      );
      setIsSyncing(null);
    }, 800);
  };

  const handleDisconnect = (id: number) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id
          ? {
              ...acc,
              isConnected: false,
              handle: "Not connected",
              followers: 0,
              growth: "+0%",
              lastSynced: "Disconnected",
            }
          : acc
      )
    );
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = modalHandle.trim() || `@${modalPlatform}_creator`;
    const name = modalAccountName.trim() || `${modalPlatform.toUpperCase()} Account`;

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.platform === modalPlatform
          ? {
              ...acc,
              name,
              handle,
              isConnected: true,
              tokenStatus: "Valid",
              followers: Math.floor(Math.random() * 8000) + 1200,
              growth: "+14.2%",
              lastSynced: "Just now",
            }
          : acc
      )
    );

    setShowConnectModal(false);
    setModalHandle("");
    setModalAccountName("");
  };

  const handleDisconnectAll = () => {
    setAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        isConnected: false,
        handle: "Not connected",
        followers: 0,
        growth: "+0%",
        lastSynced: "Disconnected",
      }))
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Share2 className="h-6 w-6 text-[#635BFF]" />
            Social Accounts Hub
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Connect and manage authorized API channels. Currently{" "}
            <strong className="text-slate-900">{connectedCount} of {accounts.length}</strong> accounts connected.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {connectedCount > 0 && (
            <button
              onClick={handleDisconnectAll}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Disconnect All
            </button>
          )}

          <button
            onClick={() => setShowConnectModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#635BFF] px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#635BFF]/25 hover:bg-[#5046E5] transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Connect Account</span>
          </button>
        </div>
      </div>

      {/* Info Notice Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-[#635BFF] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Account Management:</strong> Pre-connected dummy accounts have been removed. Click <span className="font-semibold text-[#635BFF]">"Connect"</span> on any network below to link your own social accounts.
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className={`rounded-3xl border p-6 flex flex-col justify-between transition-all ${
              acc.isConnected
                ? "border-slate-200 bg-white shadow-xs card-hover-effect"
                : "border-dashed border-slate-300 bg-slate-50/60"
            }`}
          >
            <div>
              {/* Card Top */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-2xs text-xl">
                    {acc.platform === "instagram" ? "📸" : acc.platform === "facebook" ? "👥" : acc.platform === "linkedin" ? "💼" : acc.platform === "twitter" ? "𝕏" : acc.platform === "youtube" ? "▶️" : "📌"}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{acc.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{acc.handle}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    acc.isConnected
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                >
                  {acc.isConnected ? "Connected ✓" : "Disconnected"}
                </span>
              </div>

              {/* Stats Bar */}
              {acc.isConnected ? (
                <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50/70 p-3 text-center border border-slate-100">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Followers</span>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">{formatNumber(acc.followers)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">Growth</span>
                    <p className="text-base font-extrabold text-emerald-600 mt-0.5">{acc.growth}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-6 py-4 text-center text-xs text-slate-400">
                  No active connection for {acc.platform.toUpperCase()}.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              {acc.isConnected ? (
                <>
                  <button
                    onClick={() => handleSync(acc.id)}
                    disabled={isSyncing === acc.id}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#635BFF] hover:underline cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing === acc.id ? "animate-spin" : ""}`} />
                    <span>{isSyncing === acc.id ? "Syncing..." : "Sync Now"}</span>
                  </button>

                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setModalPlatform(acc.platform);
                    setShowConnectModal(true);
                  }}
                  className="w-full rounded-xl bg-gradient-to-r from-[#635BFF] to-[#7C3AED] py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
                >
                  + Connect {acc.platform.toUpperCase()}
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* Connect Account Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Connect Social Channel
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Platform</label>
                <select
                  value={modalPlatform}
                  onChange={(e) => setModalPlatform(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none bg-white"
                >
                  <option value="instagram">Instagram Professional / Creator</option>
                  <option value="facebook">Facebook Page</option>
                  <option value="linkedin">LinkedIn Company Profile</option>
                  <option value="twitter">X (Twitter) Handle</option>
                  <option value="youtube">YouTube Channel</option>
                  <option value="pinterest">Pinterest Business</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Account Name (e.g. My Brand Official)</label>
                <input
                  type="text"
                  value={modalAccountName}
                  onChange={(e) => setModalAccountName(e.target.value)}
                  placeholder="My Brand Name"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Handle / Username</label>
                <input
                  type="text"
                  value={modalHandle}
                  onChange={(e) => setModalHandle(e.target.value)}
                  placeholder="@my_brand"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-[#635BFF] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#635BFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5046E5]"
                >
                  Authorize & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
