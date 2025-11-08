"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import NotificationPanel from "@/components/NotificationPanel";

type NotificationType = "success" | "error" | "warning" | "info" | "system";

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationContextProps {
  show: (notif: Omit<Notification, "id">) => void;
  clear: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextProps | null>(
  null
);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error("useNotification must be used within NotificationProvider");
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

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

  return (
    <NotificationContext.Provider value={{ show, clear }}>
      {children}
      <div
        className="fixed z-50 right-4 top-4 flex flex-col gap-3 max-w-sm sm:right-6 sm:top-6
                   md:right-8 md:top-8 transition-all"
      >
        <AnimatePresence>
          {notifications.slice(-3).map((n) => (
            <NotificationPanel key={n.id} {...n} onClose={() => clear(n.id)} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};
