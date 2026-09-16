"use client";

import { useState } from "react";
import {
  Link2,
  Plus,
  CheckCircle2,
  Trash2,
  UserRound,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

type Platform = {
  name: string;
  description: string;
};

type ConnectedAccount = {
  id: number;
  platform: string;
  username: string;
  connectedAt: string;
};

const platforms: Platform[] = [
  {
    name: "Facebook",
    description: "Connect a Facebook Page or business account.",
  },
  {
    name: "Instagram",
    description: "Connect an Instagram account for content management.",
  },
  {
    name: "LinkedIn",
    description: "Connect a LinkedIn profile or organization.",
  },
  {
    name: "X (Twitter)",
    description: "Connect an X account for publishing and management.",
  },
  {
    name: "YouTube",
    description: "Connect a YouTube channel.",
  },
  {
    name: "Pinterest",
    description: "Connect a Pinterest account.",
  },
];

export default function SocialAccountsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [username, setUsername] = useState("");

  const [connectedAccounts, setConnectedAccounts] = useState<
    ConnectedAccount[]
  >([]);

  const [message, setMessage] = useState("");

  const handleConnectAccount = () => {
    setMessage("");

    if (!selectedPlatform) {
      setMessage("Please select a social media platform.");
      return;
    }

    if (!username.trim()) {
      setMessage("Please enter the account username.");
      return;
    }

    const accountExists = connectedAccounts.some(
      (account) =>
        account.platform === selectedPlatform &&
        account.username.toLowerCase() ===
          username.trim().toLowerCase()
    );

    if (accountExists) {
      setMessage("This social account is already connected.");
      return;
    }

    const newAccount: ConnectedAccount = {
      id: Date.now(),
      platform: selectedPlatform,
      username: username.trim(),
      connectedAt: new Date().toLocaleDateString(),
    };

    setConnectedAccounts((currentAccounts) => [
      ...currentAccounts,
      newAccount,
    ]);

    setMessage(
      `${selectedPlatform} account @${username.trim()} connected successfully.`
    );

    setSelectedPlatform("");
    setUsername("");
  };

  const handleDisconnectAccount = (id: number) => {
    setConnectedAccounts((currentAccounts) =>
      currentAccounts.filter((account) => account.id !== id)
    );

    setMessage("Social account disconnected successfully.");
  };

  return (
    <div className="space-y-6">
      {/* ---------- Page Heading ---------- */}
      <div>
        <div className="flex items-center gap-2">
          <Link2 className="text-indigo-600" size={24} />

          <h1 className="text-2xl font-bold text-gray-900">
            Social Accounts
          </h1>
        </div>

        <p className="mt-1 text-sm text-gray-500">
          Connect and manage the social media accounts used in your workspace.
        </p>
      </div>

      {/* ---------- Summary ---------- */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Connected Accounts
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {connectedAccounts.length}
              </p>
            </div>

            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Link2 size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Available Platforms
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {platforms.length}
              </p>
            </div>

            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Security Information ---------- */}
      <section className="rounded-xl border border-blue-100 bg-blue-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={20}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <h2 className="text-sm font-semibold text-blue-900">
              Secure account connections
            </h2>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              SocialPilot should connect social media accounts through the
              official authorization system provided by each platform. Your
              social media password should never be entered or stored here.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Connect Account ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <Plus size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Connect a Social Account
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select a platform and enter the account username you want to
                manage.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Platform */}
          <div>
            <label
              htmlFor="platform"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Social Media Platform
            </label>

            <select
              id="platform"
              value={selectedPlatform}
              onChange={(event) =>
                setSelectedPlatform(event.target.value)
              }
              className="w-full rounded-lg border border-gray-200 bg-white
                         px-3 py-2.5 text-sm text-gray-700 outline-none
                         transition focus:border-indigo-500
                         focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">
                Select a platform
              </option>

              {platforms.map((platform) => (
                <option
                  key={platform.name}
                  value={platform.name}
                >
                  {platform.name}
                </option>
              ))}
            </select>

            {selectedPlatform && (
              <p className="mt-2 text-xs text-gray-500">
                {
                  platforms.find(
                    (platform) =>
                      platform.name === selectedPlatform
                  )?.description
                }
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Account Username
            </label>

            <div className="relative">
              <UserRound
                size={17}
                className="pointer-events-none absolute left-3 top-1/2
                           -translate-y-1/2 text-gray-400"
              />

              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter the account username"
                className="w-full rounded-lg border border-gray-200
                           py-2.5 pl-10 pr-3 text-sm text-gray-700
                           outline-none transition
                           placeholder:text-gray-400
                           focus:border-indigo-500
                           focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <p className="mt-2 text-xs text-gray-500">
              For example: @yourbrand or your account username.
            </p>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
                message.includes("successfully")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {message.includes("successfully") ? (
                <CheckCircle2 size={17} />
              ) : (
                <AlertCircle size={17} />
              )}

              {message}
            </div>
          )}

          {/* Connect */}
          <div className="flex justify-end border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={handleConnectAccount}
              className="flex items-center gap-2 rounded-lg bg-indigo-600
                         px-4 py-2.5 text-sm font-medium text-white
                         transition hover:bg-indigo-700"
            >
              <Link2 size={17} />
              Connect Account
            </button>
          </div>
        </div>
      </section>

      {/* ---------- Connected Accounts ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-semibold text-gray-900">
            Connected Accounts
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Accounts currently available for publishing and management.
          </p>
        </div>

        {connectedAccounts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Link2
              size={36}
              className="mx-auto text-gray-300"
            />

            <p className="mt-4 text-sm font-medium text-gray-700">
              No social accounts connected yet
            </p>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
              Connect a social media account above to begin managing content
              across your platforms.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {connectedAccounts.map((account) => (
              <div
                key={account.id}
                className="flex flex-col gap-4 px-6 py-5 sm:flex-row
                           sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center
                                  justify-center rounded-full bg-indigo-50
                                  text-indigo-600">
                    <UserRound size={20} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {account.platform}
                      </p>

                      <span className="rounded-full bg-green-50 px-2.5 py-1
                                       text-xs font-medium text-green-700">
                        Connected
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      @{account.username}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Connected on {account.connectedAt}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDisconnectAccount(account.id)
                  }
                  className="flex items-center justify-center gap-2
                             rounded-lg border border-red-100 px-3 py-2
                             text-sm font-medium text-red-600 transition
                             hover:bg-red-50"
                >
                  <Trash2 size={16} />
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- Available Platforms ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <h2 className="font-semibold text-gray-900">
            Available Platforms
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Platforms planned for integration with SocialPilot.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => {
            const isConnected = connectedAccounts.some(
              (account) =>
                account.platform === platform.name
            );

            return (
              <div
                key={platform.name}
                className="rounded-lg border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {platform.name}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      {platform.description}
                    </p>
                  </div>

                  {isConnected ? (
                    <CheckCircle2
                      size={19}
                      className="shrink-0 text-green-600"
                    />
                  ) : (
                    <ExternalLink
                      size={18}
                      className="shrink-0 text-gray-400"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}