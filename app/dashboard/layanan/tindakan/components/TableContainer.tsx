"use client";
import { useRef, useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import JarvisScanner from "@/components/effects/JarvisScanner";
import { cn } from "@/lib/utils";
import { useTindakanLightMode } from "../hooks/useTindakanLightMode";

const DiagnosticsHUD = dynamic(() => import("@/components/DiagnosticsHUD"), {
  ssr: false,
});

export default function TableContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const isLight = useTindakanLightMode();
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scanner, setScanner] = useState(false);

  useEffect(() => {
    const handle = () => {
      const active = document.fullscreenElement === ref.current;
      setIsFullscreen(active);
      setScanner(active);
    };
    document.addEventListener("fullscreenchange", handle);
    return () => document.removeEventListener("fullscreenchange", handle);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && ref.current)
      await ref.current.requestFullscreen();
    else await document.exitFullscreen();
  };

  return (
    <div
      ref={ref}
      data-table="tindakan"
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden min-w-0 max-w-full transition-colors duration-500",
        "bg-transparent",
        isFullscreen &&
          (isLight
            ? "fixed inset-0 z-[9999] p-3 md:p-4 bg-slate-100/98"
            : "fixed inset-0 z-[9999] p-3 md:p-4 bg-black/90"),
      )}
    >
      <button
        onClick={toggleFullscreen}
        className={cn(
          "absolute top-2 right-2 z-20 p-1.5 rounded-full border transition",
          isLight
            ? "bg-cyan-100 hover:bg-cyan-200 border-cyan-500/40 text-cyan-900 hover:text-amber-800"
            : "bg-cyan-800/40 hover:bg-cyan-700/60 border-cyan-500/30 text-cyan-300 hover:text-gold-300",
        )}
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>

      {scanner && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
          <JarvisScanner isActive />
        </div>
      )}

      {children}

      {isFullscreen && (
        <div className="absolute bottom-3 right-4 z-20 scale-90 opacity-85">
          <DiagnosticsHUD module="Tindakan" />
        </div>
      )}
    </div>
  );
}
