"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import jwt from "jsonwebtoken";

/* === 1️⃣ Tipe data global untuk context === */
type User = {
  username: string;
  role?: string;
} | null;

type Theme = "light" | "dark";

interface UIState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: Theme;
  toggleTheme: () => void;
  user: User;
}

/* === 2️⃣ Buat context === */
const UIContext = createContext<UIState | undefined>(undefined);

/* === 3️⃣ Provider utama === */
export function UIProvider({ children }: { children: React.ReactNode }) {
  // ⏺️ Sidebar state
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sidebarOpen");
      return saved ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // 🌗 Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = (localStorage.getItem("theme") as Theme) || "light";
    return saved;
  });

  // 👤 User state
  const [user, setUser] = useState<User>(null);

  /* === 4️⃣ Sync ke localStorage === */
  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /* === 5️⃣ Baca cookie JWT (hanya nama & role) === */
  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("session="));
    if (cookie) {
      const token = cookie.split("=")[1];
      try {
        const payload = jwt.decode(token) as {
          username: string;
          role?: string;
        } | null;
        setUser(
          payload ? { username: payload.username, role: payload.role } : null
        );
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  /* === 6️⃣ Provider value === */
  const value: UIState = {
    isSidebarOpen,
    toggleSidebar: () => setSidebarOpen((prev) => !prev),
    theme,
    toggleTheme: () =>
      setTheme((prev) => (prev === "light" ? "dark" : "light")),
    user,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

/* === 7️⃣ Custom hook === */
export function useUI(): UIState {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI() harus digunakan di dalam <UIProvider>");
  return ctx;
}
