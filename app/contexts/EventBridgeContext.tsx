"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useCallback,
  useEffect,
} from "react";

type EventCallback = (data: any) => void;

type BridgeType = {
  subscribe: (event: string, cb: EventCallback) => () => void;
  emit: (event: string, data?: any) => void;
};

const EventBridgeContext = createContext<BridgeType | null>(null);

export function EventBridgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const listeners = useRef<{ [key: string]: EventCallback[] }>({});

  // Emit event ke semua listener
  const emit = useCallback((event: string, data?: any) => {
    const cbs = listeners.current[event];
    if (cbs) {
      cbs.forEach((cb) => cb(data));
    }
  }, []);

  // Subscribe ke event
  const subscribe = useCallback((event: string, cb: EventCallback) => {
    if (!listeners.current[event]) {
      listeners.current[event] = [];
    }
    listeners.current[event].push(cb);

    // return unsubscribe
    return () => {
      listeners.current[event] = listeners.current[event].filter(
        (fn) => fn !== cb
      );
    };
  }, []);

  // Debug kecil (optional)
  useEffect(() => {
    console.log("%cEventBridge Ready", "color:#0ff");
  }, []);

  const value = { subscribe, emit };

  return (
    <EventBridgeContext.Provider value={value}>
      {children}
    </EventBridgeContext.Provider>
  );
}

export function useEventBridge() {
  const ctx = useContext(EventBridgeContext);
  if (!ctx)
    throw new Error(
      "useEventBridge() must be used inside <EventBridgeProvider>"
    );
  return ctx;
}

export { EventBridgeContext };
