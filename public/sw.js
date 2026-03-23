"use client";
import { useEffect } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  useEffect(() => {
    // ✅ Hanya aktif di production, aman untuk Next.js dev mode
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("✅ Service Worker aktif"))
        .catch((err) => console.error("❌ Gagal daftar SW:", err));
    } else {
      console.log("⚙️ Service Worker nonaktif (development mode)");
    }
  }, []);

  return <>{children}</>;
}
