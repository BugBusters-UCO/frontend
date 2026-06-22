"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Topbar } from "./Topbar";
import { Sidebar } from "./Sidebar";

export function ClientLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isAuthPage) {
    return (
      <main className="w-full h-full overflow-y-auto bg-surface">
        {children}
      </main>
    );
  }

  return (
    <>
      <Topbar />
      <div className="flex pt-16 w-full h-full">
        <Sidebar />
        <main className="ml-64 flex-1 h-[calc(100vh-4rem)] overflow-y-auto bg-surface p-page-margin">
          {children}
        </main>
      </div>
    </>
  );
}
