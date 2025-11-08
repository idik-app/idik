"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "@app/contexts/UIContext";
import { X } from "lucide-react";

type TransitionMode = "fast" | "smooth" | "cinematic";

export default function HoloSettingsPanel() {
  const {
    isSettingsOpen,
    toggleSettings,
    transitionMode,
    setTransitionMode,
    themeMode,
    setThemeMode,
  } = useUI();

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <motion.div
          key="holo-settings"
          initial={{ x: 320, opacity: 0, filter: "blur(10px)" }}
          animate={{ x: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ x: 320, opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          className="fixed top-0 right-0 z-[500] h-full w-72
                     bg-gradient-to-bl from-[#09131e]/95 via-[#0d1c28]/90 to-[#081018]/90
                     backdrop-blur-2xl border-l border-cyan-400/20
                     shadow-[0_0_40px_rgba(0,255,255,0.25)]
                     text-cyan-200 p-4 flex flex-col justify-between"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2">
            <h2 className="text-lg font-bold tracking-widest text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]">
              SETTINGS
            </h2>
            <button
              onClick={toggleSettings}
              className="text-cyan-400 hover:text-cyan-200 transition"
            >
              <X size={22} />
            </button>
          </div>

          {/* BODY */}
          <div className="space-y-6 text-sm">
            {/* Transition Mode */}
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2 uppercase tracking-wider">
                Transition Mode
              </h3>
              <select
                value={transitionMode}
                onChange={(e) =>
                  setTransitionMode(e.target.value as TransitionMode)
                }
                className="w-full bg-cyan-950/50 border border-cyan-500/30 rounded-md px-2 py-1.5 outline-none text-cyan-100 hover:border-cyan-400/60 transition"
              >
                <option value="fast">⚡ Fast</option>
                <option value="smooth">🌙 Smooth</option>
                <option value="cinematic">🎬 Cinematic</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2 uppercase tracking-wider">
                Theme Color
              </h3>
              <div className="flex gap-3">
                {[
                  {
                    id: "gold-cyan",
                    label: "Gold-Cyan",
                    color: "from-yellow-400 to-cyan-400",
                  },
                  {
                    id: "neo-white",
                    label: "Neo-White",
                    color: "from-gray-200 to-gray-500",
                  },
                  {
                    id: "dark-clinical",
                    label: "Dark-Clinical",
                    color: "from-[#0a101a] to-[#1a2c38]",
                  },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeMode(t.id as any)}
                    className={`relative w-10 h-10 rounded-full bg-gradient-to-br ${t.color}
                      shadow-[0_0_10px_rgba(0,255,255,0.3)] hover:scale-110 transition`}
                    title={t.label}
                  >
                    {themeMode === t.id && (
                      <div className="absolute inset-0 rounded-full ring-2 ring-cyan-300" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Glow Intensity (Future Hook) */}
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2 uppercase tracking-wider">
                Glow Intensity
              </h3>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                className="w-full accent-cyan-400 cursor-pointer"
                onChange={(e) =>
                  document.documentElement.style.setProperty(
                    "--holo-glow-intensity",
                    e.target.value
                  )
                }
              />
              <div className="flex justify-between text-[10px] text-cyan-500/70 mt-1">
                <span>Low</span>
                <span>Normal</span>
                <span>High</span>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="text-center mt-4 text-xs text-cyan-500/70 tracking-widest">
            IDIK-APP v5.6 • JARVIS Hologram Control
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
