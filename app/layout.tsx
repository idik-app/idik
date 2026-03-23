"use client";

import { useEffect } from "react";

/* ============================================================
   Autonomous Kernel v1 (Supervisor) + Kernel (opsional)
   ============================================================ */
import { AutonomousSupervisor } from "@/core/idik-autonomous/AutonomousSupervisor";
import { AutonomousKernelProvider } from "@/core/idik-autonomous/AutonomousKernelProvider";

/* ============================================================
   🌐 UI Providers
   ============================================================ */
import { EventBridgeProvider } from "@/contexts/EventBridgeContext";
import { DiagnosticsHUDProvider } from "@/contexts/DiagnosticsHUDContext";
import { JarvisFXProvider } from "@/contexts/JarvisFXContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UIProvider } from "@/contexts/UIContext";
import { TabProvider } from "@/contexts/TabContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AIProvider } from "@/contexts/AIContext";
import { SessionProvider } from "@/contexts/SessionContext";

import { IDIKModuleRegistry } from "@/core/registry/ModuleRegistry";
import "./globals.css";

import { Toaster } from "sonner";
import GlobalLogoutOverlay from "@/components/GlobalLogoutOverlay";
import UpdateBanner from "@/components/UpdateBanner";
import ConnectionNotify from "@/components/ConnectionNotify";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* ============================================================
     🧠 Aktifkan Autonomous Kernel v1 (Supervisor)
     ============================================================ */
  useEffect(() => {
    // Inisialisasi Supervisor (pengganti useAutonomousSupervisor)
    AutonomousSupervisor.init();

    // Inisialisasi modul
    void IDIKModuleRegistry.initializeAll();

    // Register Service Worker → hanya production
    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <html lang="id">
      <body>
        <EventBridgeProvider>
          <DiagnosticsHUDProvider>
            <AutonomousKernelProvider>
            <JarvisFXProvider>
              <NotificationProvider>
                <ConnectionNotify />
                <ThemeProvider>
                  <UIProvider>
                    <SessionProvider>
                      <TabProvider>
                        <AIProvider>
                          {children}
                          <GlobalLogoutOverlay />
                          <UpdateBanner />
                        </AIProvider>
                      </TabProvider>
                    </SessionProvider>
                  </UIProvider>
                </ThemeProvider>
              </NotificationProvider>
            </JarvisFXProvider>
            </AutonomousKernelProvider>

            <Toaster position="bottom-right" theme="dark" />
          </DiagnosticsHUDProvider>
        </EventBridgeProvider>
      </body>
    </html>
  );
}
