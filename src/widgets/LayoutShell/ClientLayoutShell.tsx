"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";
import { ChatbotPanel } from "@/widgets/ChatbotPanel/ChatbotPanel";
import { useChatbot } from "@/features/chatbot/ChatbotContext";

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isOpen, panelWidth } = useChatbot();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return (
      <main className="w-full h-full overflow-y-auto bg-surface">
        {children}
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Topbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
        
        <main 
          className="flex-1 overflow-y-auto bg-surface p-page-margin transition-all duration-0 @container"
          style={{ marginRight: isOpen ? `${panelWidth}vw` : '0px' }}
        >
          {children}
        </main>
        
        {/* Chatbot Panel */}
        <ChatbotPanel />
      </div>
    </div>
  );
}
