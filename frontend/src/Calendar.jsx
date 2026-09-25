import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

function Calendar({ scheduledPosts = [] }) {
  // Make sure scheduledPosts is always an array
  const posts = Array.isArray(scheduledPosts) ? scheduledPosts : [];

  // Convert scheduled posts into FullCalendar events
  const events = posts
    .filter((post) => post && post.scheduled_at)
    .map((post) => {
      const scheduledDate = new Date(post.scheduled_at);

      // Ignore invalid dates
      if (Number.isNaN(scheduledDate.getTime())) {
        return null;
      }

      const status = post.status || post.post_status || "scheduled";

      return {
        id: String(post.schedule_id || post.post_id),
        title: post.content
          ? `${post.content} (${status})`
          : `Post #${post.post_id}`,

        start: scheduledDate,

        // Extra information available when an event is clicked
        extendedProps: {
          postId: post.post_id,
          scheduleId: post.schedule_id,
          status: status,
          platform: post.platform || "Unknown",
          username: post.username || "",
          content: post.content || "",
        },
      };
    })
    .filter(Boolean);

  // When a calendar event is clicked
  const handleEventClick = (info) => {
    const event = info.event;
    const details = event.extendedProps;

    alert(
      `Post Details\n\n` +
        `Content: ${details.content || "No content"}\n` +
        `Platform: ${details.platform}\n` +
        `Username: ${details.username || "N/A"}\n` +
        `Status: ${details.status}\n` +
        `Scheduled Time: ${event.start?.toLocaleString() || "N/A"}\n` +
        `Schedule ID: ${details.scheduleId || "N/A"}\n` +
        `Post ID: ${details.postId || "N/A"}`
    );
  };

  return (
    <div className="calendar-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Publishing Calendar</h1>
          <p>
            View and manage your scheduled social media posts.
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-panel">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth",
          }}
          events={events}
          height="auto"
          eventDisplay="block"
          displayEventTime={true}
          eventTimeFormat={{
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }}
          eventClick={handleEventClick}
          dayMaxEvents={3}
          nowIndicator={true}
        />
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <div
          style={{
            marginTop: "20px",
            padding: "20px",
            textAlign: "center",
            border: "1px solid #ddd",
            borderRadius: "8px",
          }}
        >
          <h3>No scheduled posts</h3>
          <p>
            There are currently no posts with a valid scheduled date.
          </p>
        </div>
      )}
    </div>
  );
}

export default Calendar;