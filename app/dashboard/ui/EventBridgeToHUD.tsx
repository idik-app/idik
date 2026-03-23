"use client";
import { useEventBridge } from "@/contexts/EventBridgeContext";
import { useDiagnosticsHUD } from "@/contexts/DiagnosticsHUDContext";
import { useEffect } from "react";

export default function EventBridgeToHUD() {
  const { subscribe } = useEventBridge();
  const { addEvent } = useDiagnosticsHUD();

  useEffect(() => {
    const handler = (payload: unknown, event: string) => {
      addEvent({
        module: event.split(":")[0],
        type: event,
        message: JSON.stringify(payload),
        level: "info",
      });
    };

    const events = [
      "pasien:added",
      "pasien:updated",
      "pasien:deleted",
      "pasien:duplicate",
      "inventaris:stok_low",
      "monitoring:room_busy",
      "system:error",
      "tindakan:changed",
      "tindakan:diagnostics",
      "tindakan:warning",
      "tindakan:refresh",
      "tindakan:open-detail",
      "tindakan:open-editor",
    ];

    const unsubscribes = events.map((evt) =>
      subscribe(evt, (p) => handler(p, evt))
    );

    return () => unsubscribes.forEach((u) => u());
  }, [subscribe, addEvent]);

  return null;
}
