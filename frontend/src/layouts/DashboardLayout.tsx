import React, { useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import ToastContainer from "../components/ToastContainer";
import CreatePostModal from "../components/CreatePostModal";

export default function DashboardLayout() {
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
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
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Dynamic Dark Accent Sidebar */}
      <Sidebar onOpenCreatePost={() => setIsCreateOpen(true)} />

      {/* Main Content Area in Light SaaS Theme */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <Navbar />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto space-y-6">
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