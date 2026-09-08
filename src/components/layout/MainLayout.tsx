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
import { GlobalApiLoadingBar } from "./GlobalApiLoadingBar";

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
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <Header onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <div className="pointer-events-none absolute left-0 right-0 top-16 z-30">
          <GlobalApiLoadingBar />
        </div>

        {/* Content - Dynamic (Outlet renders child routes here) */}
        <main className="flex-1 overflow-auto flex flex-col w-full h-full">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
      <ImportModal />
      
    </div>
  );
};
