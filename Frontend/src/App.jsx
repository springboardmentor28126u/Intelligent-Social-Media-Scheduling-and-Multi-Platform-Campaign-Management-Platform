import { useState, useEffect } from 'react'
import './App.css'

/* --------------------------------------------------------------------------
   Presentational icon set — inline SVG, zero dependencies.
   These components are purely visual and hold no application logic.
   -------------------------------------------------------------------------- */
const Svg = ({ children, size = 20, filled = false, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
)

const IconLogo = (p) => (
  <Svg {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </Svg>
)
const IconDashboard = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </Svg>
)
const IconCampaigns = (p) => (
  <Svg {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h3l6 4V5L8 9H5a1 1 0 0 0-1 1Z" />
    <path d="M17.5 9a3.5 3.5 0 0 1 0 6" />
  </Svg>
)
const IconSchedule = (p) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 3v3M16 3v3" />
  </Svg>
)
const IconAccounts = (p) => (
  <Svg {...p}>
    <path d="M16 19v-1.4a3.6 3.6 0 0 0-3.6-3.6H7.6A3.6 3.6 0 0 0 4 17.6V19" />
    <circle cx="10" cy="8" r="3.2" />
    <path d="M20 19v-1.4a3.6 3.6 0 0 0-2.7-3.5M15.5 5a3.2 3.2 0 0 1 0 6" />
  </Svg>
)
const IconAnalytics = (p) => (
  <Svg {...p}>
    <path d="M4 20h16M4 20V4" />
    <rect x="7.5" y="11" width="3" height="6" rx="0.6" />
    <rect x="12.5" y="7" width="3" height="10" rx="0.6" />
    <rect x="17.5" y="13" width="3" height="4" rx="0.6" />
  </Svg>
)
const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5M21 12H9" />
  </Svg>
)
const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)
const IconCalendar = (p) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
    <path d="M3 9.5h18M8 3v3M16 3v3" />
  </Svg>
)
const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)
const IconCheck = (p) => (
  <Svg {...p}>
    <path d="M20 6 9 17l-5-5" />
  </Svg>
)
const IconLink = (p) => (
  <Svg {...p}>
    <path d="M10.5 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
    <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
  </Svg>
)
const IconLayers = (p) => (
  <Svg {...p}>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="M3.5 12 12 16.7 20.5 12M3.5 16 12 20.7 20.5 16" />
  </Svg>
)
const IconSend = (p) => (
  <Svg {...p}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
  </Svg>
)
const IconEdit = (p) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Svg>
)
const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
)
const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5.5 5h13l2.5 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z" />
  </Svg>
)
const IconInstagram = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5.2" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)
const IconFacebook = (p) => (
  <Svg filled {...p}>
    <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.8 3.8-3.8 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
  </Svg>
)
const IconLinkedIn = (p) => (
  <Svg filled {...p}>
    <path d="M20.4 3H3.6C3.3 3 3 3.3 3 3.6v16.8c0 .3.3.6.6.6h16.8c.3 0 .6-.3.6-.6V3.6c0-.3-.3-.6-.6-.6ZM8.3 18.3H5.7V9.8h2.6v8.5ZM7 8.6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm11.3 9.7h-2.6v-4.1c0-1 0-2.3-1.4-2.3s-1.6 1.1-1.6 2.2v4.2h-2.6V9.8h2.5v1.2h.05c.35-.66 1.2-1.36 2.45-1.36 2.7 0 3.2 1.75 3.2 4v4.66Z" />
  </Svg>
)
const IconX = (p) => (
  <Svg filled {...p}>
    <path d="M18.9 3H21l-6.6 7.6L22 21h-6.2l-4.3-5.6L6.5 21H4l7-8.1L3.5 3h6.3l3.9 5.1L18.9 3Zm-1.1 16h1.2L8.3 5H7l10.8 14Z" />
  </Svg>
)

