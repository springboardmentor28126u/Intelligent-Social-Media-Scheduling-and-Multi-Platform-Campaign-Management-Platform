import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Plus,
  Share2,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  FaInstagram,
  FaFacebook,
  FaLinkedin,
  FaTwitter,
  FaYoutube,
  FaPinterest,
} from "react-icons/fa";

export default function AccountsPage() {
  const { showToast } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.accounts.list();
      setAccounts(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSyncAccount = async (id: number) => {
    try {
      await api.accounts.sync(id);
      showToast("Channel Synced 🔄", "Metrics and follower counts updated.", "success");
      loadAccounts();
    } catch (err: any) {
      showToast("Sync Error", err.message, "error");
    }
  };

  const handleDisconnect = async (id: number) => {
    if (!confirm("Are you sure you want to disconnect this social channel?")) return;
    try {
      await api.accounts.disconnect(id);
      showToast("Disconnected", "Channel disconnected from workspace.", "info");
      loadAccounts();
    } catch (err: any) {
      showToast("Error", err.message, "error");
    }
  };

  const handleConnectChannel = async (platform: string) => {
    try {
      await api.accounts.connect({
        platform,
        account_name: `${platform.toUpperCase()} Acme Brand`,
        account_id: `${platform}_page_${Math.floor(Math.random() * 89999 + 10000)}`,
        avatar_url: null,
      });
      showToast("Channel Connected! 🎉", `${platform.toUpperCase()} connected successfully.`, "success");
      setIsConnectModalOpen(false);
      loadAccounts();
    } catch (err: any) {
      showToast("Connect Error", err.message, "error");
    }
  };

  const getPlatformIcon = (plat: string) => {
    switch (plat?.toLowerCase()) {
      case "instagram":
        return <FaInstagram size={24} className="text-pink-600" />;
      case "facebook":
        return <FaFacebook size={24} className="text-blue-600" />;
      case "linkedin":
        return <FaLinkedin size={24} className="text-sky-600" />;
      case "twitter":
        return <FaTwitter size={24} className="text-slate-900" />;
      case "youtube":
        return <FaYoutube size={24} className="text-red-600" />;
      case "pinterest":
        return <FaPinterest size={24} className="text-rose-600" />;
      default:
        return <Share2 size={24} className="text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            Connected Social Channels
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authorized OAuth social accounts, verify publish permissions, and sync live follower counts.
          </p>
        </div>

        <button
          onClick={() => setIsConnectModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md shadow-blue-600/25 transition cursor-pointer self-start sm:self-auto"
        >
          <Plus size={18} />
          <span>Connect Channel</span>
        </button>
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm animate-pulse">
          Loading social accounts...
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl p-8 space-y-3 shadow-xs">
          <Share2 className="mx-auto text-slate-300" size={36} />
          <h3 className="text-base font-bold text-slate-800">No social channels connected</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Authorize your first Facebook, Instagram, LinkedIn, or X channel to begin multi-platform publishing.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                      {getPlatformIcon(acc.platform)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {acc.account_name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">
                        {acc.platform}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <p className="text-xs text-slate-500">Followers</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      {acc.followers_count ? acc.followers_count.toLocaleString() : "24,800"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Posts Published</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">
                      {acc.posts_count || 32}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleSyncAccount(acc.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Sync Metrics</span>
                </button>

                <button
                  onClick={() => handleDisconnect(acc.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="Disconnect Channel"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect Channel Modal */}
      {isConnectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Share2 size={20} className="text-blue-600" />
                Authorize Social Channel
              </h3>
              <button
                onClick={() => setIsConnectModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600">
              Select a social network to connect your brand profile or business page:
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { name: "Instagram", id: "instagram", icon: <FaInstagram size={20} className="text-pink-600" /> },
                { name: "Facebook", id: "facebook", icon: <FaFacebook size={20} className="text-blue-600" /> },
                { name: "LinkedIn", id: "linkedin", icon: <FaLinkedin size={20} className="text-sky-600" /> },
                { name: "X / Twitter", id: "twitter", icon: <FaTwitter size={20} className="text-slate-900" /> },
                { name: "YouTube", id: "youtube", icon: <FaYoutube size={20} className="text-red-600" /> },
                { name: "Pinterest", id: "pinterest", icon: <FaPinterest size={20} className="text-rose-600" /> },
              ].map((plat) => (
                <button
                  key={plat.id}
                  onClick={() => handleConnectChannel(plat.id)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition text-left cursor-pointer"
                >
                  {plat.icon}
                  <span className="text-xs sm:text-sm font-bold text-slate-800">{plat.name}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsConnectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
