import { Routes, Route } from "react-router-dom";

import HomePage from "../pages/HomePage";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";
import UpdateProfilePage from "../pages/UpdateProfilePage";
import DashboardPage from "../pages/DashboardPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminUsersPage from "../pages/AdminUsersPage";
import CreatePostPage from "../pages/CreatePostPage";
import CalendarPage from "../pages/CalendarPage";
import SocialAccountsPage from "../pages/SocialAccountsPage";
import CampaignsPage from "../pages/CampaignsPage";
import AnalyticsPage from "../pages/AnalyticsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/profile/update" element={<UpdateProfilePage />} />

      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />

      <Route path="/create-post" element={<CreatePostPage />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/social-accounts" element={<SocialAccountsPage />} />

      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
    </Routes>
  );
}