"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  CalendarDays,
  Megaphone,
  Link2,
  Plus,
  Clock,
  CheckCircle2,
  ArrowRight,
  Activity,
  Sparkles,
  BarChart3,
} from "lucide-react";

import { useDashboardUser } from "./layout";
import { usePostCounts } from "@/hooks/usePostCounts";
import { usePostsInRange } from "@/hooks/usePostsInRange";
export default function DashboardOverviewPage() {
  const user = useDashboardUser();

  const firstName =
    user?.full_name?.split(" ").filter(Boolean)[0] || "there";

  // Real counts from the backend now, via the shared hook.
  const {
    total: totalPosts,
    scheduled: scheduledPosts,
    draft: draftPosts,
    published: publishedPosts,
  } = usePostCounts();
  // Upcoming Schedule widget: reuse usePostsInRange with a wide window
  // (today -> +1 year) since there's no "just give me the next N" endpoint.
  // We filter to scheduled posts, sort by date, and only show the top 3.
  const upcomingRangeStart = new Date();
  const upcomingRangeEnd = new Date();
  upcomingRangeEnd.setFullYear(upcomingRangeEnd.getFullYear() + 1);

  const { posts: upcomingPosts } = usePostsInRange(
    upcomingRangeStart,
    upcomingRangeEnd
  );

  const nextThreeUpcoming = upcomingPosts
    .filter((post) => post.status === "scheduled" && post.scheduled_at)
    .sort(
      (a, b) =>
        new Date(a.scheduled_at!).getTime() -
        new Date(b.scheduled_at!).getTime()
    )
    .slice(0, 3);
  // Still hardcoded — no SocialAccount tracking table exists yet
  // (see architecture decisions: connection-tracking was skipped).
  const connectedAccounts = 0;

  return (
    <div className="space-y-8">
      {/* ---------- Welcome Section ---------- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 to-purple-700 px-6 py-7 text-white shadow-sm">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-100">
            <Sparkles size={18} />

            <span className="text-sm font-medium">
              Your Social Media Workspace
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
            Welcome back, {firstName}!
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
            Manage your content, publishing schedule, campaigns, and social
            media accounts from one central workspace.
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-white/5" />
        <div className="absolute right-24 -bottom-20 h-40 w-40 rounded-full bg-white/5" />
      </section>

      {/* ---------- Workspace Summary ---------- */}
      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard
              size={21}
              className="text-indigo-600"
            />

            <h2 className="text-lg font-semibold text-gray-900">
              Workspace Overview
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            A quick snapshot of your social media activity.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {/* Total Posts */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Total Posts
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {totalPosts}
                </p>
              </div>

              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                <FileText size={20} />
              </div>
            </div>
          </div>

          {/* Scheduled */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Scheduled
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {scheduledPosts}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                <CalendarDays size={20} />
              </div>
            </div>
          </div>

          {/* Draft */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Drafts
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {draftPosts}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
          </div>

          {/* Published */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Published
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {publishedPosts}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
                <CheckCircle2 size={20} />
              </div>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Connected Accounts
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {connectedAccounts}
                </p>
              </div>

              <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
                <Link2 size={20} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Quick Actions ---------- */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Jump directly to the most common workspace actions.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/posts"
            className="group rounded-xl border border-gray-100 bg-white p-5
                       shadow-sm transition hover:-translate-y-0.5
                       hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                <Plus size={20} />
              </div>

              <ArrowRight
                size={18}
                className="text-gray-300 transition group-hover:translate-x-1
                           group-hover:text-indigo-600"
              />
            </div>

            <h3 className="mt-5 font-semibold text-gray-900">
              Create Post
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Create a new social media post.
            </p>
          </Link>

          <Link
            href="/dashboard/calendar"
            className="group rounded-xl border border-gray-100 bg-white p-5
                       shadow-sm transition hover:-translate-y-0.5
                       hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
                <CalendarDays size={20} />
              </div>

              <ArrowRight
                size={18}
                className="text-gray-300 transition group-hover:translate-x-1
                           group-hover:text-blue-600"
              />
            </div>

            <h3 className="mt-5 font-semibold text-gray-900">
              View Calendar
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Review your publishing schedule.
            </p>
          </Link>

          <Link
            href="/dashboard/campaigns"
            className="group rounded-xl border border-gray-100 bg-white p-5
                       shadow-sm transition hover:-translate-y-0.5
                       hover:border-purple-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
                <Megaphone size={20} />
              </div>

              <ArrowRight
                size={18}
                className="text-gray-300 transition group-hover:translate-x-1
                           group-hover:text-purple-600"
              />
            </div>

            <h3 className="mt-5 font-semibold text-gray-900">
              Create Campaign
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Organize content around a campaign.
            </p>
          </Link>

          <Link
            href="/dashboard/social-accounts"
            className="group rounded-xl border border-gray-100 bg-white p-5
                       shadow-sm transition hover:-translate-y-0.5
                       hover:border-pink-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-lg bg-pink-50 p-2.5 text-pink-600">
                <Link2 size={20} />
              </div>

              <ArrowRight
                size={18}
                className="text-gray-300 transition group-hover:translate-x-1
                           group-hover:text-pink-600"
              />
            </div>

            <h3 className="mt-5 font-semibold text-gray-900">
              Manage Accounts
            </h3>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Connect and manage social platforms.
            </p>
          </Link>
        </div>
      </section>

      {/* ---------- Upcoming Schedule + Activity ---------- */}
      <section className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Posts */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="font-semibold text-gray-900">
                Upcoming Schedule
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Your next scheduled content.
              </p>
            </div>

            <Link
              href="/dashboard/calendar"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View Calendar
            </Link>
          </div>

                    {nextThreeUpcoming.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CalendarDays
                size={34}
                className="mx-auto text-gray-300"
              />
              <p className="mt-4 text-sm font-medium text-gray-700">
                Nothing scheduled yet
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Scheduled posts will appear here once you start planning your
                content.
              </p>
              <Link
                href="/dashboard/posts"
                className="mt-5 inline-flex items-center gap-2 text-sm
                           font-medium text-indigo-600 hover:text-indigo-700"
              >
                Create your first post
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {nextThreeUpcoming.map((post) => (
                <li key={post.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {post.content || "(no content)"}
                    </p>
                    <span className="shrink-0 text-xs font-medium text-indigo-600">
                      {new Date(post.scheduled_at!).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {post.platforms.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="font-semibold text-gray-900">
              Recent Activity
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Important changes in your workspace.
            </p>
          </div>

          <div className="px-6 py-12 text-center">
            <Activity
              size={34}
              className="mx-auto text-gray-300"
            />

            <p className="mt-4 text-sm font-medium text-gray-700">
              No activity yet
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Your activity history will appear here as you create posts,
              campaigns, and connect accounts.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Getting Started ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-2">
            <Sparkles
              size={19}
              className="text-indigo-600"
            />

            <h2 className="font-semibold text-gray-900">
              Get Started with SocialPilot
            </h2>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            A simple path to set up your workspace.
          </p>
        </div>

        <div className="grid divide-y divide-gray-100 md:grid-cols-3 md:divide-x md:divide-y-0">
          <Link
            href="/dashboard/social-accounts"
            className="group p-6 transition hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
              1
            </div>

            <h3 className="mt-4 font-medium text-gray-900">
              Connect Accounts
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Add the social media accounts you want to manage.
            </p>

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
              Manage accounts
              <ArrowRight
                size={15}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>

          <Link
            href="/dashboard/posts"
            className="group p-6 transition hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
              2
            </div>

            <h3 className="mt-4 font-medium text-gray-900">
              Create Content
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Draft and schedule posts for your selected platforms.
            </p>

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
              Create post
              <ArrowRight
                size={15}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="group p-6 transition hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
              3
            </div>

            <h3 className="mt-4 font-medium text-gray-900">
              Track Performance
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Review engagement and performance once analytics data is
              available.
            </p>

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">
              View analytics
              <ArrowRight
                size={15}
                className="transition group-hover:translate-x-1"
              />
            </span>
          </Link>
        </div>
      </section>

      {/* ---------- Analytics Shortcut ---------- */}
      <Link
        href="/dashboard/analytics"
        className="flex flex-col gap-4 rounded-xl border border-indigo-100
                   bg-indigo-50 p-6 transition hover:bg-indigo-100
                   sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-white p-3 text-indigo-600 shadow-sm">
            <BarChart3 size={22} />
          </div>

          <div>
            <h2 className="font-semibold text-indigo-950">
              Ready to understand your performance?
            </h2>

            <p className="mt-1 text-sm leading-6 text-indigo-700">
              View reach, engagement, clicks, and platform insights from the
              Analytics workspace.
            </p>
          </div>
        </div>

        <ArrowRight
          size={20}
          className="shrink-0 text-indigo-600"
        />
      </Link>
    </div>
  );
}