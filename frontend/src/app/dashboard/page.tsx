"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getMe,
  getSocialAccounts,
  connectSocialAccount,
  getLinkedInAuthorizeUrl,
} from "@/lib/api";


/* =========================================================
   TYPES
========================================================= */

interface User {
  id?: number;
  user_id?: number;
  name: string;
  email: string;
  role: string;
}

interface SocialAccount {
  id: number;
  platform: string;
  username?: string;
  account_name?: string;
  is_connected?: boolean;
}


/* =========================================================
   PLATFORM DATA
========================================================= */

const PLATFORM_DATA: Record<
  string,
  {
    icon: string;
    label: string;
  }
> = {
  linkedin: {
    icon: "in",
    label: "LinkedIn",
  },
  instagram: {
    icon: "◎",
    label: "Instagram",
  },
  facebook: {
    icon: "f",
    label: "Facebook",
  },
  twitter: {
    icon: "𝕏",
    label: "X",
  },
  youtube: {
    icon: "▶",
    label: "YouTube",
  },
  pinterest: {
    icon: "P",
    label: "Pinterest",
  },
};


/* =========================================================
   DASHBOARD
========================================================= */

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  const [socialAccounts, setSocialAccounts] = useState<
    SocialAccount[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [connecting, setConnecting] = useState(false);

  const [linkedinLoading, setLinkedinLoading] =
    useState(false);

  const [selectedPlatform, setSelectedPlatform] =
    useState("LinkedIn");

  const [accountName, setAccountName] = useState("");

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");


  /* =========================================================
     LOAD DASHBOARD DATA
  ========================================================= */

  const loadDashboard = useCallback(async () => {
    try {
      setError("");

      const [userData, accountsData] =
        await Promise.all([
          getMe(),
          getSocialAccounts(),
        ]);

      setUser(userData);
      setSocialAccounts(accountsData);
    } catch (err: unknown) {
      console.error(
        "Dashboard loading error:",
        err
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unable to load SocialPilot";

      setError(errorMessage);

      if (
        err instanceof Error &&
        err.message
          .toLowerCase()
          .includes("invalid or expired")
      ) {
        localStorage.removeItem(
          "access_token"
        );

        localStorage.removeItem("user_id");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_role");

        router.push("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);


  /* =========================================================
     INITIALIZE DASHBOARD
  ========================================================= */

  useEffect(() => {
    const token =
      localStorage.getItem("access_token");

    if (!token) {
      router.push("/login");
      return;
    }

    /*
      Defer the API call so React's
      set-state-in-effect rule is satisfied.
    */
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router, loadDashboard]);


  /* =========================================================
     REFRESH SOCIAL ACCOUNTS
  ========================================================= */

  async function refreshSocialAccounts() {
    try {
      const accountsData =
        await getSocialAccounts();

      setSocialAccounts(accountsData);
    } catch (err) {
      console.error(
        "Failed to refresh accounts:",
        err
      );
    }
  }


  /* =========================================================
     CONNECT PLATFORM
  ========================================================= */

  async function handleConnect() {
    setMessage("");
    setError("");

    /* -------------------------------------------------------
       LINKEDIN = REAL OAUTH
    ------------------------------------------------------- */

    if (
      selectedPlatform.toLowerCase() ===
      "linkedin"
    ) {
      try {
        setLinkedinLoading(true);

        const authorizationUrl =
          await getLinkedInAuthorizeUrl();

        /*
          LinkedIn is an external website,
          so direct browser navigation is intentional.
        */
        window.location.href =
          authorizationUrl;

        return;
      } catch (err: unknown) {
        console.error(
          "LinkedIn OAuth error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to start LinkedIn authorization"
        );

        setLinkedinLoading(false);

        return;
      }
    }


    /* -------------------------------------------------------
       OTHER PLATFORMS = EXISTING MANUAL CONNECTION
    ------------------------------------------------------- */

    if (!accountName.trim()) {
      setMessage(
        "Please enter an account name."
      );

      return;
    }

    try {
      setConnecting(true);

      await connectSocialAccount(
        selectedPlatform.toLowerCase(),
        accountName.trim()
      );

      setMessage(
        `${selectedPlatform} connected successfully.`
      );

      setAccountName("");

      await refreshSocialAccounts();
    } catch (err: unknown) {
      console.error(
        "Platform connection error:",
        err
      );

      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to connect platform."
      );
    } finally {
      setConnecting(false);
    }
  }


  /* =========================================================
     LOGOUT
  ========================================================= */

  function handleLogout() {
    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_role");

    router.push("/login");
  }


  /* =========================================================
     LINKEDIN OAUTH RESULT
  ========================================================= */

  function getLinkedInStatus() {
    if (
      typeof window === "undefined"
    ) {
      return null;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    return params.get("linkedin");
  }

  const linkedinStatus =
    getLinkedInStatus();


  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7fbff] flex items-center justify-center">

        <div className="text-center">

          <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-400 rounded-full animate-spin mx-auto mb-4" />

          <p className="text-base text-slate-500">
            Loading dashboard...
          </p>

        </div>

      </main>
    );
  }


  /* =========================================================
     DASHBOARD
  ========================================================= */

  return (
    <main className="min-h-screen bg-[#f7fbff] text-slate-800">

      <div className="flex min-h-screen">


        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="w-72 bg-white border-r border-sky-100 flex flex-col shadow-sm">


          {/* -------------------------------------------------
             LOGO
          ------------------------------------------------- */}

          <div className="px-6 py-7 border-b border-sky-50">

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="text-2xl font-bold text-sky-500 tracking-tight"
            >
              SocialPilot
            </button>

            <p className="text-sm text-slate-400 mt-1">
              Social Media Command Center
            </p>

          </div>


          {/* -------------------------------------------------
             NAVIGATION
          ------------------------------------------------- */}

          <nav className="flex-1 p-4">

            <p className="px-3 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Workspace
            </p>


            {/* COMMAND CENTER */}

            <button
              type="button"
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-semibold bg-sky-50 text-sky-600 mb-1"
            >
              <span className="text-xl">
                ⌂
              </span>

              Command Center
            </button>


            {/* CREATE */}

            <button
              type="button"
              onClick={() =>
                router.push("/create-post")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition mb-1"
            >
              <span className="text-xl">
                ＋
              </span>

              Create
            </button>


            {/* CONTENT LAB */}

            <button
              type="button"
              onClick={() =>
                router.push("/content-lab")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition mb-1"
            >
              <span className="text-xl">
                ✦
              </span>

              Content Lab
            </button>


            {/* INSIGHTS */}

            <button
              type="button"
              onClick={() =>
                router.push("/insights")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition mb-1"
            >
              <span className="text-xl">
                ◔
              </span>

              Insights
            </button>


            {/* AUDIENCE */}

            <button
              type="button"
              onClick={() =>
                router.push("/audience")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition mb-1"
            >
              <span className="text-xl">
                ◎
              </span>

              Audience
            </button>


            {/* PUBLISHING CALENDAR */}

            <button
              type="button"
              onClick={() =>
                router.push("/calender")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition mb-1"
            >
              <span className="text-xl">
                ▣
              </span>

              Publishing Calendar
            </button>


            {/* DIVIDER */}

            <div className="my-6 border-t border-sky-50" />


            {/* ACCOUNT */}

            <p className="px-3 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              Account
            </p>


            {/* SETTINGS */}

            <button
              type="button"
              onClick={() =>
                router.push("/settings")
              }
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-slate-600 hover:bg-sky-50 hover:text-sky-600 transition"
            >
              <span className="text-xl">
                ⚙
              </span>

              Settings
            </button>

          </nav>


          {/* -------------------------------------------------
             USER
          ------------------------------------------------- */}

          <div className="border-t border-sky-50 p-5">

            <div className="flex items-center gap-3 px-2 mb-4">

              <div className="w-11 h-11 rounded-full bg-sky-400 text-white flex items-center justify-center text-base font-bold">
                {user?.name
                  ? user.name
                      .charAt(0)
                      .toUpperCase()
                  : "U"}
              </div>

              <div className="min-w-0">

                <p className="text-sm font-bold text-slate-800 truncate">
                  {user?.name || "User"}
                </p>

                <p className="text-xs text-slate-400 truncate">
                  {user?.email || ""}
                </p>

              </div>

            </div>


            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-xl px-4 py-3 text-left text-base font-medium text-red-500 hover:bg-red-50 transition"
            >
              Sign out
            </button>

          </div>

        </aside>


        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <section className="flex-1 min-w-0">


          {/* =================================================
              HEADER
          ================================================= */}

          <header className="bg-white border-b border-sky-100 px-8 py-7">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm uppercase tracking-wider text-sky-500 font-bold">
                  Command Center
                </p>

                <h1 className="text-3xl font-bold text-slate-900 mt-1">
                  Welcome back
                  {user?.name
                    ? `, ${user.name}`
                    : ""}
                </h1>

                <p className="text-base text-slate-500 mt-2">
                  Manage your social media
                  content and campaigns.
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  router.push("/create-post")
                }
                className="px-6 py-3 rounded-xl bg-sky-400 text-white text-sm font-bold hover:bg-sky-500 shadow-sm transition"
              >
                + Create Post
              </button>

            </div>

          </header>


          {/* =================================================
              PAGE CONTENT
          ================================================= */}

          <div className="p-8">


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3">

                <p className="text-sm text-red-600 font-medium">
                  {error}
                </p>

              </div>
            )}


            {/* =================================================
                LINKEDIN SUCCESS
            ================================================= */}

            {linkedinStatus === "connected" && (
              <div className="mb-6 rounded-xl bg-green-50 border border-green-100 px-4 py-3">

                <p className="text-sm text-green-600 font-medium">
                  LinkedIn connected successfully.
                </p>

              </div>
            )}


            {/* =================================================
                LINKEDIN DENIED
            ================================================= */}

            {linkedinStatus === "denied" && (
              <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-3">

                <p className="text-sm text-yellow-700 font-medium">
                  LinkedIn authorization was cancelled.
                </p>

              </div>
            )}


            {/* =================================================
                LINKEDIN ERROR
            ================================================= */}

            {linkedinStatus === "error" && (
              <div className="mb-6 rounded-xl bg-red-50 border border-red-100 px-4 py-3">

                <p className="text-sm text-red-600 font-medium">
                  LinkedIn connection failed. Please try again.
                </p>

              </div>
            )}


            {/* =================================================
                METRICS
            ================================================= */}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">


              {/* TOTAL POSTS */}

              <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center text-xl">
                  ◫
                </div>

                <p className="text-sm font-semibold text-slate-500 mt-4">
                  Total Posts
                </p>

                <p className="text-3xl font-bold text-slate-900 mt-2">
                  0
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Content created
                </p>

              </div>


              {/* SCHEDULED */}

              <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center text-xl">
                  ▣
                </div>

                <p className="text-sm font-semibold text-slate-500 mt-4">
                  Scheduled
                </p>

                <p className="text-3xl font-bold text-slate-900 mt-2">
                  0
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Upcoming posts
                </p>

              </div>


              {/* CONNECTED PLATFORMS */}

              <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center text-xl">
                  ◎
                </div>

                <p className="text-sm font-semibold text-slate-500 mt-4">
                  Connected Platforms
                </p>

                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {socialAccounts.length}
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Social accounts
                </p>

              </div>


              {/* ENGAGEMENT */}

              <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center text-xl">
                  ↗
                </div>

                <p className="text-sm font-semibold text-slate-500 mt-4">
                  Engagement
                </p>

                <p className="text-3xl font-bold text-slate-900 mt-2">
                  0%
                </p>

                <p className="text-sm text-slate-400 mt-1">
                  Overall engagement
                </p>

              </div>

            </div>


            {/* =================================================
                PERFORMANCE + AI INSIGHT
            ================================================= */}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">


              {/* PERFORMANCE */}

              <div className="xl:col-span-2 bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

                <div className="flex items-center justify-between mb-6">

                  <div>

                    <h2 className="text-xl font-bold text-slate-900">
                      Performance Overview
                    </h2>

                    <p className="text-sm text-slate-500 mt-1">
                      Track your social media
                      performance.
                    </p>

                  </div>

                  <span className="text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-500 font-semibold">
                    Coming Soon
                  </span>

                </div>


                <div className="h-64 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">

                  <div className="text-center">

                    <div className="w-14 h-14 rounded-full bg-white text-sky-400 flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm">
                      ◔
                    </div>

                    <p className="text-base font-semibold text-slate-700">
                      Analytics will appear here
                    </p>

                    <p className="text-sm text-slate-400 mt-1">
                      Connect your social platforms
                      to track performance.
                    </p>

                  </div>

                </div>

              </div>


              {/* AI INSIGHT */}

              <div className="bg-sky-400 rounded-2xl p-6 text-white shadow-sm">

                <div className="flex items-center gap-3 mb-5">

                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                    ✦
                  </div>

                  <div>

                    <h2 className="font-bold text-lg">
                      AI Insight
                    </h2>

                    <p className="text-xs text-sky-50">
                      Smart recommendations
                    </p>

                  </div>

                </div>


                <p className="text-sm leading-6 text-white/90">
                  Your SocialPilot AI assistant
                  will analyze your content
                  performance and provide
                  recommendations here.
                </p>


                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/content-lab"
                    )
                  }
                  className="mt-6 w-full rounded-xl bg-white text-sky-600 py-3 text-sm font-bold hover:bg-sky-50 transition"
                >
                  Open Content Lab
                </button>

              </div>

            </div>


            {/* =================================================
                CONTENT LAB
            ================================================= */}

            <div className="mt-6 bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

              <div className="flex items-center justify-between mb-5">

                <div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Content Lab
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Create and manage your social
                    media content.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/create-post"
                    )
                  }
                  className="px-5 py-2.5 rounded-lg bg-sky-400 text-white text-sm font-semibold hover:bg-sky-500"
                >
                  Create
                </button>

              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">


                {/* CREATE POST */}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/create-post"
                    )
                  }
                  className="text-left p-5 rounded-xl border border-sky-100 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-200 transition"
                >

                  <div className="w-10 h-10 rounded-lg bg-white text-sky-500 flex items-center justify-center text-xl mb-3 shadow-sm">
                    ＋
                  </div>

                  <h3 className="font-bold text-slate-800">
                    Create Post
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Create content for multiple
                    social platforms.
                  </p>

                </button>


                {/* CALENDAR */}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/calender"
                    )
                  }
                  className="text-left p-5 rounded-xl border border-sky-100 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-200 transition"
                >

                  <div className="w-10 h-10 rounded-lg bg-white text-sky-500 flex items-center justify-center text-xl mb-3 shadow-sm">
                    ▣
                  </div>

                  <h3 className="font-bold text-slate-800">
                    Publishing Calendar
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Plan and track scheduled
                    content.
                  </p>

                </button>


                {/* AI CONTENT LAB */}

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/content-lab"
                    )
                  }
                  className="text-left p-5 rounded-xl border border-sky-100 bg-sky-50/50 hover:bg-sky-50 hover:border-sky-200 transition"
                >

                  <div className="w-10 h-10 rounded-lg bg-white text-sky-500 flex items-center justify-center text-xl mb-3 shadow-sm">
                    ✦
                  </div>

                  <h3 className="font-bold text-slate-800">
                    AI Content Lab
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Generate and improve social
                    media content.
                  </p>

                </button>

              </div>

            </div>


            {/* =================================================
                CONNECT PLATFORM
            ================================================= */}

            <div className="mt-6 bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

              <div className="mb-5">

                <h2 className="text-xl font-bold text-slate-900">
                  Connect Platform
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Connect your social media
                  accounts to enable publishing.
                </p>

              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">


                {/* PLATFORM SELECT */}

                <select
                  value={selectedPlatform}
                  onChange={(event) =>
                    setSelectedPlatform(
                      event.target.value
                    )
                  }
                  className="border border-sky-100 rounded-xl px-4 py-3 text-sm bg-white text-slate-800 outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400"
                >

                  <option value="LinkedIn">
                    LinkedIn
                  </option>

                  <option value="Instagram">
                    Instagram
                  </option>

                  <option value="Facebook">
                    Facebook
                  </option>

                  <option value="X">
                    X
                  </option>

                  <option value="YouTube">
                    YouTube
                  </option>

                  <option value="Pinterest">
                    Pinterest
                  </option>

                </select>


                {/* ACCOUNT NAME */}

                <input
                  type="text"
                  value={accountName}
                  onChange={(event) =>
                    setAccountName(
                      event.target.value
                    )
                  }
                  placeholder={
                    selectedPlatform.toLowerCase() ===
                    "linkedin"
                      ? "Not needed for LinkedIn"
                      : "Account name"
                  }
                  disabled={
                    selectedPlatform.toLowerCase() ===
                    "linkedin"
                  }
                  className="border border-sky-100 rounded-xl px-4 py-3 text-sm bg-white text-slate-800 outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 disabled:bg-slate-50 disabled:text-slate-400"
                />


                {/* CONNECT BUTTON */}

                <button
                  type="button"
                  onClick={handleConnect}
                  disabled={
                    connecting ||
                    linkedinLoading
                  }
                  className="px-6 py-3 rounded-xl bg-sky-400 text-white text-sm font-bold disabled:opacity-50 hover:bg-sky-500 transition"
                >

                  {linkedinLoading
                    ? "Connecting LinkedIn..."
                    : connecting
                      ? "Connecting..."
                      : "Connect"}

                </button>

              </div>


              {/* MESSAGE */}

              {message && (
                <div className="mt-4 rounded-xl bg-sky-50 border border-sky-100 px-4 py-3">

                  <p className="text-sm text-sky-600 font-medium">
                    {message}
                  </p>

                </div>
              )}

            </div>


            {/* =================================================
                CONNECTED PLATFORMS
            ================================================= */}

            <div className="mt-6 bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">

              <div className="flex items-center justify-between mb-5">

                <div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Connected Platforms
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Your connected social media
                    accounts.
                  </p>

                </div>

                <span className="text-sm font-semibold text-sky-500">
                  {socialAccounts.length} connected
                </span>

              </div>


              {socialAccounts.length === 0 ? (

                <div className="rounded-xl bg-sky-50 border border-dashed border-sky-200 p-8 text-center">

                  <div className="w-14 h-14 rounded-full bg-white text-sky-400 flex items-center justify-center text-2xl mx-auto mb-3 shadow-sm">
                    ◎
                  </div>

                  <p className="text-base font-semibold text-slate-700">
                    No platforms connected
                  </p>

                  <p className="text-sm text-slate-400 mt-1">
                    Connect a social account
                    above to get started.
                  </p>

                </div>

              ) : (

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                  {socialAccounts.map(
                    (account) => {

                      const platformKey =
                        account.platform
                          .toLowerCase();

                      const platformData =
                        PLATFORM_DATA[
                          platformKey
                        ];

                      return (
                        <div
                          key={account.id}
                          className="border border-sky-100 rounded-xl p-4 hover:bg-sky-50/50 transition"
                        >

                          <div className="flex items-center justify-between">

                            <div className="flex items-center gap-3">

                              <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-500 flex items-center justify-center text-sm font-bold">

                                {platformData?.icon ||
                                  account.platform
                                    .charAt(0)
                                    .toUpperCase()}

                              </div>


                              <div>

                                <p className="text-sm font-bold text-slate-800">
                                  {platformData?.label ||
                                    account.platform}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {account.username ||
                                    account.account_name ||
                                    "Connected"}
                                </p>

                              </div>

                            </div>


                            <span className="w-3 h-3 rounded-full bg-green-400" />

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              )}

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}