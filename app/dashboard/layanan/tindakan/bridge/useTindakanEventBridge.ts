"use client";

import { useContext, useEffect, useCallback, useMemo } from "react";
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

  const emitOpenDetail = useCallback(
    (id: string) => {
      bus.emit(TINDAKAN_OPEN_DETAIL, { id });
    },
    [bus]
  );

  const emitOpenEditor = useCallback(
    (id: string) => {
      bus.emit(TINDAKAN_OPEN_EDITOR, { id });
    },
    [bus]
  );

  const emitRefresh = useCallback(() => {
    bus.emit(TINDAKAN_REFRESH, { ts: Date.now() });
  }, [bus]);

  const emitEdited = useCallback(
    (payload: unknown) => {
      bus.emit(TINDAKAN_CHANGED, payload);
    },
    [bus]
  );

  const emitWarning = useCallback(
    (msg: string) => {
      bus.emit(TINDAKAN_WARNING, { message: msg });
    },
    [bus]
  );

  const emitDiagnostics = useCallback(
    (payload: unknown) => {
      bus.emit(TINDAKAN_DIAGNOSTICS, payload);
    },
    [bus]
  );

  const on = useCallback(
    (eventName: string, callback: (payload: unknown) => void) => {
      return bus.subscribe(eventName, callback);
    },
    [bus]
  );

  useEffect(() => {
    const unsub = bus.subscribe("kernel:update", () => {});
    return () => unsub();
  }, [bus]);

  return useMemo(
    () => ({
      emitOpenDetail,
      emitOpenEditor,
      emitRefresh,
      emitEdited,
      emitWarning,
      emitDiagnostics,
      on,
    }),
    [
      emitOpenDetail,
      emitOpenEditor,
      emitRefresh,
      emitEdited,
      emitWarning,
      emitDiagnostics,
      on,
    ]
  );
}
