"use client";

import { JarvisFXProvider } from "@app/contexts/JarvisFXContext";
import { ThemeProvider } from "@app/contexts/ThemeContext";
import { UIProvider } from "@app/contexts/UIContext";
import { TabProvider } from "@app/contexts/TabContext";
import { NotificationProvider } from "@app/contexts/NotificationContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <JarvisFXProvider>
      <NotificationProvider>
        <ThemeProvider>
          <UIProvider>
            <TabProvider>{children}</TabProvider>
          </UIProvider>
        </ThemeProvider>
      </NotificationProvider>
    </JarvisFXProvider>
  );
}
