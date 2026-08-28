import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Landing from '@/pages/Landing';
import SignIn from '@/pages/SignIn';
import SignUp from '@/pages/SignUp';
import AppLayout from '@/layouts/AppLayout';
import AdminLayout from '@/layouts/AdminLayout';
import Dashboard from '@/pages/Dashboard';
import CalendarPage from '@/pages/CalendarPage';
import CreatePost from '@/pages/CreatePost';
import Campaigns from '@/pages/Campaigns';
import SocialAccounts from '@/pages/SocialAccounts';
import Analytics from '@/pages/Analytics';
import MediaLibrary from '@/pages/MediaLibrary';
import Notifications from '@/pages/Notifications';
import Settings from '@/pages/Settings';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminSettings from '@/pages/admin/AdminSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Creator app (authenticated, any role) */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="create" element={<CreatePost />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="accounts" element={<SocialAccounts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Admin app (authenticated, admin role only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
