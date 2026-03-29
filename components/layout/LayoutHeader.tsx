"use client";
import { useRef, useState, useEffect } from "react";
import Topbar from "@/components/Topbar";
import TabBar from "@/components/TabBar";
import { useTheme } from "@/contexts/ThemeContext";

/*───────────────────────────────────────────────
 ⚙️ LayoutHeader – Cathlab JARVIS Mode v3.7 (Final Layer Fix)
   🔹 Turunkan z-index ke 30
   🔹 Hilangkan backdropFilter dari inline-style → pindah ke class
   🔹 Gunakan opacity untuk efek blur, tanpa bikin stacking context
───────────────────────────────────────────────*/
export default function LayoutHeader() {
  const headerRef = useRef<HTMLDivElement>(null);
  const [opacity, setOpacity] = useState(0);
  const { theme } = useTheme();
  const isLight = theme === "light";

  const handleScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    const ratio = Math.min(el.scrollTop / 120, 1);
    setOpacity(ratio * 0.6);
  };

  useEffect(() => {
    const main = document.querySelector("main");
    main?.addEventListener("scroll", handleScroll);
    return () => main?.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      ref={headerRef}
      className="flex flex-col relative z-[30] backdrop-blur-md transition-all duration-300"
      style={{
        backgroundColor: isLight
          ? `rgba(248,250,252,${opacity * 0.92})`
          : `rgba(0,0,0,${opacity * 0.6})`,
        borderBottom:
          opacity > 0.05
            ? isLight
              ? "1px solid rgba(6,182,212,0.22)"
              : "1px solid rgba(0,255,255,0.2)"
            : "1px solid transparent",
      }}
    >
      <Topbar />
      <TabBar />
    </div>
  );
}
