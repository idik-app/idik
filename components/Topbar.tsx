"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { useUI } from "@/contexts/UIContext";
import { useSession } from "@/contexts/SessionContext";
import { LogOut, Loader2, Sun, Moon, Settings, RefreshCw } from "lucide-react";
import HoloSettingsPanel from "@/components/HoloSettingsPanel";
import UiZoomControl from "@/components/UiZoomControl";
import { UI_LAYERS } from "@/lib/ui/layers";
import { useTheme } from "@/contexts/ThemeContext";
import { ToolbarNotificationBell } from "@/app/dashboard/pasien/components/toolbar/ToolbarNotificationBell";
import { useNotificationBell } from "@/app/contexts/NotificationContext";
import { useJarvisVoice } from "@/app/hooks/useJarvisVoice";
import { useAI } from "@/contexts/AIContext";

import JarvisIcon from "@/components/JarvisIcon";

const LOGOUT_REDIRECT_PATH = "/";
const JARVIS_LOGOUT_KEY = "jarvis_logout";

const THEME_STYLES = {
  "gold-cyan": {
    glow: "shadow-[0_2px_25px_rgba(255,215,0,0.3)]",
    gradient: "from-[#081118]/85 via-[#0d1924]/80 to-[#142a2f]/70",
  },
  "neo-white": {
    glow: "shadow-[0_2px_25px_rgba(255,255,255,0.25)]",
    gradient:
      "from-[#f7f7f7]/80 via-[#eaeaea]/70 to-[#d9d9d9]/70 text-gray-800",
  },
  "dark-clinical": {
    glow: "shadow-[0_2px_25px_rgba(0,255,255,0.25)]",
    gradient: "from-[#081118]/85 via-[#0d1924]/80 to-[#142a2f]/70",
  },
} as const;

