"use client";

import {
  useEffect,
  useState,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { getInitialTheme, applyTheme } from "@/lib/theme";

// 🧠 Definisi tipe dan context global
interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
});

// 🧩 Hook global untuk dipakai di mana saja
export const useTheme = () => useContext(ThemeContext);

// 🌗 Komponen Provider utama
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<string>("system");

  // Ambil preferensi awal dari localStorage atau system
  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  // Terapkan dan simpan setiap kali theme berubah
  useEffect(() => {
    if (!theme) return;
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {/* Theme diinject ke atribut untuk CSS awareness */}
      <div data-theme={theme} className={theme}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
