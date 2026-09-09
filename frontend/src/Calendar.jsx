import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

function Calendar({ scheduledPosts }) {
  const events = scheduledPosts
    .filter((post) => post.scheduled_at)
    .map((post) => ({
      id: String(post.schedule_id),
      title: post.content
        ? `${post.content} (${post.status || "scheduled"})`
        : `Post #${post.post_id}`,
      start: post.scheduled_at,
    }));

  return (
    <div className="calendar-page">
      <div className="page-header">
        <div>
          <h1>Publishing Calendar</h1>
          <p>View and manage your scheduled social media posts.</p>
        </div>
      </div>

      <div className="calendar-panel">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          eventDisplay="block"
        />
      </div>
    </div>
  );
}

export default Calendar;