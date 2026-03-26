"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

const NotificationPanel = dynamic(() => import("@/components/NotificationPanel"), {
  ssr: false,
});

type NotificationType = "success" | "error" | "warning" | "info" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

/** Alert item untuk dropdown bell di Topbar (global, semua aktivitas) */
export interface BellAlert {
  id: string;
  message: string;
  type?: NotificationType;
  createdAt: string;
}

interface NotificationContextProps {
  show: (notif: Omit<Notification, "id">) => void;
  clear: (id: string) => void;
  /** Daftar notifikasi untuk ikon bell (Topbar) */
  bellAlerts: BellAlert[];
  /** Tambah alert ke bell (dipanggil dari modul mana pun) */
  addBellAlert: (message: string, type?: NotificationType) => void;
  /** Hapus satu alert */
  clearBellAlert: (id: string) => void;
  /** Hapus semua alert bell */
  clearAllBellAlerts: () => void;
}

const NotificationContext = createContext<NotificationContextProps | null>(
  null
);

const MAX_BELL_ALERTS = 30;

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
};

/** Untuk komponen yang mungkin di-render di luar provider (opsional) */
export const useBellAlerts = (): NotificationContextProps["bellAlerts"] => {
  const ctx = useContext(NotificationContext);
  return ctx?.bellAlerts ?? [];
};

export const useNotificationBell = (): Pick<
  NotificationContextProps,
  "bellAlerts" | "addBellAlert" | "clearBellAlert" | "clearAllBellAlerts"
> => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    return {
      bellAlerts: [],
      addBellAlert: () => {},
      clearBellAlert: () => {},
      clearAllBellAlerts: () => {},
    };
  return {
    bellAlerts: ctx.bellAlerts,
    addBellAlert: ctx.addBellAlert,
    clearBellAlert: ctx.clearBellAlert,
    clearAllBellAlerts: ctx.clearAllBellAlerts,
  };
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellAlerts, setBellAlerts] = useState<BellAlert[]>([]);

  // Muat notifikasi dari DB saat mount
  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json?.ok || !Array.isArray(json.data)) return;
        setBellAlerts(
          json.data.map((row: { id: string; message: string; type?: string; createdAt: string }) => ({
            id: row.id,
            message: row.message,
            type: (row.type as BellAlert["type"]) ?? "info",
            createdAt: row.createdAt ?? new Date().toISOString(),
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const show = useCallback(
    ({ type, message, duration = 3000 }: Omit<Notification, "id">) => {
      const id = crypto.randomUUID();
      setNotifications((prev) => [...prev, { id, type, message, duration }]);

      // auto remove
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, duration);
    },
    []
  );

  const clear = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addBellAlert = useCallback(
    (message: string, type: NotificationType = "info") => {
      const createdAt = new Date().toISOString();
      setBellAlerts((prev) => {
        const next = [
          { id: crypto.randomUUID(), message, type, createdAt },
          ...prev,
        ];
        return next.slice(0, MAX_BELL_ALERTS);
      });
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, type }),
      }).catch(() => {});
    },
    []
  );

  const clearBellAlert = useCallback((id: string) => {
    setBellAlerts((prev) => prev.filter((a) => a.id !== id));
    fetch(`/api/notifications?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const clearAllBellAlerts = useCallback(() => {
    setBellAlerts([]);
    fetch("/api/notifications", { method: "DELETE" }).catch(() => {});
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        show,
        clear,
        bellAlerts,
        addBellAlert,
        clearBellAlert,
        clearAllBellAlerts,
      }}
    >
      {children}
      <div
        className="fixed z-50 right-4 top-4 flex flex-col gap-3 max-w-sm sm:right-6 sm:top-6
                   md:right-8 md:top-8 transition-all"
      >
        {notifications.slice(-3).map((n) => (
          <div key={n.id} className="animate-in fade-in slide-in-from-top-2 duration-200">
            <NotificationPanel {...n} onClose={() => clear(n.id)} />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
