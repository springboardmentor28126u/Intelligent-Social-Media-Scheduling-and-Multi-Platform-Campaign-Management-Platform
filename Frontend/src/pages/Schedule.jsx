import { useState } from 'react'
import { statusLabel, statusTone } from '../postUtils'
import {
  Calendar as CalendarIcon,
  Clock,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,

  CheckCircle2,
  Clock3,
  AlertTriangle,
  CircleDashed,
} from 'lucide-react'

const TONE_ICON = { success: CheckCircle2, danger: AlertTriangle, muted: CircleDashed, pending: Clock3 }
import { PlatformBadge, PlatformIcon } from '../components/PlatformBadge'
import { EmptyState } from '../components/EmptyState'

export const Schedule = ({
  campaigns = [],
  onOpenCreateCampaign,
  onEditCampaign,

  initialView = 'list',
  onViewChange,
}) => {
  const viewMode = initialView
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [listFilter, setListFilter] = useState('upcoming')

  const now = new Date()

  // Sort campaigns chronologically
  const sortedCampaigns = [...campaigns].filter(c => listFilter === 'all' || ['scheduled', 'retry', 'processing'].includes(c.status)).sort((a, b) => {
    const da = new Date(`${a.date || '1970-01-01'}T${a.time || '00:00'}`)
    const db = new Date(`${b.date || '1970-01-01'}T${b.time || '00:00'}`)
    return da - db
  })

  // Calendar calculations
  const year = selectedMonthDate.getFullYear()
  const month = selectedMonthDate.getMonth()
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Map campaigns by date string YYYY-MM-DD
  const campaignsByDate = {}
  campaigns.forEach((c) => {
    if (c.date) {
      const d = c.date
      if (!campaignsByDate[d]) campaignsByDate[d] = []
      campaignsByDate[d].push(c)
    }
  })

  const selectedDayEvents = selectedDay ? { date: selectedDay, events: campaignsByDate[selectedDay] || [] } : null

  const prevMonth = () => {
    setSelectedMonthDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
  }

  const nextMonth = () => {
    setSelectedMonthDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
  }

  return (
    <div className="schedule-page-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-main-heading">
            {viewMode === 'calendar' ? 'Content Calendar' : 'Publishing Schedule'}
          </h1>
          <p className="page-main-sub">
            Every scheduled publication per account, in time order and on the calendar.
          </p>
        </div>

        <div className="header-actions-group">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewChange('list')}
            >
              <LayoutList size={16} />
              <span>List</span>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => onViewChange('calendar')}
            >
              <CalendarIcon size={16} />
              <span>Calendar</span>
            </button>
          </div>

          {onOpenCreateCampaign && <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreateCampaign}
          >
            <Plus size={16} />
            <span>Schedule Post</span>
          </button>}
        </div>
      </div>

      {/* View Mode: List */}
      {viewMode === 'list' && (
        <div className="schedule-list-view">
          <div className="time-range-picker" style={{ alignSelf: 'flex-start', marginBottom: '1rem', display: 'inline-flex' }}>
            <button type="button" className={`range-pill ${listFilter === 'upcoming' ? 'active' : ''}`} onClick={() => setListFilter('upcoming')}>Upcoming</button>
            <button type="button" className={`range-pill ${listFilter === 'all' ? 'active' : ''}`} onClick={() => setListFilter('all')}>All history ({campaigns.length})</button>
          </div>
          {sortedCampaigns.length === 0 ? (
            <EmptyState
              icon={CalendarIcon}
              title={listFilter === 'upcoming' ? 'Nothing waiting to publish' : 'No scheduled posts'}
              description={listFilter === 'upcoming' ? 'Scheduled publications will appear here until they go out. Switch to All history to see past ones.' : 'You have no social media posts scheduled in your queue.'}
              actionLabel={onOpenCreateCampaign ? 'Create Scheduled Post' : undefined}
              onAction={onOpenCreateCampaign}
            />
          ) : (
            <div className="schedule-timeline-cards">
              {sortedCampaigns.map((campaign, idx) => {
                const originalIndex = campaigns.indexOf(campaign)
                const tone = statusTone(campaign.status)
                const ToneIcon = TONE_ICON[tone]
                return (
                  <div key={idx} className="schedule-timeline-row">
                    <div className="schedule-time-badge">
                      <div className="sched-date">{campaign.date || 'Unscheduled'}</div>
                      <div className="sched-time">
                        <Clock size={12} />
                        <span>{campaign.time || '12:00'}</span>
                      </div>
                    </div>

                    <div className="schedule-card-body">
                      <div className="sched-header">
                        <div className="sched-title-group">
                          <h3 className="sched-title">{campaign.name}</h3>
                          <span className={`status-pill tone-${tone}`}>
                            <ToneIcon size={11} />
                            <span>{statusLabel(campaign.status)}</span>
                          </span>
                        </div>
                        <PlatformBadge platform={campaign.platform} size="sm" />
                      </div>

                      <p className="sched-text">{campaign.content}</p>

                      <div className="sched-footer">
                        <div className="sched-channel-info">
                          <PlatformIcon platform={campaign.platform} size={14} />
                          <span>{campaign.account_name ? `${campaign.account_name} · ` : ''}{campaign.platform}</span>
                        </div>

                        <div className="sched-action-btns">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() =>
                              onEditCampaign(originalIndex !== -1 ? originalIndex : idx)
                            }
                          >
                            <Edit3 size={13} />
                            <span>Details</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* View Mode: Interactive Calendar */}
      {viewMode === 'calendar' && (
        <div className="calendar-view-container">
          <div className="calendar-controls-bar">
            <div className="calendar-month-title">
              <h2>
                {monthNames[month]} {year}
              </h2>
            </div>
            <div className="calendar-nav-buttons">
              <button type="button" className="btn-icon" onClick={prevMonth}>
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => { setSelectedMonthDate(new Date()); setSelectedDay(null) }}
              >
                Today
              </button>
              <button type="button" className="btn-icon" onClick={nextMonth}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="calendar-grid-card">
            {/* Days of week header */}
            <div className="calendar-weekdays-row">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="calendar-weekday-cell">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="calendar-days-grid">
              {/* Empty leading padding days */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="calendar-day-cell is-empty" />
              ))}

              {/* Days of current month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const monthStr = String(month + 1).padStart(2, '0')
                const dayStr = String(dayNum).padStart(2, '0')
                const dateKey = `${year}-${monthStr}-${dayStr}`
                const dayCampaigns = campaignsByDate[dateKey] || []

                const isToday =
                  now.getFullYear() === year &&
                  now.getMonth() === month &&
                  now.getDate() === dayNum

                return (
                  <div
                    key={dayNum}
                    className={`calendar-day-cell ${isToday ? 'is-today' : ''} ${
                      dayCampaigns.length > 0 ? 'has-events' : ''
                    }`}
                    onClick={() => {
                      if (dayCampaigns.length > 0) {
                        setSelectedDay(dateKey)
                      }
                    }}
                  >
                    <div className="day-number-header">
                      <span className={`day-number ${isToday ? 'today-pill' : ''}`}>
                        {dayNum}
                      </span>
                      {dayCampaigns.length > 0 && (
                        <span className="events-count-pill">{dayCampaigns.length}</span>
                      )}
                    </div>

                    <div className="day-events-list">
                      {dayCampaigns.slice(0, 2).map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className={`cal-event-pill cal-event-${c.platform.toLowerCase()}`}
                          title={`${c.name} (${c.time || '12:00'})`}
                        >
                          <PlatformIcon platform={c.platform} size={11} />
                          <span className="cal-event-title">{c.name}</span>
                        </div>
                      ))}
                      {dayCampaigns.length > 2 && (
                        <span className="cal-more-tag">+{dayCampaigns.length - 2} more</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Popover/Detail Drawer for selected day */}
          {selectedDayEvents && (
            <div className="calendar-selected-events-card">
              <div className="selected-header">
                <h3>Scheduled for {selectedDayEvents.date}</h3>
                <button
                  type="button"
                  className="btn-link text-sm"
                  onClick={() => setSelectedDay(null)}
                >
                  Close
                </button>
              </div>
              <div className="selected-list">
                {selectedDayEvents.events.map((e, idx) => {
                  const originalIndex = campaigns.indexOf(e)
                  return (
                    <div key={idx} className="selected-event-item">
                      <div className="event-main">
                        <strong>{e.name}</strong>
                        <span className="event-meta">
                          {e.time} • {e.content}
                        </span>
                      </div>
                      <div className="event-right">
                        <PlatformBadge platform={e.platform} size="sm" />
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => {
                            setSelectedDay(null)
                            onEditCampaign(originalIndex !== -1 ? originalIndex : idx)
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Schedule

