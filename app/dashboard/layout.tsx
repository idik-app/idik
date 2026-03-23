"use client";

import { useEffect } from "react";
import { LayoutContainer } from "@/components/layout";
import { EventBridgeProvider } from "@/contexts/EventBridgeContext";
import { DiagnosticsHUDProvider } from "@/contexts/DiagnosticsHUDContext";
import EventBridgeToHUD from "@/dashboard/ui/EventBridgeToHUD";
import DiagnosticsHUD from "@/dashboard/ui/DiagnosticsHUD";

/** Konten diisi oleh TabContent di LayoutMain (sidebar → tab), bukan oleh route page. */
export default function DashboardLayout() {
  useEffect(() => {
    console.log("✅ DashboardLayout mounted (client)");
  }, []);

  return (
    <>
      <LayoutContainer />
      <EventBridgeProvider>
        <DiagnosticsHUDProvider>
          <EventBridgeToHUD />
          <DiagnosticsHUD />
        </DiagnosticsHUDProvider>
      </EventBridgeProvider>
    </>
  );
}
