import { ApprovalBadge } from '../components/ApprovalBadge'
import { publishingMessage } from '../workflowPolicy'
import { useState } from 'react'
import {
  Megaphone,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  X,
  Calendar,
  Clock,
  Trash2,
  Edit3,
} from 'lucide-react'
import { CampaignCard } from '../components/CampaignCard'
import { PlatformBadge } from '../components/PlatformBadge'
import { EmptyState } from '../components/EmptyState'
import { platformName, statusLabel } from '../postUtils'
import { PostPreview } from '../components/PostPreview'

export const Campaigns = ({
  campaigns = [],
  showCampaignForm,
  setShowCampaignForm,
  campaignName,
  setCampaignName,
  platform,
  setPlatform,
  content,
  setContent,
  campaignDate,
  setCampaignDate,
  campaignTime,
  setCampaignTime,
  editIndex,
  onSaveCampaign,
  onCancelForm,
  onEditCampaign,
  onDeleteCampaign,
  canCreateCampaign, canPublish,
  onDetails, imageUrl, setImageUrl, accountIds, setAccountIds,
  recurrence, setRecurrence, occurrences, setOccurrences,
  connectedAccounts = [], busy, formError,
  campaignOptions = [], campaignId = '', setCampaignId = () => {},
  videoUrl = '', setVideoUrl = () => {},
}) => {
  const targetsYouTube = platform === 'YouTube' || connectedAccounts.some(a => accountIds.includes(a.id) && a.platform.toLowerCase() === 'youtube')
  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'


  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    // Search query filter
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.content || '').toLowerCase().includes(searchQuery.toLowerCase())

    // Platform filter
    const matchesPlatform =
      platformFilter === 'All' ||
      (c.platform || '').toLowerCase() === platformFilter.toLowerCase()

    // Status filter
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter

    return matchesSearch && matchesPlatform && matchesStatus
  })

  return (
    <div className="campaigns-page-container">
      {/* Header & Controls */}
      <div className="page-header-row">
        <div>
          <h1 className="page-main-heading">Posts</h1>
          <p className="page-main-sub">
            Create, schedule and track posts across your connected channels.
          </p>
        </div>
        {canCreateCampaign && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowCampaignForm(true)}
          >
            <Plus size={16} />
            <span>New Post</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="campaign-filter-bar">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search posts by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-controls-group">
          {/* Platform Filter */}
          <div className="select-filter-wrap">
            <select
              className="custom-select"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="All">All Platforms</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="LinkedIn">LinkedIn</option>
              <option value="X">X (Twitter)</option>
              <option value="YouTube">YouTube</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="select-filter-wrap">
            <select
              className="custom-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              {['draft', 'scheduled', 'publishing', 'published', 'partially_published', 'failed', 'cancelled', 'needs_review'].map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns Listing */}
      {filteredCampaigns.length === 0 ? (
        <EmptyState
          title={
            campaigns.length === 0
              ? 'No posts yet'
              : 'No matching posts found'
          }
          description={
            campaigns.length === 0
              ? (canCreateCampaign ? 'Click the button below to create your first post.' : 'Posts created in your account will appear here. Your role has read-only access.')
              : 'Try clearing your search query or adjusting your filters.'
          }
          actionLabel={campaigns.length === 0 && canCreateCampaign ? 'New Post' : undefined}
          onAction={campaigns.length === 0 && canCreateCampaign ? () => setShowCampaignForm(true) : undefined}
        />
      ) : viewMode === 'grid' ? (
        <div className="campaigns-grid">
          {filteredCampaigns.map((campaign, idx) => {
            const originalIndex = campaigns.indexOf(campaign)
            return (
              <CampaignCard
                key={originalIndex !== -1 ? originalIndex : idx}
                campaign={campaign}
                index={originalIndex !== -1 ? originalIndex : idx}
                onEdit={onEditCampaign}
                onDelete={onDeleteCampaign}
                onDetails={onDetails}
                canManage={canCreateCampaign && !busy}
              />
            )
          })}
        </div>
      ) : (
        <div className="dashboard-card p-0">
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Post Title</th>
                  <th>Platform</th>
                  <th>Content Preview</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Approval</th><th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c, idx) => {
                  const originalIndex = campaigns.indexOf(c)
                  return (
                    <tr key={idx}>
                      <td className="font-semibold text-slate-800">{c.name}</td>
                      <td>
                        <PlatformBadge platform={c.platform} size="sm" />
                      </td>
                      <td className="max-w-xs truncate text-slate-600">{c.content}</td>
                      <td>
                        <div className="date-cell">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{c.date || '—'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="date-cell">
                          <Clock size={13} className="text-slate-400" />
                          <span>{c.time || '—'}</span>
                        </div>
                      </td>
                      <td><ApprovalBadge status={c.approval_status} /></td>
                      <td className="text-right">
                        <div className="table-action-group">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => onDetails(c.id)}
                          >
                            <Edit3 size={13} />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost-danger btn-xs"
                            onClick={() => onDeleteCampaign(originalIndex !== -1 ? originalIndex : idx)}
                            disabled={!canCreateCampaign || busy || c.status !== 'draft' || c.jobs.length > 0}
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Drawer for Create & Edit Campaign */}
      {showCampaignForm && (
        <div className="modal-backdrop">
          <div className="modal-container" role="dialog" aria-modal="true" aria-label="Post editor">
            <div className="modal-header">
              <div className="modal-title-group">
                <Megaphone size={20} className="text-indigo" />
                <h3 className="modal-title">
                  {editIndex !== null ? 'Edit Post' : 'Create New Post'}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={onCancelForm}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {formError && <div className="info-callout-card" role="alert">{formError}</div>}
              <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div className="form-group-modern">
                <label className="form-label">Post Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Summer Product Launch 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="form-group-modern">
                <label className="form-label" htmlFor="post-campaign">Campaign</label>
                <select id="post-campaign" className="form-input" value={campaignId} onChange={e => setCampaignId(e.target.value)}>
                  <option value="">No campaign</option>
                  {campaignOptions.filter(c => c.status !== 'archived' || String(c.id) === campaignId).map(c => <option key={c.id} value={c.id}>{c.name}{c.status === 'active' ? '' : ` (${c.status})`}</option>)}
                </select>
                <p className="page-main-sub">Group this post under a campaign to track its performance, goals and ROI.</p>
              </div>

              <div className="form-group-modern">
                <label className="form-label">Target Platform</label>
                <select
                  className="form-input"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="">Any / multiple platforms</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="X">X (formerly Twitter)</option>
                  <option value="YouTube">YouTube</option>
                </select>
              </div>

              <div className="form-group-modern">
                <label className="form-label" htmlFor="target-accounts">Authorized accounts (select one or more)</label>
                <select id="target-accounts" multiple className="form-input" value={accountIds.map(String)} onChange={e => setAccountIds(Array.from(e.target.selectedOptions, item => Number(item.value)))}>
                  {connectedAccounts.filter(a => a.connected && (!platform || a.platform.toLowerCase() === platform.toLowerCase())).map(a => <option key={a.id} value={a.id}>{a.account_name} — {a.platform}</option>)}
                </select>
                <p className="page-main-sub">Connect accounts in Social Accounts before scheduling. Drafts can be saved without an account.</p>
              </div>
              <div className="form-group-modern">
                <label className="form-label" htmlFor="post-image">Public HTTPS image URL</label>
                <input id="post-image" className="form-input" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                <p className="page-main-sub">Required for Instagram; optional for Facebook, LinkedIn and X (max 5 MB for X).</p>
              </div>
              <div className="form-group-modern">
                <label className="form-label" htmlFor="post-video">Public HTTPS video URL {targetsYouTube && <span className="text-danger">*</span>}</label>
                <input id="post-video" className="form-input" type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://example.com/video.mp4" />
                <p className="page-main-sub">Required for YouTube (the post title becomes the video title, the content its description). Other platforms ignore it.</p>
                {targetsYouTube && campaignName.length > 100 && <p className="text-danger" role="alert">YouTube titles are limited to 100 characters ({campaignName.length}).</p>}
              </div>
              <div className="form-group-modern">
                <div className="label-row">
                  <label className="form-label">Post Content</label>
                  <span className="char-counter">
                    {content.length} characters
                  </span>
                </div>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Write your engaging post copy here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              {canPublish && <fieldset className="cm-fieldset">
              <div className="form-row-2col">
                <div className="form-group-modern">
                  <label className="form-label">Schedule Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={campaignDate}
                    onChange={(e) => setCampaignDate(e.target.value)}
                  />
                </div>

                <div className="form-group-modern">
                  <label className="form-label">Schedule Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={campaignTime}
                    onChange={(e) => setCampaignTime(e.target.value)}
                  />
                </div>
              </div>
              <p className="page-main-sub">Schedule timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone} (your device timezone)</p>
              <div className="form-row-2col">
                <div className="form-group-modern"><label className="form-label" htmlFor="repeat">Repeat</label><select id="repeat" className="form-input" value={recurrence} onChange={e => setRecurrence(e.target.value)}><option value="none">Once</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></div>
                {recurrence !== 'none' && <div className="form-group-modern"><label className="form-label" htmlFor="occurrences">Occurrences (1–52)</label><input id="occurrences" className="form-input" type="number" min="1" max="52" value={occurrences} onChange={e => setOccurrences(e.target.value)} /></div>}
              </div>
              </fieldset>}
              {!canPublish && <p role="status">{publishingMessage}</p>}
              <div className="form-group-modern"><span className="form-label">Live preview</span><PostPreview
                platforms={[...new Set([platform, ...connectedAccounts.filter(a => accountIds.includes(a.id)).map(a => platformName(a.platform.toLowerCase()))].filter(Boolean))]}
                accountNames={Object.fromEntries(connectedAccounts.filter(a => accountIds.includes(a.id)).map(a => [platformName(a.platform.toLowerCase()), a.account_name]))}
                content={content} imageUrl={imageUrl.trim()} videoUrl={videoUrl.trim()} title={campaignName} /></div>
              </fieldset>
            </div>

            <div className="modal-footer" style={{ flexWrap: 'wrap' }}>
              {formError && <p className="text-danger" role="status" style={{ flexBasis: '100%', margin: 0, fontSize: '0.85rem', textAlign: 'right' }}>{formError}</p>}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancelForm}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onSaveCampaign(false)}
                disabled={busy}
              >
                {busy ? 'Saving…' : 'Save Draft'}
              </button>
              {!canPublish && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onSaveCampaign('approval')}>Send for approval</button>}
              {canPublish && <><button type="button" className="btn btn-primary" disabled={busy} onClick={() => onSaveCampaign(true)}>Schedule Post</button><button type="button" className="btn btn-secondary" disabled={busy} onClick={() => { if (window.confirm("Publish this post now to the selected accounts?")) onSaveCampaign("now") }}>Publish now</button></>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Campaigns
