"use client";

import { JarvisFXProvider } from "@/contexts/JarvisFXContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UIProvider } from "@/contexts/UIContext";
import { TabProvider } from "@/contexts/TabContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { DiagnosticsHUDProvider } from "@/contexts/DiagnosticsHUDContext";

/** ⚙️ Providers — Cathlab JARVIS Global Context Layer v6.6 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JarvisFXProvider>
      <NotificationProvider>
        <ThemeProvider>
          <UIProvider>
            <TabProvider>
              <DiagnosticsHUDProvider>{children}</DiagnosticsHUDProvider>
            </TabProvider>
          </UIProvider>
        </ThemeProvider>
      </NotificationProvider>
    </JarvisFXProvider>
  );
}
