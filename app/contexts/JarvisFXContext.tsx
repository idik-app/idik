"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ⚡ FXType v2.1 – Extended for TabContext Integration
   Menambahkan "scan-page", "switch", dan "refresh" agar kompatibel penuh
*/
type FXType = "boot" | "logout" | "scan-page" | "switch" | "refresh" | null;

interface JarvisFXContextType {
  fx: FXType;
  triggerFX: (type: FXType) => void;
}

const JarvisFXContext = createContext<JarvisFXContextType | undefined>(
  undefined
);

export function JarvisFXProvider({ children }: { children: ReactNode }) {
  const [fx, setFx] = useState<FXType>(null);

  const triggerFX = (type: FXType) => {
    if (!type) return;
    setTimeout(() => {
      setFx(type);
      setTimeout(() => setFx(null), 2000);
    }, 0);
  };

  // Auto boot saat pertama kali load
  useEffect(() => {
    const booted = sessionStorage.getItem("jarvis_boot_done");
    if (!booted) {
      triggerFX("boot");
      sessionStorage.setItem("jarvis_boot_done", "true");
    }
  }, []);

  // Render efek visual untuk boot/logout
  const renderFX = () => {
    if (!fx || fx === "scan-page" || fx === "refresh" || fx === "switch")
      return null;

    const color =
      fx === "boot"
        ? "rgba(212,175,55,0.65)" // gold boot
        : "rgba(255,80,80,0.55)"; // red logout

    return (
      <AnimatePresence>
        <motion.div
          key={fx}
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            backdropFilter: "blur(2px)",
            backgroundImage:
              "linear-gradient(rgba(0,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        >
          <motion.div
            className="absolute left-0 top-0 w-full h-[40%]"
            style={{
              background: `linear-gradient(to bottom, ${color}, transparent 75%)`,
              mixBlendMode: "screen",
            }}
            animate={{
              y: ["-60%", "100%"],
              opacity: [0.6, 0.8, 0.6],
            }}
            transition={{
              duration: 2.5,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <JarvisFXContext.Provider value={{ fx, triggerFX }}>
      {children}
      {renderFX()}
    </JarvisFXContext.Provider>
  );
}

export function useJarvisFX() {
  const ctx = useContext(JarvisFXContext);
  if (!ctx) throw new Error("useJarvisFX must be used within JarvisFXProvider");
  return ctx;
}
