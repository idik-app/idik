"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";

import { AutonomousKernelProvider } from "@/core/idik-autonomous/AutonomousKernelProvider";

import { EventBridgeProvider } from "@/contexts/EventBridgeContext";
import { DiagnosticsHUDProvider } from "@/contexts/DiagnosticsHUDContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { TabProvider } from "@/contexts/TabContext";
import { SessionProvider } from "@/contexts/SessionContext";

import UpdateBanner from "@/components/UpdateBanner";
import ThemedToaster from "@/components/ThemedToaster";
import ConnectionNotify from "@/components/ConnectionNotify";

const AppDialogProvider = dynamic(
  () => import("@/contexts/AppDialogProvider").then((m) => m.AppDialogProvider),
  { ssr: false },
);

const JarvisFXProvider = dynamic(
  () => import("@/contexts/JarvisFXContext").then((m) => m.JarvisFXProvider),
  { ssr: false },
);

const UIProvider = dynamic(
  () => import("@/contexts/UIContext").then((m) => m.UIProvider),
  { ssr: false },
);

const NotificationProvider = dynamic(
  () =>
    import("@/contexts/NotificationContext").then((m) => m.NotificationProvider),
  { ssr: false },
);

const AIProvider = dynamic(
  () => import("@/contexts/AIContext").then((m) => m.AIProvider),
  { ssr: false },
);

const GlobalLogoutOverlay = dynamic(
  () => import("@/components/GlobalLogoutOverlay"),
  { ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Defer heavy app boot (Supabase, registry) from initial bundle.
    void (async () => {
      const [{ AutonomousSupervisor }, { IDIKModuleRegistry }] = await Promise.all([
        import("@/core/idik-autonomous/AutonomousSupervisor"),
        import("@/core/registry/ModuleRegistry"),
      ]);
      AutonomousSupervisor.init();
      void IDIKModuleRegistry.initializeAll();
    })();

    if (
      process.env.NODE_ENV === "production" &&
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <EventBridgeProvider>
      <DiagnosticsHUDProvider>
        <AutonomousKernelProvider>
          <JarvisFXProvider>
            <NotificationProvider>
              <AppDialogProvider>
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
                  <ThemedToaster />
                </ThemeProvider>
              </AppDialogProvider>
            </NotificationProvider>
          </JarvisFXProvider>
        </AutonomousKernelProvider>

      </DiagnosticsHUDProvider>
    </EventBridgeProvider>
  );
}
