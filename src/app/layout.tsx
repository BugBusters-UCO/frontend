import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

import { ClientLayoutShell } from "@/widgets/LayoutShell/ClientLayoutShell";
import { AuthProvider } from "@/shared/lib/AuthContext";

export const metadata: Metadata = {
  title: "BugBusters Security Platform",
  description: "Comprehensive security scanning for your codebase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased light`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-text-primary font-body-sm h-screen flex overflow-hidden">
        <AuthProvider>
          <ClientLayoutShell>
            {children}
          </ClientLayoutShell>
        </AuthProvider>
      </body>
    </html>
  );
}
