"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark";
interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

function readThemeFromDocument(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light")
    ? "light"
    : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  /** Selaras dengan skrip beforeInteractive di layout (class di elemen html). */
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === "undefined" ? "dark" : readThemeFromDocument()
  );

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "theme" || !e.newValue) return;
      if (e.newValue !== "light" && e.newValue !== "dark") return;
      setTheme(e.newValue);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook cepat untuk akses tema di komponen mana pun
export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
