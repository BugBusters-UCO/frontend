import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

import { ClientLayoutShell } from "@/widgets/LayoutShell/ClientLayoutShell";
import { AuthProvider } from "@/shared/lib/AuthContext";
import { ReactQueryProvider } from "@/shared/lib/ReactQueryProvider";
import { ThemeProvider } from "@/shared/lib/ThemeProvider";
import { ChatbotProvider } from "@/features/chatbot/ChatbotContext";

export const metadata: Metadata = {
  title: "BugBusters",
  description: "Comprehensive security scanning for your codebase",
  icons: {
    icon: '/icon-uco.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-background text-text-primary font-body-sm h-screen flex overflow-hidden transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ReactQueryProvider>
            <AuthProvider>
              <ChatbotProvider>
                <ClientLayoutShell>
                  {children}
                </ClientLayoutShell>
              </ChatbotProvider>
            </AuthProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
