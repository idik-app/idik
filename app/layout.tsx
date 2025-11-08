import { JarvisFXProvider } from "@app/contexts/JarvisFXContext";
import { ThemeProvider } from "@app/contexts/ThemeContext";
import { UIProvider } from "@app/contexts/UIContext";
import { TabProvider } from "@app/contexts/TabContext";
import { NotificationProvider } from "@app/contexts/NotificationContext";
import { AIProvider } from "@app/contexts/AIContext";
import { SessionProvider } from "@app/contexts/SessionContext";
import { Toaster } from "sonner";
import GlobalLogoutOverlay from "@/components/GlobalLogoutOverlay";
import "@app/globals.css";

/*───────────────────────────────────────────────
 🧠 RootLayout – Cathlab JARVIS Mode v5.0
   • Integrasi SessionContext global
   • GlobalLogoutOverlay aktif di semua halaman
   • Toaster universal untuk notifikasi
───────────────────────────────────────────────*/

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <JarvisFXProvider>
          <NotificationProvider>
            <ThemeProvider>
              <UIProvider>
                <SessionProvider>
                  <TabProvider>
                    <AIProvider>
                      {children}
                      <GlobalLogoutOverlay /> {/* ✅ aktif di semua halaman */}
                    </AIProvider>
                  </TabProvider>
                </SessionProvider>
              </UIProvider>
            </ThemeProvider>
          </NotificationProvider>
        </JarvisFXProvider>

        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
