"use client";

import { useEffect } from "react";
import { LayoutContainer } from "@/components/layout";
import EventBridgeToHUD from "@/dashboard/ui/EventBridgeToHUD";
import DiagnosticsHUD from "@/dashboard/ui/DiagnosticsHUD";
import GlobalExtractionProgress from "@/components/extraction/GlobalExtractionProgress";
import { JarvisModeProvider } from "@/contexts/JarvisModeContext";

/** Konten diisi oleh TabContent di LayoutMain (sidebar → tab), bukan oleh route page. */
export default function DashboardLayout() {
  useEffect(() => {
    console.log("✅ DashboardLayout mounted (client)");
  }, []);

  return (
    <JarvisModeProvider>
      <LayoutContainer />
      <EventBridgeToHUD />
      <DiagnosticsHUD />
      <GlobalExtractionProgress />
    </JarvisModeProvider>
  );
}