export default function Topbar({
  title,
  extra,
  transparent = false,
}: {
  title?: string | React.ReactNode;
  extra?: React.ReactNode;
  transparent?: boolean;
}) {
  const {
    toggleSidebar,
    setCollapsed,
    isMobile,
    themeMode,
    setShowLogoutAnim,
    toggleSettings,
  } = useUI();
  const { theme, toggleTheme } = useTheme();
  const { username, resetSession } = useSession();
  const { bellAlerts } = useNotificationBell();
  const { speak } = useJarvisVoice();
  const lightMode = theme === "light";

  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [sweepTrigger, setSweepTrigger] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { mode: aiMode } = useAI();
  const [localStatus, setLocalStatus] = useState<
    "idle" | "learning" | "diagnosing" | "repairing" | "success" | "error"
  >("idle");

  /* 🔄 Sync Events Listener & Voice */
  useEffect(() => {
    if (!mounted) return;
    const onStart = () => {
      setIsSyncing(true);
      setLocalStatus("diagnosing");
      speak("Starting data synchronization. All systems operational.");
    };
    const onEnd = () => {
      setIsSyncing(false);
      setLocalStatus("success");
      speak("Synchronization complete. Records are up to date.");
    };
    window.addEventListener("extraction:start", onStart);
    window.addEventListener("extraction:end", onEnd);
    return () => {
      window.removeEventListener("extraction:start", onStart);
      window.removeEventListener("extraction:end", onEnd);
    };
  }, [mounted, speak]);

  /* ⏳ Auto-reset local status to allow aiMode to take over */
  useEffect(() => {
    if (
      localStatus === "success" ||
      localStatus === "error" ||
      localStatus === "learning"
    ) {
      const timer = setTimeout(() => setLocalStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [localStatus]);

  const hasNotifications = bellAlerts.length > 0;
  const prevNotifCountRef = useRef(bellAlerts.length);

  /* 🔔 Notification Voice Feedback */
  useEffect(() => {
    if (!mounted || bellAlerts.length <= 0) {
      prevNotifCountRef.current = bellAlerts.length;
      return;
    }
    // Hanya bicara jika jumlah notifikasi bertambah
    if (bellAlerts.length > prevNotifCountRef.current) {
      setLocalStatus("learning");
      speak("New alerts detected, Sir.");
    }
    prevNotifCountRef.current = bellAlerts.length;
  }, [bellAlerts.length, mounted, speak]);

  /* 🧭 Safe mount + Welcome Voice */
  useEffect(() => {
    setMounted(true);
    // Welcome message setelah sedikit delay agar suara sistem browser siap
    const timer = setTimeout(() => {
      if (username) {
        speak(`All diagnostics online. Welcome back, Sir.`);
      } else {
        speak("All diagnostics online. System is ready.");
      }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak]); // Jangan masukkan username agar tidak bicara tiap kali username berubah/load

  const sweepControls = useAnimationControls();

  /* 🕒 Realtime Clock */
  const days = useMemo(
    () => ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
    [],
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
        }),
      );
      setTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
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
        setLocalStatus("error");
        console.warn("⚠️ Audit logout gagal:", await res.text());
      }
    } catch (err) {
      setLocalStatus("error");
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

    // 🤖 Summon Jarvis to Topbar
    window.dispatchEvent(
      new CustomEvent("jarvis:visit", {
        detail: { x: 40, y: 40, label: "COMMAND RECEIVED" },
      })
    );
  };

  /* 🎨 Theme Style — mode siang pakai header terang; malam ikut themeMode (gold-cyan / dll.) */
  const themeStyles = lightMode
    ? THEME_STYLES["neo-white"]
    : (THEME_STYLES[themeMode] ?? THEME_STYLES["dark-clinical"]);
  const { gradient: gradientClass } = themeStyles;

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
        className={`relative ${UI_LAYERS.topbar} flex items-center justify-between gap-2 min-w-0
          px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2
          border-b ${lightMode ? "border-cyan-600/25" : "border-cyan-500/30"} ${
            transparent ? "bg-transparent" : `bg-gradient-to-r ${gradientClass}`
          }
          backdrop-blur-2xl ${lightMode ? "text-slate-800" : "text-gray-200"}
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
          whileHover={{ 
            scale: 1.08,
            boxShadow: hasNotifications 
              ? "0 0 20px rgba(245, 158, 11, 0.4)" 
              : lightMode 
                ? "0 0 15px rgba(8, 145, 178, 0.3)" 
                : "0 0 20px rgba(34, 211, 238, 0.4)"
          }}
          whileTap={{ scale: 0.94 }}
          onClick={handleJarvisToggle}
          className={`p-1.5 relative rounded-xl border transition-all duration-300 flex-shrink-0 group overflow-hidden ${
            hasNotifications
              ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
              : lightMode
                ? "border-cyan-600/30 bg-white/40 hover:bg-cyan-50/80 hover:border-cyan-500/50 shadow-sm"
                : "border-cyan-500/40 bg-slate-900/40 hover:bg-cyan-950/40 hover:border-cyan-400/60 shadow-[0_0_10px_rgba(0,0,0,0.3)]"
          }`}
          title={isSyncing ? "Sedang sinkronisasi..." : "Buka/tutup sidebar (JARVIS)"}
          aria-label="Buka atau tutup sidebar"
        >
          {/* Animated Background Glow */}
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr ${
            hasNotifications
              ? "from-amber-500/20 to-rose-500/10"
              : lightMode ? "from-cyan-100/40 to-amber-50/40" : "from-cyan-500/10 to-amber-400/5"
          }`} />

          {/* Sync Spinner Overlay */}
          {isSyncing && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center z-30 bg-black/20 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
            </motion.div>
          )}

          <JarvisIcon
            className="w-7 h-7 md:w-8 md:h-8"
            isSyncing={isSyncing}
            hasNotifications={hasNotifications}
            lightMode={lightMode}
            status={localStatus !== "idle" ? localStatus : aiMode}
          />
          
          {/* Subtle Status Dot */}
          <div className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full z-20 ${
            isSyncing 
              ? "bg-cyan-400 animate-ping" 
              : hasNotifications 
                ? "bg-amber-500 animate-pulse shadow-[0_0_8px_#f59e0b]" 
                : lightMode ? "bg-cyan-500/60" : "bg-cyan-400 animate-pulse shadow-[0_0_5px_#22d3ee]"
          }`} />

          {/* Notification Badge */}
          {hasNotifications && !isSyncing && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-rose-500 rounded-full border border-white dark:border-slate-900 z-30"
            />
          )}
        </motion.button>

        {/* 🏥 Judul: Custom title or default IDIK title */}
        <div className="flex-1 text-center min-w-0 flex items-center justify-center gap-3">
          {title ? (
            typeof title === "string" ? (
              <h1
                className={`font-extrabold tracking-wide text-sm md:text-base truncate ${
                  lightMode
                    ? "text-cyan-950"
                    : "text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]"
                }`}
              >
                {title}
              </h1>
            ) : (
              title
            )
          ) : isMobile ? (
            <h1
              className={`font-bold tracking-widest text-base ${
                lightMode
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
                  lightMode
                    ? "text-cyan-950"
                    : "text-cyan-300 drop-shadow-[0_0_6px_#00e0ff]"
                }`}
              >
                Instalasi Diagnostik Intervensi{" "}
                <span
                  className={
                    lightMode
                      ? "text-amber-800 font-extrabold"
                      : "text-amber-400 font-extrabold"
                  }
                >
                  Kardiovaskular
                </span>
              </h1>
              <p
                className={`text-[10px] md:text-xs font-bold tracking-widest mt-0.5 ml-2 ${
                  lightMode ? "text-slate-800" : "text-gray-400"
                } hidden lg:block`}
              >
                RSUD dr. M. Soewandhie – Surabaya
              </p>
            </>
          )}
          {extra && <div className="hidden sm:block">{extra}</div>}
        </div>

        {/* ⏱ Info Waktu + User + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 min-w-0 max-w-[48%] sm:max-w-none">
          <div className="text-right leading-tight relative hidden min-[400px]:block min-w-0">
            <p
              className={`font-bold text-[11px] sm:text-xs md:text-sm truncate max-w-[9rem] sm:max-w-none ${
                lightMode ? "text-cyan-950" : "text-cyan-400"
              }`}
            >
              {`${day}, ${date}`}
            </p>
            <p
              className={`font-mono font-semibold text-[11px] sm:text-xs md:text-sm ${
                lightMode ? "text-slate-900" : "text-gray-300"
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
                lightMode ? "text-slate-600" : "text-gray-300 text-cyan-200/90"
              }`}
            >
              {time}
            </p>
          </div>

          <div
            className={`flex items-center gap-1 sm:gap-2 md:gap-3 border-l pl-1.5 sm:pl-3 md:pl-4 min-w-0 ${
              lightMode ? "border-cyan-600/30" : "border-cyan-700/40"
            }`}
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              title={lightMode ? "Mode malam" : "Mode siang"}
              aria-label={
                lightMode ? "Aktifkan mode malam" : "Aktifkan mode siang"
              }
              className={`p-1.5 rounded-lg border transition flex-shrink-0 ${
                lightMode
                  ? "border-cyan-600/35 bg-white/60 text-amber-600 hover:bg-amber-50"
                  : "border-cyan-500/35 bg-cyan-500/10 text-amber-300 hover:bg-cyan-500/20"
              }`}
            >
              {lightMode ? <Moon size={16} /> : <Sun size={16} />}
            </motion.button>
            <UiZoomControl />
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSettings}
              title="Pengaturan tampilan"
              aria-label="Buka pengaturan tampilan"
              className={`p-1.5 rounded-lg border transition flex-shrink-0 ${
                lightMode
                  ? "border-cyan-600/35 bg-white/60 text-cyan-800 hover:bg-cyan-50"
                  : "border-cyan-500/35 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/25"
              }`}
            >
              <Settings size={16} />
            </motion.button>
            <ToolbarNotificationBell />
            <span
              className={`font-bold tracking-wide text-[11px] sm:text-xs md:text-sm truncate max-w-[4.5rem] min-[380px]:max-w-[6rem] sm:max-w-[10rem] md:max-w-[14rem] ${
                lightMode ? "text-cyan-950" : "text-cyan-300"
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
              className={`p-1.5 rounded-full transition-all disabled:opacity-80 ${
                lightMode
                  ? "bg-cyan-600/15 hover:bg-cyan-600/25 text-cyan-800 shadow-sm"
                  : "bg-cyan-600/20 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-amber-400/30 text-cyan-300"
              }`}
              title={loggingOut ? "Sedang logout…" : "Logout"}
            >
              {loggingOut ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      <HoloSettingsPanel />
    </>
  );
}