const PlatformGlyph = ({ platform }) => {
  if (platform === 'Instagram') return <IconInstagram />
  if (platform === 'Facebook') return <IconFacebook />
  if (platform === 'LinkedIn') return <IconLinkedIn />
  if (platform === 'X') return <IconX />
  return null
}

function App() {
  const [email, setEmail] = useState(() => {
  const savedUser = JSON.parse(localStorage.getItem('user') || 'null')
  return savedUser?.email || ''
  })

const [name, setName] = useState(() => {
  const savedUser = JSON.parse(localStorage.getItem('user') || 'null')
  return savedUser?.name || ''
  })
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
 const [isLoggedIn, setIsLoggedIn] = useState(() => {
  return !!localStorage.getItem('token')
  })
  const [activePage, setActivePage] = useState('dashboard')
  const [showCampaignForm, setShowCampaignForm] = useState(false)

  const [campaignName, setCampaignName] = useState('')
  const [platform, setPlatform] = useState('')
  const [content, setContent] = useState('')
  const [campaignDate, setCampaignDate] = useState('')
  const [campaignTime, setCampaignTime] = useState('')
  const [editIndex, setEditIndex] = useState(null)
  const [campaigns, setCampaigns] = useState(() => {
  const savedCampaigns = localStorage.getItem('campaigns')

  return savedCampaigns ? JSON.parse(savedCampaigns) : []
})
const [connectedAccounts, setConnectedAccounts] = useState([])
useEffect(() => {
  const loadAccounts = async () => {
    const token = localStorage.getItem('token')

    if (!token || !isLoggedIn) {
      return
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      setConnectedAccounts(data)
    } catch (error) {
      console.error(error)
    }
  }

  loadAccounts()
}, [isLoggedIn])
const connectAccount = async (platform) => {
  const token = localStorage.getItem('token')

  try {
    const response = await fetch('http://127.0.0.1:8000/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        platform: platform,
        account_name: `${platform} Account`
      })
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.detail || 'Failed to connect account')
      return
    }

    setConnectedAccounts(prev => [...prev, data])

    alert(`${platform} connected successfully`)
  } catch (error) {
    console.error(error)
    alert('Cannot connect to backend')
  }
}
const isAccountConnected = (platform) => {
  return connectedAccounts.some(
    account => account.platform === platform
  )
}
const disconnectAccount = async (platform) => {
  const token = localStorage.getItem('token')

  const account = connectedAccounts.find(
    account => account.platform === platform
  )

  if (!account) {
    return
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:8000/accounts/${account.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      alert(data.detail || 'Failed to disconnect account')
      return
    }

    setConnectedAccounts(prev =>
      prev.filter(item => item.id !== account.id)
    )

    alert(`${platform} disconnected successfully`)
  } catch (error) {
    console.error(error)
    alert('Cannot connect to backend')
  }
}
const deleteCampaign = (index) => {
  const updatedCampaigns = campaigns.filter((_, i) => i !== index)

  setCampaigns(updatedCampaigns)

  localStorage.setItem(
    'campaigns',
    JSON.stringify(updatedCampaigns)
  )
}
const editCampaign = (index) => {
  const campaign = campaigns[index]

  setCampaignName(campaign.name)
  setPlatform(campaign.platform)
  setContent(campaign.content)
  setCampaignDate(campaign.date)
  setCampaignTime(campaign.time)

  setEditIndex(index)
  setShowCampaignForm(true)
  setActivePage('campaigns')
}
  const handleSaveCampaign = () => {
  if (
    campaignName === '' ||
    platform === '' ||
    content === '' ||
    campaignDate === '' ||
    campaignTime === ''
  ) {
    alert('Please fill all campaign fields')
    return
  }

  const newCampaign = {
    name: campaignName,
    platform: platform,
    content: content,
    date: campaignDate,
    time: campaignTime
  }
 let updatedCampaigns
  if (editIndex !== null) {
    updatedCampaigns = [...campaigns]
    updatedCampaigns[editIndex] = newCampaign
  } else {
    updatedCampaigns = [...campaigns, newCampaign]
  }

  setCampaigns(updatedCampaigns)

  localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns))

  alert('Campaign saved successfully')
  setEditIndex(null)

  setCampaignName('')
  setPlatform('')
  setContent('')
  setCampaignDate('')
  setCampaignTime('')
  setShowCampaignForm(false)
}
const handleLogin = async (e) => {
  e.preventDefault()

  try {
    if (isRegister) {
      if (password !== confirmPassword) {
        alert('Passwords do not match')
        return
      }

      const response = await fetch('http://127.0.0.1:8000/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.detail || 'Registration failed')
        return
      }

      alert('Registration successful! Please login.')

      setIsRegister(false)
      setPassword('')
      setConfirmPassword('')
      return
    }

    const response = await fetch('http://127.0.0.1:8000/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    })

    const data = await response.json()

    if (!response.ok) {
      alert(data.detail || 'Invalid email or password')
      return
    }

    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))

    setIsLoggedIn(true)

  } catch (error) {
    console.error(error)
    alert('Cannot connect to backend')
  }
}
if (isLoggedIn) {
  return (
    <div className="dashboard-layout">

      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark"><IconLogo /></span>
          <h2>SocialPilot</h2>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-label">Menu</span>

          <p
            className={activePage === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('dashboard')}
          >
            <IconDashboard /><span>Dashboard</span>
          </p>

          <p
            className={activePage === 'campaigns' ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              console.log("Campaigns clicked")
              setActivePage('campaigns')
            }}
          >
            <IconCampaigns /><span>Campaigns</span>
          </p>

          <p
            className={activePage === 'schedule' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('schedule')}
          >
            <IconSchedule /><span>Schedule</span>
          </p>

          <p
            className={activePage === 'accounts' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('accounts')}
          >
            <IconAccounts /><span>Accounts</span>
          </p>

          <p
            className={activePage === 'analytics' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('analytics')}
          >
            <IconAnalytics /><span>Analytics</span>
          </p>
        </nav>

        <button
            className="logout-btn"
            onClick={() => {
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              setConnectedAccounts([])
              setIsLoggedIn(false)
            }}
          >
          <IconLogout />
          <span>Logout</span>
        </button>
      </aside>

     <main className="dashboard-main">

      <header className="topbar">
        <div className="breadcrumb">
          <span className="crumb-root">SocialPilot</span>
          <span className="sep">/</span>
          <span className="crumb-current">{activePage}</span>
        </div>

        <div className="user-chip">
          <span className="avatar">{(name || 'User').charAt(0).toUpperCase()}</span>
          <span className="who">
            <span className="u-name">{name || 'User'}</span>
            <span className="u-role">{email || 'Member'}</span>
          </span>
        </div>
      </header>

      <div className="page-content">
      {activePage === 'analytics' && (
  <>
    <h1>Analytics</h1>
    <p>Track your social media campaign performance.</p>

    <div className="stats-container">

      <div className="stat-card">
        <div className="stat-icon"><IconLayers /></div>
        <div className="stat-body">
          <h3>Total Campaigns</h3>
          <h2>{campaigns.length}</h2>
        </div>
      </div>

      <div className="stat-card accent-teal">
        <div className="stat-icon"><IconLink /></div>
        <div className="stat-body">
          <h3>Connected Accounts</h3>
          <h2>{connectedAccounts.length}</h2>
        </div>
      </div>

      <div className="stat-card accent-violet">
        <div className="stat-icon"><IconSend /></div>
        <div className="stat-body">
          <h3>Total Posts</h3>
          <h2>{campaigns.length}</h2>
        </div>
      </div>

    </div>
  </>
)}


  {activePage === 'dashboard' && (
    <>
      <h1>Dashboard Overview</h1>
      <p>Welcome, {name || "User"}!</p>

      <div className="stats-container">

        <div className="stat-card">
          <div className="stat-icon"><IconLayers /></div>
          <div className="stat-body">
            <h3>Total Campaigns</h3>
            <h2>{campaigns.length}</h2>
          </div>
        </div>

        <div className="stat-card accent-amber">
          <div className="stat-icon"><IconSchedule /></div>
          <div className="stat-body">
            <h3>Scheduled Posts</h3>
            <h2>0</h2>
          </div>
        </div>

        <div className="stat-card accent-teal">
          <div className="stat-icon"><IconLink /></div>
          <div className="stat-body">
            <h3>Connected Accounts</h3>
            <h2>{connectedAccounts.length}</h2>
          </div>
        </div>

            </div>
          </>
        )}

  {activePage === 'campaigns' && (
          <>
            <h1>Campaigns</h1>
            <p>Create and manage your social media campaigns here.</p>
             <button className="create-btn" onClick={() => setShowCampaignForm(true)}><IconPlus />Create Campaign</button>
             {showCampaignForm && (
                    <div className="campaign-form">
                      <h2>Create New Campaign</h2>

                    <div className="form-group">
                      <label>Campaign name</label>
                      <input
                        type="text"
                        placeholder="Campaign Name"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Platform</label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                      >
                        <option value="">Select Platform</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="X">X</option>
                      </select>
                    </div>

                    <div className="form-group full">
                      <label>Post content</label>
                      <textarea
                        placeholder="Write your post content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      ></textarea>
                    </div>

                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={campaignDate}
                        onChange={(e) => setCampaignDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Time</label>
                      <input
                        type="time"
                        value={campaignTime}
                        onChange={(e) => setCampaignTime(e.target.value)}
                      />
                    </div>

                    <button onClick={handleSaveCampaign}>Save Campaign</button>
                    </div>
                  )}
                  <div className="campaign-list">
                    <h2>Saved Campaigns</h2>

                    <div className="card-grid">
                    {campaigns.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-ico"><IconInbox /></div>
                        No campaigns created yet.
                      </div>
                    ) : (
                      campaigns.map((campaign, index) => (
                        <div className="campaign-card" key={index}>
                          <div className="card-head">
                            <h3>{campaign.name}</h3>
                            <span className={'badge badge-' + campaign.platform.toLowerCase()}>
                              <PlatformGlyph platform={campaign.platform} />
                              {campaign.platform}
                            </span>
                          </div>
                          <p className="card-content">{campaign.content}</p>
                          <div className="card-meta">
                            <span className="meta"><IconCalendar />{campaign.date}</span>
                            <span className="meta"><IconClock />{campaign.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                    </div>
                  </div>
          </>
        )}

  {activePage === 'schedule' && (
          <>
            <h1>Schedule</h1>
            <p>View your scheduled social media posts here.</p>
            <div className="schedule-list">
                <h2>Upcoming Posts</h2>

                <div className="card-grid">
                {campaigns.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-ico"><IconInbox /></div>
                    No scheduled posts yet.
                  </div>
                ) : (
                  campaigns.map((campaign, index) => (
                    <div className="schedule-card" key={index}>
                      <div className="card-head">
                        <h3>{campaign.name}</h3>
                        <span className="status-badge"><span className="dot"></span>Scheduled</span>
                      </div>
                      <div className="platform-row">
                        <span className={'badge badge-' + campaign.platform.toLowerCase()}>
                          <PlatformGlyph platform={campaign.platform} />
                          {campaign.platform}
                        </span>
                      </div>
                      <p className="card-content">{campaign.content}</p>
                      <div className="card-meta">
                        <span className="meta"><IconCalendar />{campaign.date}</span>
                        <span className="meta"><IconClock />{campaign.time}</span>
                      </div>
                      <div className="card-actions">
                        <button className="btn-ghost" onClick={() => editCampaign(index)}>
                          <IconEdit />Edit
                        </button>
                        <button className="btn-danger" onClick={() => deleteCampaign(index)}>
                          <IconTrash />Delete
                        </button>
                      </div>
                    </div>
    ))
              )}
                </div>
            </div>
          </>
        )}
  {activePage === 'accounts' && (
    <>
      <h1>Connected Accounts</h1>
      <p>Connect your social media accounts here.</p>

      <div className="accounts-list">
        <div className="account-card">
          <div className="platform-icon pi-instagram"><IconInstagram /></div>
          <h3>Instagram</h3>
          <button
            className={isAccountConnected('Instagram') ? 'connect-btn connected' : 'connect-btn'}
            onClick={() =>
              isAccountConnected('Instagram')
                ? disconnectAccount('Instagram')
                : connectAccount('Instagram')
            }
          >
            {isAccountConnected('Instagram') ? 'Connected ✓' : 'Connect'}
          </button>
        </div>

        <div className="account-card">
          <div className="platform-icon pi-facebook"><IconFacebook /></div>
          <h3>Facebook</h3>
          <button
            className={isAccountConnected('Facebook') ? 'connect-btn connected' : 'connect-btn'}
            onClick={() =>
                isAccountConnected('Facebook')
                  ? disconnectAccount('Facebook')
                  : connectAccount('Facebook')
              }
          >
            {isAccountConnected('Facebook') ? 'Connected ✓' : 'Connect'}
          </button>
        </div>

        <div className="account-card">
          <div className="platform-icon pi-linkedin"><IconLinkedIn /></div>
          <h3>LinkedIn</h3>
          <button
            className={isAccountConnected('LinkedIn') ? 'connect-btn connected' : 'connect-btn'}
            onClick={() =>
                  isAccountConnected('LinkedIn')
                    ? disconnectAccount('LinkedIn')
                    : connectAccount('LinkedIn')
                }
          >
              {isAccountConnected('LinkedIn') ? 'Connected ✓' : 'Connect'}
            </button>
        </div>

        <div className="account-card">
          <div className="platform-icon pi-x"><IconX /></div>
          <h3>X</h3>
          <button
            className={isAccountConnected('X') ? 'connect-btn connected' : 'connect-btn'}
           onClick={() =>
                  isAccountConnected('X')
                    ? disconnectAccount('X')
                    : connectAccount('X')
                }
          >
            {isAccountConnected('X') ? 'Connected ✓' : 'Connect'}
          </button>
        </div>
      </div>
    </>
  )}
      </div>
</main>


    </div>
  )
}
  return (

    <div className="auth-page">
      <div className="auth-shell">

        <aside className="auth-hero">
          <div className="brand">
            <span className="brand-mark"><IconLogo /></span>
            SocialPilot
          </div>
          <h2>Plan, schedule, and grow your social presence.</h2>
          <p className="hero-sub">
            One calm dashboard for every campaign, post, and account — from first
            draft to published.
          </p>
          <ul className="auth-points">
            <li><span className="tick"><IconCheck /></span>Schedule posts across every network</li>
            <li><span className="tick"><IconCheck /></span>Track campaign performance at a glance</li>
            <li><span className="tick"><IconCheck /></span>Manage all your accounts in one place</li>
          </ul>
        </aside>

        <div className="auth-card">
          <h1>SocialPilot</h1>
          <p>{isRegister ? "Create your account" : "Welcome back"}</p>

          <form onSubmit={handleLogin}>
          {isRegister && (
  <>
              <label>Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}
          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
         <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isRegister && (
            <>
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </>
          )}

         <button type="submit">{isRegister ? "Register" : "Login"}</button>
        </form>

        <p className="register-text">
        {isRegister ? "Already have an account? " : "Don't have an account? "}

        <span onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Login" : "Register"}
        </span>
      </p>
        </div>
      </div>
    </div>
  )
}

export default App
