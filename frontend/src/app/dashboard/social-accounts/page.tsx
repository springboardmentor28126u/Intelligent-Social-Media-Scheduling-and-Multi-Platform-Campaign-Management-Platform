"use client";

import {
  Link2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useSocialConnections } from "@/hooks/useSocialConnections";

import { useState } from "react";

// "id" matches the platform value stored by the backend (lowercase)
const platforms = [
  { id: "linkedin", name: "LinkedIn", description: "Publish posts to your LinkedIn profile.", live: true },
  { id: "facebook", name: "Facebook", description: "Connect a Facebook Page.", live: false },
  { id: "instagram", name: "Instagram", description: "Connect an Instagram account.", live: false },
  { id: "x", name: "X (Twitter)", description: "Connect an X account.", live: false },
  { id: "youtube", name: "YouTube", description: "Connect a YouTube channel.", live: false },
  { id: "pinterest", name: "Pinterest", description: "Connect a Pinterest account.", live: false },
];

export default function SocialAccountsPage() {
  const { connections, isLoading, error, refetch, startLinkedIn } =
    useSocialConnections();
      // Platforms "connected" locally (no real OAuth yet)
  const [mockConnected, setMockConnected] = useState<string[]>([]);

  // Click once = connected, click again = disconnected
  const toggleMock = (id: string) =>
    setMockConnected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Token considered expired if expires_at is in the past
  const isExpired = (expiresAt: string | null) =>
    !!expiresAt && new Date(expiresAt).getTime() < Date.now();

    const activeCount =
    connections.filter((c) => !isExpired(c.expires_at)).length +
    mockConnected.length;

  return (
    <div className="space-y-6">
      {/* ---------- Heading ---------- */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="text-indigo-600" size={24} />
            <h1 className="text-2xl font-bold text-gray-900">Social Accounts</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Connect and manage the social media accounts used in your workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={refetch}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-200
                     px-3 py-2 text-sm font-medium text-gray-700 transition
                     hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ---------- Summary ---------- */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Connected Accounts</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Available Platforms</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{platforms.length}</p>
        </div>
      </section>

      {/* ---------- Security note ---------- */}
      <section className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <h2 className="text-sm font-semibold text-blue-900">
              Secure account connections
            </h2>
            <p className="mt-1 text-sm leading-6 text-blue-700">
              Accounts are connected through each platform&apos;s official
              authorization page. Your social media password is never entered or
              stored here.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Error ---------- */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {/* ---------- Platforms ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-semibold text-gray-900">Platforms</h2>
          <p className="mt-1 text-sm text-gray-500">
            After approving on LinkedIn, return to this tab; the status updates
            automatically.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {platforms.map((p) => {
            const conn = connections.find((c) => c.platform === p.id);
            const expired = conn ? isExpired(conn.expires_at) : false;
            const mockOn = mockConnected.includes(p.id);

            return (
              <div
                key={p.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row
                           sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center
                                  rounded-full bg-indigo-50 text-indigo-600">
                    <UserRound size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{p.name}</p>

                      {conn && !expired && (
                        <span className="flex items-center gap-1 rounded-full bg-green-50
                                         px-2.5 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 size={12} /> Connected
                        </span>
                      )}
                      {conn && expired && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs
                                         font-medium text-amber-700">
                          Expired
                        </span>
                      )}
                      {!p.live && mockOn && (
                        <span className="flex items-center gap-1 rounded-full bg-green-50
                                         px-2.5 py-1 text-xs font-medium text-green-700">
                          <CheckCircle2 size={12} /> Connected
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {conn?.display_name
                        ? conn.display_name
                        : p.description}
                    </p>

                    {conn?.expires_at && (
                      <p className="mt-1 text-xs text-gray-400">
                        {expired ? "Expired" : "Valid until"}{" "}
                        {new Date(conn.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {p.live ? (
                  // LinkedIn: real OAuth
                  <button
                    type="button"
                    onClick={startLinkedIn}
                    className="flex items-center justify-center gap-2 rounded-lg
                               bg-indigo-600 px-4 py-2.5 text-sm font-medium
                               text-white transition hover:bg-indigo-700"
                  >
                    <Link2 size={16} />
                    {conn ? "Reconnect" : "Connect"}
                  </button>
                  ) : (
                  // Other platforms: local toggle
                  <button
                    type="button"
                    onClick={() => toggleMock(p.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg
                                px-4 py-2.5 text-sm font-medium transition ${
                                  mockOn
                                    ? "border border-red-100 text-red-600 hover:bg-red-50"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                                }`}
                  >
                    <Link2 size={16} />
                    {mockOn ? "Disconnect" : "Connect"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}