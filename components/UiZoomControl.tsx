"use client";

import { useTheme } from "@/contexts/ThemeContext";
import {
  useUI,
  UI_ZOOM_MAX,
  UI_ZOOM_MIN,
  UI_ZOOM_STEP,
} from "@/contexts/UIContext";
import { Minus, Plus } from "lucide-react";

/** Kontrol cepat zoom tampilan konten dashboard (Topbar). */
export default function UiZoomControl() {
  const { uiZoomPercent, setUiZoomPercent } = useUI();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const btn =
    `inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg border px-1.5 text-[11px] font-semibold transition flex-shrink-0 disabled:opacity-40 disabled:pointer-events-none ${
      isLight
        ? "border-cyan-600/35 bg-white/70 text-cyan-900 hover:bg-cyan-50"
        : "border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
    }`;

  return (
    <div
      className={`flex items-center gap-0.5 rounded-lg border px-0.5 py-0.5 flex-shrink-0 ${
        isLight
          ? "border-cyan-600/25 bg-white/40"
          : "border-cyan-600/30 bg-black/20"
      }`}
      title="Zoom isi halaman (di bawah tab menu)"
      role="group"
      aria-label="Zoom tampilan"
    >
      <button
        type="button"
        className={btn}
        aria-label="Perkecil tampilan"
        disabled={uiZoomPercent <= UI_ZOOM_MIN}
        onClick={() =>
          setUiZoomPercent((z) => z - UI_ZOOM_STEP)
        }
      >
        <Minus className="h-3.5 w-3.5" aria-hidden />
      </button>
      <span
        className={`min-w-[2.75rem] text-center font-mono text-[10px] font-bold tabular-nums sm:text-[11px] ${
          isLight ? "text-cyan-950" : "text-cyan-200"
        }`}
      >
        {uiZoomPercent}%
      </span>
      <button
        type="button"
        className={btn}
        aria-label="Perbesar tampilan"
        disabled={uiZoomPercent >= UI_ZOOM_MAX}
        onClick={() =>
          setUiZoomPercent((z) => z + UI_ZOOM_STEP)
        }
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
