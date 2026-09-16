"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
} from "lucide-react";

import { usePostsInRange, CalendarPost } from "@/hooks/usePostsInRange";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

// Turns "facebook" into "Facebook" for display.
function capitalizePlatform(platform: string) {
  return platform.charAt(0).toUpperCase() + platform.slice(1);
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [selectedDate, setSelectedDate] = useState(today);

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedDateText = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Range covering the full visible month, used to fetch real posts.
  const monthStart = useMemo(
    () => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1),
    [currentMonth]
  );

  const monthEnd = useMemo(
    () =>
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        0,
        23,
        59,
        59
      ),
    [currentMonth]
  );

  const { posts, isLoading, error } = usePostsInRange(monthStart, monthEnd);

  // Group posts by day (formatDateKey) so the calendar grid and the
  // selected-date panel can both look them up quickly.
  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();

    for (const post of posts) {
      if (!post.scheduled_at) continue;

      const key = formatDateKey(new Date(post.scheduled_at));
      const existing = map.get(key) ?? [];
      existing.push(post);
      map.set(key, existing);
    }

    return map;
  }, [posts]);

  const selectedDatePosts = postsByDate.get(formatDateKey(selectedDate)) ?? [];

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const firstWeekday = firstDayOfMonth.getDay();
    const totalDays = lastDayOfMonth.getDate();

    const days: Array<Date | null> = [];

    for (let i = 0; i < firstWeekday; i++) {
      days.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  };

  const goToToday = () => {
    setCurrentMonth(
      new Date(today.getFullYear(), today.getMonth(), 1)
    );

    setSelectedDate(today);
  };

  return (
    <div className="space-y-6">
      {/* ---------- Page Heading ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="text-indigo-600" size={24} />

            <h1 className="text-2xl font-bold text-gray-900">
              Content Calendar
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            View and manage your scheduled social media content.
          </p>
        </div>

        <Link
          href="/dashboard/posts"
          className="flex items-center justify-center gap-2 rounded-lg
                     bg-indigo-600 px-4 py-2.5 text-sm font-medium
                     text-white transition hover:bg-indigo-700"
        >
          <Plus size={17} />
          Create Post
        </Link>
      </div>

      {/* ---------- Calendar ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        {/* Calendar Controls */}
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg
                         border border-gray-200 text-gray-600 transition
                         hover:bg-gray-50"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <h2 className="min-w-[160px] text-center text-lg font-semibold text-gray-900">
              {monthName}
            </h2>

            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-lg
                         border border-gray-200 text-gray-600 transition
                         hover:bg-gray-50"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="w-fit rounded-lg border border-indigo-200 bg-indigo-50
                       px-4 py-2 text-sm font-medium text-indigo-700
                       transition hover:bg-indigo-100"
          >
            Today
          </button>
        </div>

        {/* Weekday Names */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekdays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-gray-500"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-[78px] border-b border-r border-gray-100 bg-gray-50/40"
                />
              );
            }

            const isToday = isSameDay(date, today);
            const isSelected = isSameDay(date, selectedDate);
            const dayPosts = postsByDate.get(formatDateKey(date)) ?? [];
            const hasPosts = dayPosts.length > 0;

            return (
              <button
                key={formatDateKey(date)}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`min-h-[78px] border-b border-r border-gray-100
                           p-2 text-left transition hover:bg-indigo-50
                           ${
                             isSelected
                               ? "bg-indigo-50"
                               : "bg-white"
                           }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center
                             rounded-full text-sm font-medium
                             ${
                               isToday
                                 ? "bg-indigo-600 text-white"
                                 : isSelected
                                 ? "bg-indigo-100 text-indigo-700"
                                 : "text-gray-700"
                             }`}
                >
                  {date.getDate()}
                </span>

                {/* Dot indicator + count when this day has scheduled posts */}
                {hasPosts && (
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[11px] font-medium text-indigo-600">
                      {dayPosts.length}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- Selected Date ---------- */}
      <section className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Clock size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-900">
                Schedule for {selectedDateText}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Posts scheduled for the selected date will appear here.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            Loading...
          </div>
        ) : error ? (
          <div className="px-6 py-12 text-center text-sm text-red-600">
            {error}
          </div>
        ) : selectedDatePosts.length === 0 ? (
          /* Empty State */
          <div className="px-6 py-12 text-center">
            <CalendarDays
              size={32}
              className="mx-auto text-gray-300"
            />

            <p className="mt-4 text-sm font-medium text-gray-700">
              No posts scheduled for this date
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Create a post and schedule it to see it on your content calendar.
            </p>

            <Link
              href="/dashboard/posts"
              className="mt-5 inline-flex items-center gap-2 rounded-lg
                         bg-indigo-600 px-4 py-2.5 text-sm font-medium
                         text-white transition hover:bg-indigo-700"
            >
              <Plus size={16} />
              Create a Post
            </Link>
          </div>
        ) : (
          /* Real scheduled posts for this day */
          <div className="divide-y divide-gray-100">
            {selectedDatePosts.map((post) => (
              <div key={post.id} className="flex items-start gap-4 px-6 py-4">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <Clock size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {post.scheduled_at
                        ? new Date(post.scheduled_at).toLocaleTimeString(
                            "en-US",
                            { hour: "numeric", minute: "2-digit" }
                          )
                        : "—"}
                    </span>

                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-600">
                      {post.status}
                    </span>

                    {post.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700"
                      >
                        {capitalizePlatform(platform)}
                      </span>
                    ))}
                  </div>

                  <p className="mt-1.5 truncate text-sm text-gray-600">
                    {post.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}