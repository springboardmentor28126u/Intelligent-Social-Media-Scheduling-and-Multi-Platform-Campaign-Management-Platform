import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import { getRoleConfig, ROLES } from './config/roles'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { PlaceholderPage } from './components/PlaceholderPage'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Campaigns } from './pages/Campaigns'
import { Schedule } from './pages/Schedule'
import { Accounts } from './pages/Accounts'
import { Analytics } from './pages/Analytics'
import { Engagement } from './pages/Engagement'
import { CampaignHub } from './pages/CampaignHub'
import { Reports } from './pages/Reports'
import { Profile } from './pages/Profile'
import { AdminUsers } from './pages/AdminUsers'
import { RolesMatrix } from './pages/RolesMatrix'
import { Notifications } from './pages/Notifications'
import { PublishingDetails } from './components/PublishingDetails'
import { api, allPages } from './api'
import { postCampaign, platformName, scheduledInstant, localFields } from './postUtils'

function savedUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null') || {} } catch { return {} }
}
function App() {
  const [user, setUser] = useState(savedUser)
  const [email, setEmail] = useState(user.email || '')
  const [name, setName] = useState(user.name || '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('token'))
  const [activePage, setActivePage] = useState('overview')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [posts, setPosts] = useState([])
  const [jobs, setJobs] = useState([])
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [campaignOptions, setCampaignOptions] = useState([])
  const [campaignId, setCampaignId] = useState('')
  const [providers, setProviders] = useState([])
  const [loadingPlatform, setLoadingPlatform] = useState(null)
  const [workspaceError, setWorkspaceError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const mutation = useRef(false)
  const sessionVersion = useRef(0)
  const [loaded, setLoaded] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(0)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [platform, setPlatform] = useState('')
  const [content, setContent] = useState('')
  const [campaignDate, setCampaignDate] = useState('')
  const [campaignTime, setCampaignTime] = useState('')
  const [editId, setEditId] = useState(null)
  const [imageUrl, setImageUrl] = useState('')
  const [accountIds, setAccountIds] = useState([])
  const [recurrence, setRecurrence] = useState('none')
  const [occurrences, setOccurrences] = useState(1)
  const [formError, setFormError] = useState('')
  const [detailsId, setDetailsId] = useState(null)
  const currentRole = getRoleConfig(user.role).id
  const roleConfig = getRoleConfig(currentRole)
  const activeNavItem = activePage === 'profile' ? { id: 'profile', label: 'Profile', page: 'profile' } : roleConfig.nav.find(item => item.id === activePage)
  const canCreateCampaign = [ROLES.CONTENT_CREATOR, ROLES.MARKETING_MANAGER, ROLES.ADMINISTRATOR].includes(currentRole)
  const campaigns = posts.map(post => postCampaign(post, jobs))
  const notifications = jobs
    .filter(job => ['published', 'failed', 'uncertain'].includes(job.status) || (['scheduled', 'retry'].includes(job.status) && new Date(job.scheduled_at) - refreshedAt < 24 * 3600 * 1000))
    .map(job => {
      const title = posts.find(p => p.id === job.post_id)?.title || `Post ${job.post_id}`
      const where = platformName(job.provider)
      const when = new Date(job.scheduled_at)
      const text = { published: [`Published on ${where}`, 'success'], failed: [`Failed on ${where}`, 'danger'], uncertain: [`Needs review on ${where}`, 'danger'], retry: [`Retrying on ${where}`, 'pending'], scheduled: [`Going out on ${where}`, 'pending'] }[job.status]
      return { id: job.id, postId: job.post_id, title: `“${title}” — ${text[0]}`, detail: job.error && job.status !== 'published' ? job.error : when.toLocaleString(), tone: text[1], at: job.scheduled_at }
    })
    .sort((a, b) => new Date(b.at) - new Date(a.at))

  const refresh = useCallback(async signal => {
    const version = sessionVersion.current
    const [nextPosts, nextJobs, accounts, configs, me, campaignList] = await Promise.all([
      allPages('/posts', signal), allPages('/queue', signal), api('/accounts', { signal }), api('/oauth/providers', { signal }), api('/me', { signal }),
      api('/campaigns', { signal }).catch(() => []),
    ])
    if (signal?.aborted || version !== sessionVersion.current) return
    setPosts(nextPosts); setJobs(nextJobs); setConnectedAccounts(accounts); setProviders(configs)
    setCampaignOptions(campaignList.map(({ id, name, status, phase }) => ({ id, name, status, phase })))
    setUser(me); localStorage.setItem('user', JSON.stringify(me))
    setWorkspaceError(''); setLoaded(true); setRefreshedAt(Date.now())
  }, [])
  const handleLogout = useCallback(() => {
    sessionVersion.current += 1
    localStorage.removeItem('token'); localStorage.removeItem('user')
    setIsLoggedIn(false); setPosts([]); setJobs([]); setConnectedAccounts([]); setProviders([]); setCampaignOptions([])
    setPassword(''); setConfirmPassword(''); setShowCampaignForm(false); setDetailsId(null)
    setLoaded(false); setActivePage('overview'); setNotice(''); setWorkspaceError('')
  }, [])
  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])
  useEffect(() => {
    const expired = () => { handleLogout(); setAuthError('Your session expired. Please sign in again.') }
    window.addEventListener('session-expired', expired)
    return () => window.removeEventListener('session-expired', expired)
  }, [handleLogout])
  useEffect(() => {
    if (!isLoggedIn) return
    const controller = new AbortController()
    let running = false
    const reload = async () => {
      if (running) return
      running = true
      try { await refresh(controller.signal) } catch (error) { if (!controller.signal.aborted) setWorkspaceError(error.message) }
      finally { running = false }
    }
    reload()
    const timer = setInterval(reload, 15000)
    window.addEventListener('focus', reload)
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener('focus', reload) }
  }, [isLoggedIn, refresh])
  const resetForm = () => {
    setEditId(null); setCampaignName(''); setPlatform(''); setContent(''); setCampaignDate(''); setCampaignTime('')
    setImageUrl(''); setAccountIds([]); setRecurrence('none'); setOccurrences(1); setFormError(''); setCampaignId('')
  }
  const openCampaignForm = () => {
    if (!canCreateCampaign || !loaded) return
    resetForm(); setShowCampaignForm(true); setActivePage('campaigns')
  }
  const editCampaign = index => {
    const post = campaigns[index]
    if (!post || !canCreateCampaign) return
    if (post.status !== 'draft') { setDetailsId(post.id); return }
    resetForm(); setEditId(post.id); setCampaignName(post.name); setContent(post.content)
    setPlatform(platformName(post.platform)); setImageUrl(post.image_url || '')
    setAccountIds(post.account_id ? [post.account_id] : []); setCampaignId(post.campaign_id ? String(post.campaign_id) : '')
    setShowCampaignForm(true); setActivePage('campaigns')
  }
  const mutate = async action => {
    if (mutation.current) return
    mutation.current = true; setBusy(true); setWorkspaceError(''); setNotice('')
    try {
      await action()
      try { await refresh() } catch { setWorkspaceError('Change saved, but refresh failed. Reload before making another change.') }
    } catch (error) { setWorkspaceError(error.message) }
    finally { mutation.current = false; setBusy(false) }
  }
  const deleteCampaign = index => {
    const post = campaigns[index]
    if (!post || !canCreateCampaign || post.status !== 'draft' || post.jobs.length) return
    if (!window.confirm(`Delete draft “${post.name}”?`)) return
    mutate(async () => { await api(`/posts/${post.id}`, { method: 'DELETE' }); setNotice('Draft deleted.') })
  }
  const saveCampaign = async (schedule = false) => {
    if (mutation.current || !canCreateCampaign) return
    setFormError('')
    let scheduledAt
    try {
      if (!campaignName.trim()) throw new Error('Enter a campaign name.')
      if (schedule) {
        if (!content.trim()) throw new Error('Add content before scheduling.')
        if (!accountIds.length) throw new Error('Select at least one authorized account.')
        scheduledAt = scheduledInstant(campaignDate, campaignTime)
      }
    } catch (error) { setFormError(error.message); return }
    mutation.current = true; setBusy(true)
    let saved = false
    try {
      const draft = await api(editId ? `/posts/${editId}` : '/posts', {
        method: editId ? 'PATCH' : 'POST',
        body: JSON.stringify({ title: campaignName.trim(), content, platform: platform ? platform.toLowerCase() : null, account_id: accountIds.length === 1 ? accountIds[0] : null, image_url: imageUrl.trim() || null, campaign_id: campaignId ? Number(campaignId) : null }),
      })
      saved = true; setEditId(draft.id)
      if (schedule) await api(`/posts/${draft.id}/schedule`, { method: 'POST', body: JSON.stringify({ scheduled_at: scheduledAt, timezone_name: Intl.DateTimeFormat().resolvedOptions().timeZone, account_ids: accountIds, recurrence, occurrences: recurrence === 'none' ? 1 : Number(occurrences) }) })
      setShowCampaignForm(false); setNotice(schedule ? 'Post scheduled. The publishing worker will process it when due.' : 'Draft saved.')
    } catch (error) { setFormError(`${saved ? 'Draft saved; scheduling failed. ' : ''}${error.message}`) }
    finally {
      try { await refresh() } catch { setWorkspaceError('Could not refresh posts. Your saved draft is retained; refresh to check its status.') }
      mutation.current = false; setBusy(false)
    }
  }
  const connectAccount = async platform => {
    if (loadingPlatform || !canCreateCampaign) return
    const popup = window.open('about:blank', 'socialpilot-oauth')
    if (!popup) { setWorkspaceError('Allow pop-ups to authorize your account.'); return }
    popup.opener = null
    setLoadingPlatform(platform); setWorkspaceError('')
    try {
      const result = await api(`/oauth/${platform.toLowerCase()}/authorize`, { method: 'POST' })
      popup.location.href = result.authorization_url
      setNotice('Complete authorization in the new tab, then return here. Accounts refresh automatically.')
    } catch (error) { popup.close(); setWorkspaceError(error.message) }
    finally { setLoadingPlatform(null) }
  }
  const disconnectAccount = account => {
    if (!canCreateCampaign || !window.confirm(`Disconnect ${account.account_name}? Pending posts for this account will be cancelled.`)) return
    mutate(async () => { await api(`/accounts/${account.id}`, { method: 'DELETE' }); setNotice('Account disconnected.') })
  }
  const handleAuthSubmit = async event => {
    event.preventDefault(); setAuthError(''); setAuthLoading(true)
    try {
      if (isRegister) {
        if (password !== confirmPassword) throw new Error('Passwords do not match')
        await api('/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
        setIsRegister(false); setPassword(''); setConfirmPassword(''); setAuthError('Registration successful. Please sign in.')
      } else {
        const data = await api('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
        sessionVersion.current += 1
        localStorage.setItem('token', data.access_token); localStorage.setItem('user', JSON.stringify(data.user))
        setUser(data.user); setEmail(data.user.email); setName(data.user.name); setIsLoggedIn(true); setPassword('')
      }
    } catch (error) { setAuthError(error.message) }
    finally { setAuthLoading(false) }
  }
  const handlePageNavigate = page => {
    const item = roleConfig.nav.find(item => item.id === page || item.page === page)
    if (item) setActivePage(item.id)
  }
  if (!isLoggedIn) return <Auth {...{ email, setEmail, name, setName, password, setPassword, confirmPassword, setConfirmPassword, isRegister, setIsRegister }} onSubmit={handleAuthSubmit} isLoading={authLoading} errorMessage={authError} />
  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={item => setActivePage(item.id)} currentRole={currentRole} onLogout={handleLogout} onOpenCreateCampaign={openCampaignForm} canCreateCampaign={canCreateCampaign && loaded} isMobileOpen={isMobileSidebarOpen} onCloseMobile={() => setIsMobileSidebarOpen(false)} />
      <div className="main-viewport">
        <Header activePage={activePage} pageTitle={activeNavItem?.label || 'Overview'} userName={user.name} userEmail={user.email} currentRole={currentRole} onLogout={handleLogout} onOpenCreateCampaign={openCampaignForm} canCreateCampaign={canCreateCampaign && loaded} onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} notifications={loaded ? notifications.slice(0, 8) : []} onOpenProfile={() => setActivePage('profile')} onOpenNotification={n => setDetailsId(n.postId)} />
        <main className="page-wrapper">
          {workspaceError && <div className="info-callout-card" role="alert">{workspaceError}<button className="btn btn-secondary" onClick={() => refresh().catch(error => setWorkspaceError(error.message))}>Refresh</button></div>}
          {notice && <div className="info-callout-card" role="status">{notice}<button className="btn btn-ghost" onClick={() => setNotice('')}>Dismiss</button></div>}
          {!loaded ? <p role="status">Loading your workspace…</p> : <>
            {activeNavItem?.page === 'dashboard' && <Dashboard name={user.name} campaigns={campaigns} connectedAccounts={connectedAccounts.filter(a => a.connected)} onOpenCreateCampaign={openCampaignForm} canCreateCampaign={canCreateCampaign} onNavigate={handlePageNavigate} onEditCampaign={index => setDetailsId(campaigns[index].id)} onRefresh={() => refresh().catch(error => setWorkspaceError(error.message))} />}
            {activeNavItem?.page === 'campaigns' && <Campaigns {...{ campaigns, showCampaignForm, campaignName, setCampaignName, platform, content, setContent, campaignDate, setCampaignDate, campaignTime, setCampaignTime, imageUrl, setImageUrl, accountIds, setAccountIds, recurrence, setRecurrence, occurrences, setOccurrences, connectedAccounts, busy, formError, canCreateCampaign, campaignOptions, campaignId, setCampaignId }} setPlatform={value => { setPlatform(value); setAccountIds([]) }} setShowCampaignForm={openCampaignForm} editIndex={editId} onSaveCampaign={saveCampaign} onCancelForm={() => { if (!busy) setShowCampaignForm(false) }} onEditCampaign={editCampaign} onDeleteCampaign={deleteCampaign} onDetails={setDetailsId} />}
            {activeNavItem?.page === 'schedule' && <Schedule campaigns={jobs.map(job => ({ ...job, name: posts.find(p => p.id === job.post_id)?.title || `Post ${job.post_id}`, account_name: connectedAccounts.find(a => a.id === job.account_id)?.account_name, platform: platformName(job.provider), ...localFields(job.scheduled_at) }))} onOpenCreateCampaign={canCreateCampaign ? openCampaignForm : undefined} onEditCampaign={index => setDetailsId(jobs[index].post_id)} initialView={activePage === 'calendar' ? 'calendar' : 'list'} onViewChange={view => setActivePage(view === 'calendar' ? 'calendar' : 'schedule')} />}
            {activeNavItem?.page === 'accounts' && <Accounts {...{ connectedAccounts, providers, loadingPlatform }} canManage={canCreateCampaign && !busy} onConnectAccount={connectAccount} onDisconnectAccount={disconnectAccount} />}
            {activeNavItem?.page === 'analytics' && <Analytics canRefresh={canCreateCampaign} />}
            {activeNavItem?.page === 'engagement' && <Engagement canManage={canCreateCampaign} />}
            {activeNavItem?.page === 'campaignHub' && <CampaignHub canManage={canCreateCampaign} posts={posts} onChanged={() => refresh().catch(error => setWorkspaceError(error.message))} />}
            {activeNavItem?.page === 'reports' && <Reports canManage={canCreateCampaign} />}
            {activeNavItem?.page === 'profile' && <Profile user={user} onUpdated={updated => { const next = { ...user, ...updated }; setUser(next); localStorage.setItem('user', JSON.stringify(next)) }} />}
            {activeNavItem?.page === 'adminUsers' && <AdminUsers currentUserId={user.id} />}
            {activeNavItem?.page === 'rolesMatrix' && <RolesMatrix />}
            {activeNavItem?.page === 'notifications' && <Notifications notifications={notifications} onOpen={n => setDetailsId(n.postId)} />}
            {activeNavItem?.page === 'placeholder' && <PlaceholderPage title={activeNavItem.title} description={activeNavItem.description} onNavigateOverview={() => setActivePage('overview')} />}
          </>}
          {detailsId !== null && <PublishingDetails post={campaigns.find(p => p.id === detailsId)} busy={busy} canManage={canCreateCampaign} onClose={() => setDetailsId(null)} onEdit={id => { setDetailsId(null); editCampaign(campaigns.findIndex(p => p.id === id)) }} campaignOptions={campaignOptions} onCampaignChange={(id, value) => mutate(async () => { await api(`/posts/${id}/campaign`, { method: 'PATCH', body: JSON.stringify({ campaign_id: value }) }); setNotice(value ? 'Post added to campaign.' : 'Post removed from campaign.') })} onAction={(path, body) => mutate(async () => { await api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }); setNotice('Post updated.') })} />}
        </main>
      </div>
    </div>
  )
}
export default App

