"use client";

import { useEffect, useState, useMemo } from "react";
import {
  motion,
  useAnimationControls,
} from "framer-motion";
import { useUI } from "@/contexts/UIContext";
import { useSession } from "@/contexts/SessionContext";
import { LogOut, Loader2, Sun, Moon } from "lucide-react";
import HoloSettingsPanel from "@/components/HoloSettingsPanel";
import { useTheme } from "@/contexts/ThemeContext";
import { ToolbarNotificationBell } from "@/app/dashboard/pasien/components/toolbar/ToolbarNotificationBell";

const LOGOUT_REDIRECT_PATH = "/";
const JARVIS_LOGOUT_KEY = "jarvis_logout";

const THEME_STYLES = {
  "gold-cyan": {
    glow: "shadow-[0_2px_25px_rgba(255,215,0,0.3)]",
    gradient:
      "from-[#081118]/85 via-[#0d1924]/80 to-[#142a2f]/70",
  },
  "neo-white": {
    glow: "shadow-[0_2px_25px_rgba(255,255,255,0.25)]",
    gradient:
      "from-[#f7f7f7]/80 via-[#eaeaea]/70 to-[#d9d9d9]/70 text-gray-800",
  },
  "dark-clinical": {
    glow: "shadow-[0_2px_25px_rgba(0,255,255,0.25)]",
    gradient:
      "from-[#081118]/85 via-[#0d1924]/80 to-[#142a2f]/70",
  },
} as const;

