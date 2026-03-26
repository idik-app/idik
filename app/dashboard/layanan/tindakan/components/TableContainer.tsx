"use client";
import { useRef, useState, useEffect } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import dynamic from "next/dynamic";
import JarvisScanner from "@/components/effects/JarvisScanner";

const DiagnosticsHUD = dynamic(() => import("@/components/DiagnosticsHUD"), {
  ssr: false,
});

export default function TableContainer({
  children,
}: {
  children: React.ReactNode;
}) {
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
      className={`relative rounded-2xl border border-cyan-800/50 bg-black/30 backdrop-blur-md overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[9999] p-4 bg-black/90" : ""
      }`}
    >
      <button
        onClick={toggleFullscreen}
        className="absolute top-3 right-3 z-20 p-2 rounded-full bg-cyan-800/40 hover:bg-cyan-700/60 border border-cyan-500/30 text-cyan-300 hover:text-gold-300 transition"
      >
        {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      </button>

      {scanner && (
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
          <JarvisScanner isActive />
        </div>
      )}

      <div className="relative z-10">{children}</div>

      {isFullscreen && (
        <div className="absolute bottom-3 right-4 z-20 scale-90 opacity-85">
          <DiagnosticsHUD module="Tindakan" />
        </div>
      )}
    </div>
  );
}
