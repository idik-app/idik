"use client";

import { useContext, useEffect } from "react";
import { EventBridgeContext } from "@/contexts/EventBridgeContext";
import {
  TINDAKAN_OPEN_DETAIL,
  TINDAKAN_OPEN_EDITOR,
  TINDAKAN_REFRESH,
  TINDAKAN_CHANGED,
  TINDAKAN_WARNING,
  TINDAKAN_DIAGNOSTICS,
} from "./bridge.events";

export function useTindakanEventBridge() {
  const bus = useContext(EventBridgeContext);
  if (!bus) {
    throw new Error(
      "useTindakanEventBridge() must be used inside <EventBridgeProvider>"
    );
  }

  // =============== EMITTERS (UI → EventBridge) ===============
  const emitOpenDetail = (id: string) => {
    bus.emit(TINDAKAN_OPEN_DETAIL, { id });
  };

  const emitOpenEditor = (id: string) => {
    bus.emit(TINDAKAN_OPEN_EDITOR, { id });
  };

  const emitRefresh = () => {
    bus.emit(TINDAKAN_REFRESH, { ts: Date.now() });
  };

  const emitEdited = (payload: any) => {
    bus.emit(TINDAKAN_CHANGED, payload);
  };

  const emitWarning = (msg: string) => {
    bus.emit(TINDAKAN_WARNING, { message: msg });
  };

  const emitDiagnostics = (payload: any) => {
    bus.emit(TINDAKAN_DIAGNOSTICS, payload);
  };

  // =============== LISTENERS (EventBridge → UI) ===============
  const on = (eventName: string, callback: (payload: any) => void) => {
    return bus.subscribe(eventName, callback);
  };

  // optional logging
  useEffect(() => {
    const unsub = bus.subscribe("kernel:update", () => {});
    return () => unsub();
  }, [bus]);

  return {
    emitOpenDetail,
    emitOpenEditor,
    emitRefresh,
    emitEdited,
    emitWarning,
    emitDiagnostics,
    on,
  };
}