export default function Topbar() {
  const {
    toggleSidebar,
    setCollapsed,
    isMobile,
    themeMode,
    setShowLogoutAnim,
  } = useUI();
  const { theme, toggleTheme } = useTheme();
  const { username, resetSession } = useSession();
  const isLight = theme === "light";

  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [sweepTrigger, setSweepTrigger] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  /* 🧭 Safe mount */
  useEffect(() => setMounted(true), []);

  const sweepControls = useAnimationControls();

  /* 🕒 Realtime Clock */
  const days = useMemo(
    () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    []
  );
  useEffect(() => {
    if (!mounted) return;
    const tick = () => {
      const now = new Date();
      setDay(days[now.getDay()]);
      setDate(
        now.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      );
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [mounted]);

  /* 🌐 Online Status */
  useEffect(() => {
    if (!mounted) return;
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [mounted]);

  /* 🚪 Logout + Audit Log */
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const res = await fetch("/api/system/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout",
          module: "Topbar",
          metadata: { device: navigator.userAgent },
        }),
      });
      if (!res.ok) {
        console.warn("⚠️ Audit logout gagal:", await res.text());
      }
    } catch (err) {
      console.warn("⚠️ Gagal mencatat audit logout:", err);
      setLoggingOut(false);
      return;
    }

    // efek JARVIS
    const audio = new Audio("/sfx/shutdown.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
    navigator.vibrate?.([40, 60, 40]);

    localStorage.removeItem("idik_user");
    resetSession();
    sessionStorage.setItem(JARVIS_LOGOUT_KEY, "true");
    setShowLogoutAnim(true);

    setTimeout(() => {
      window.location.href = LOGOUT_REDIRECT_PATH;
    }, 2000);
  };

  /* 💥 Portal Sweep */
  const triggerSweep = () => {
    setSweepTrigger((t) => t + 1);
    sweepControls.start({
      x: ["-100%", "100%"],
      opacity: [0.2, 0.6, 0],
      transition: { duration: 1.2, ease: "easeInOut" },
    });
  };

  /* 🧭 Toggle Sidebar: mobile = buka/tutup; desktop = expand/collapse */
  const handleJarvisToggle = () => {
    if (isMobile) toggleSidebar();
    else setCollapsed((p) => !p);
    triggerSweep();
    navigator.vibrate?.(25);
  };

  /* 🎨 Theme Style — mode siang pakai header terang; malam ikut themeMode (gold-cyan / dll.) */
  const themeStyles = isLight
    ? THEME_STYLES["neo-white"]
    : THEME_STYLES[themeMode] ?? THEME_STYLES["dark-clinical"];
  const { glow: themeGlow, gradient: gradientClass } = themeStyles;

  if (!mounted)
    return (
      <header
        className="h-14 w-full border-b border-cyan-700/30 bg-transparent"
        suppressHydrationWarning
      />
    );

  return (
    <>
      <motion.header
        layout
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`relative z-[350] flex items-center justify-between gap-2 min-w-0
          px-2.5 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3
          border-b ${isLight ? "border-cyan-600/25" : "border-cyan-500/30"} bg-gradient-to-r ${gradientClass}
          backdrop-blur-2xl ${isLight ? "text-slate-800" : "text-gray-200"} ${themeGlow}
          transition-all duration-500 ease-in-out select-none overflow-hidden md:overflow-visible`}
      >
        {/* ✨ Portal Sweep */}
        <motion.div
          key={sweepTrigger}
          className="absolute inset-y-0 left-0 w-[180%] bg-gradient-to-r from-cyan-500/0 via-cyan-400/40 to-amber-300/0 pointer-events-none blur-[35px]"
          initial={{ x: "-100%", opacity: 0 }}
          animate={sweepControls}
        />

        {/* Toggle sidebar: ikon Menu (hamburger) di mobile, JARVIS di desktop */}
        <motion.button
            type="button"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleJarvisToggle}
            className={`p-2 relative rounded-lg border transition flex-shrink-0 ${
              isLight
                ? "border-cyan-600/30 bg-white/50 hover:bg-cyan-100/60"
                : "border-cyan-500/30 bg-black/10 hover:bg-cyan-500/10"
            }`}
            title="Buka/tutup sidebar (JARVIS)"
            aria-label="Buka atau tutup sidebar"
          >
            <motion.svg
              viewBox="0 0 512 512"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 md:w-10 md:h-10"
            >
              <path
                d="M256 20C150 20 60 110 60 216c0 84 48 156 120 190v60h152v-60c72-34 120-106 120-190 0-106-90-196-196-196zM180 216h-40v-56h40v56zm192 0h-40v-56h40v56z"
                fill="#00ffff"
                stroke="#f4b400"
                strokeWidth="4"
              />
            </motion.svg>
        </motion.button>

        {/* 🏥 Judul: IDIK di mobile, lengkap di desktop */}
        <div className="flex-1 text-center min-w-0">
          {isMobile ? (
            <h1
              className={`font-bold tracking-widest text-base ${
                isLight
                  ? "text-cyan-800"
                  : "text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]"
              }`}
            >
              IDIK
            </h1>
          ) : (
            <>
              <h1
                className={`font-extrabold tracking-wide text-sm md:text-base ${
                  isLight
                    ? "text-cyan-950"
                    : "text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]"
                }`}
              >
                Instalasi Diagnostik Intervensi{" "}
                <span
                  className={isLight ? "text-amber-800 font-extrabold" : "text-amber-400 font-extrabold"}
                >
                  Kardiovaskular
                </span>
              </h1>
              <p
                className={`text-[10px] md:text-xs font-bold tracking-widest mt-0.5 ${
                  isLight ? "text-slate-800" : "text-gray-400"
                }`}
              >
                RSUD dr. M. Soewandhie – Surabaya
              </p>
            </>
          )}
        </div>

        {/* ⏱ Info Waktu + User + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0 max-w-[48%] sm:max-w-none">
          <div className="text-right leading-tight relative hidden min-[400px]:block min-w-0">
            <p
              className={`font-bold text-[11px] sm:text-xs md:text-sm truncate max-w-[9rem] sm:max-w-none ${
                isLight ? "text-cyan-950" : "text-cyan-400"
              }`}
            >
              {`${day}, ${date}`}
            </p>
            <p
              className={`font-mono font-semibold text-[11px] sm:text-xs md:text-sm ${
                isLight ? "text-slate-900" : "text-gray-300"
              }`}
            >
              {time}
            </p>
            <span
              className={`absolute -right-3 top-1 sm:-right-4 sm:top-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${
                isOnline
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-red-500 animate-ping"
              }`}
              aria-hidden="true"
            />
          </div>
          {/* Waktu ringkas di layar sangat sempit */}
          <div className="text-right leading-none min-[400px]:hidden sm:hidden flex-shrink-0">
            <p
              className={`font-mono text-[10px] ${
                isLight ? "text-slate-600" : "text-gray-300 text-cyan-200/90"
              }`}
            >
              {time}
            </p>
          </div>

          <div
            className={`flex items-center gap-1 sm:gap-2 md:gap-3 border-l pl-1.5 sm:pl-3 md:pl-4 min-w-0 ${
              isLight ? "border-cyan-600/30" : "border-cyan-700/40"
            }`}
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              title={isLight ? "Mode malam" : "Mode siang"}
              aria-label={isLight ? "Aktifkan mode malam" : "Aktifkan mode siang"}
              className={`p-2 rounded-lg border transition flex-shrink-0 ${
                isLight
                  ? "border-cyan-600/35 bg-white/60 text-amber-600 hover:bg-amber-50"
                  : "border-cyan-500/35 bg-cyan-500/10 text-amber-300 hover:bg-cyan-500/20"
              }`}
            >
              {isLight ? <Moon size={18} /> : <Sun size={18} />}
            </motion.button>
            <ToolbarNotificationBell />
            <span
              className={`font-bold tracking-wide text-[11px] sm:text-xs md:text-sm truncate max-w-[4.5rem] min-[380px]:max-w-[6rem] sm:max-w-[10rem] md:max-w-[14rem] ${
                isLight ? "text-cyan-950" : "text-cyan-300"
              }`}
              title={username}
            >
              {username}
            </span>

            <motion.button
              whileHover={!loggingOut ? { scale: 1.15 } : undefined}
              whileTap={!loggingOut ? { scale: 0.9 } : undefined}
              onClick={handleLogout}
              disabled={loggingOut}
              aria-label={loggingOut ? "Sedang logout…" : "Logout"}
              aria-busy={loggingOut}
              className={`p-2 rounded-full transition-all disabled:opacity-80 ${
                isLight
                  ? "bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-800 shadow-sm"
                  : "bg-cyan-600/20 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-amber-400/30 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.3)]"
              }`}
              title={loggingOut ? "Sedang logout…" : "Logout"}
            >
              {loggingOut ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <LogOut size={18} />
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      <HoloSettingsPanel />
    </>
  );
}
