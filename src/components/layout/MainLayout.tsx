/**
 * File: src/components/layout/MainLayout.tsx
 * Main application layout with Header, Sidebar, and Outlet
 */

import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "../ui/ToastContainer";
import { ImportModal } from "@/lib/db";

export const MainLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#FAFBFC]">
      {/* Sidebar - Fixed */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <Header onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Content - Dynamic (Outlet renders child routes here) */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <ImportModal />
    </div>
  );
};
