import React, { useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastContainer from "../components/ToastContainer";
import CreatePostModal from "../components/CreatePostModal";

export default function DashboardLayout() {
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Support ?action=create query param trigger
  React.useEffect(() => {
    if (searchParams.get("action") === "create") {
      setIsCreateOpen(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* Sidebar with mobile toggle support */}
      <Sidebar
        onOpenCreatePost={() => setIsCreateOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F8FAFC]">
        <Navbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 bg-[#F8FAFC]">
          <div className="max-w-[1400px] mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Modals & Toasts */}
      <ToastContainer />
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => {
          // Trigger refresh event
          window.dispatchEvent(new Event("post_created"));
        }}
      />
    </div>
  );
}