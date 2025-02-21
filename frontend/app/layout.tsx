import type { Metadata } from "next";
import { cookies } from "next/headers"
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ChatProvider } from "@/contexts/chat-context"
import ErrorBoundary from '@/components/error-boundary'

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Le Potato",
  description: "Le Potato 2025 version",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <ChatProvider>
              <SidebarProvider defaultOpen={defaultOpen}>
                {children}
              </SidebarProvider>
            </ChatProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
