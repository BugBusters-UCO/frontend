"use client";

import Link from "next/link";
import { ThemeToggle } from "@/shared/ui/molecules/ThemeToggle";
import { useChatbot } from "@/features/chatbot/ChatbotContext";
import { useAuth } from "@/shared/lib/AuthContext";

interface TopbarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function Topbar({ toggleSidebar, isSidebarOpen }: TopbarProps) {
  const { toggle: toggleChatbot, isOpen: isChatbotOpen } = useChatbot();
  const { user } = useAuth();

  const handleLookIntoFuture = () => {
    if (!user) return;
    const email = user.email;
    const password = localStorage.getItem("cached_pass");
    if (email && password) {
      const data = JSON.stringify({ email, password });
      const token = btoa(data);
      const fallback = encodeURIComponent(window.location.origin);
      window.open(`https://post.bugbusters.satishdev.in/login?token=${token}&fallback=${fallback}`, "_blank");
    } else {
      alert("Please login again to use this feature.");
    }
  };

  return (
    <header className="bg-background/80 backdrop-blur-xl text-text-primary w-full z-50 flex justify-between items-center px-page-margin h-16 shrink-0 border-b border-border-subtle shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors duration-300">
      <div className="flex items-center gap-element-gap pl-4">

        
        <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(31,111,235,0.15)] dark:bg-primary/20 dark:border-primary/30 dark:shadow-[0_0_15px_rgba(31,111,235,0.2)]">
          <span className="material-symbols-outlined text-lg">security</span>
        </div>
        <div>
          <Link href="/">
            <h2 className="text-section-header font-sans font-bold tracking-wider text-text-primary cursor-pointer hover:text-primary transition-colors duration-200">
              BUGBUSTERS
            </h2>
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-4 pr-4">
        {user && (
          <button 
            onClick={handleLookIntoFuture}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary text-white shadow-[0_0_15px_rgba(31,111,235,0.3)] hover:bg-primary/90 transition-all font-bold text-xs tracking-wider uppercase"
          >
            <span>Advanced Security</span>
          </button>
        )}
        <ThemeToggle />
        
        <button
          onClick={toggleChatbot}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            isChatbotOpen 
              ? "bg-primary text-white border-primary shadow-[0_0_15px_rgba(31,111,235,0.3)]" 
              : "bg-surface text-text-secondary border-border-subtle hover:bg-surface-dim hover:text-text-primary"
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isChatbotOpen ? "chat_bubble" : "chat"}
          </span>
          <span className="font-bold text-xs tracking-wider uppercase hidden @sm:block">AI</span>
        </button>
      </div>
    </header>
  );
}
