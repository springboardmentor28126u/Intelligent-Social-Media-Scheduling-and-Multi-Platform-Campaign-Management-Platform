import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WelcomeBanner from './components/WelcomeBanner';
import OverviewMetrics from './components/OverviewMetrics';
import UpcomingPosts from './components/UpcomingPosts';
import CampaignPerformance from './components/CampaignPerformance';
import ConnectedAccounts from './components/ConnectedAccounts';
import ActiveCampaigns from './components/ActiveCampaigns';
import MiniCalendar from './components/MiniCalendar';
import CreatePostModal from './components/CreatePostModal';
import Auth from './components/Auth';
import AdminUsers from './components/AdminUsers';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  const API_BASE = 'http://localhost:8000';

  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Token is invalid or expired');
        }

        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        console.error('Failed to authenticate:', err);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const handleAuthSuccess = (newToken) => {
    setToken(newToken);
    setLoading(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Full screen loading indicator
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans select-none">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-semibold text-slate-500">Checking credentials...</span>
      </div>
    );
  }

  // Not authenticated
  if (!token || !user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* 1. Sleek Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* 2. Top Header */}
        <Header onOpenCreateModal={() => setIsCreateModalOpen(true)} />

        {/* Dashboard Content Container */}
        <main className="p-6 md:p-8 max-w-[1500px] w-full mx-auto space-y-6">
          {activeTab === 'admin' && user?.role === 'Administrator' ? (
            <AdminUsers />
          ) : (
            <>
              {/* 3. Welcome Banner */}
              <WelcomeBanner
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onOpenScheduleModal={() => setIsCreateModalOpen(true)}
                user={user}
              />

              {/* 4. Overview Metrics Cards */}
              <OverviewMetrics />

              {/* 5. Grid Row: Upcoming Posts & Campaign Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Upcoming Posts (5 cols) */}
                <div className="lg:col-span-5" id="upcoming-posts">
                  <UpcomingPosts
                    onViewCalendar={() => scrollToSection('mini-calendar')}
                    onOpenCreateModal={() => setIsCreateModalOpen(true)}
                  />
                </div>

                {/* Campaign Performance Analytics Chart (7 cols) */}
                <div className="lg:col-span-7" id="campaign-performance">
                  <CampaignPerformance />
                </div>
              </div>

              {/* 6. Connected Social Accounts */}
              <div id="social-accounts">
                <ConnectedAccounts />
              </div>

              {/* 7. Active Campaigns */}
              <div id="active-campaigns">
                <ActiveCampaigns
                  onViewCampaign={() => scrollToSection('campaign-performance')}
                />
              </div>

              {/* 8. Mini Content Calendar */}
              <div id="mini-calendar">
                <MiniCalendar
                  onOpenCalendar={() => scrollToSection('upcoming-posts')}
                  onOpenCreateModal={() => setIsCreateModalOpen(true)}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* Quick Action Post Composer Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

export default App;

