"use client";

import { useEffect, useState, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useAnimationControls,
} from "framer-motion";
import { useUI } from "@app/contexts/UIContext";
import { useSession } from "@app/contexts/SessionContext";
import { LogOut, User, Settings } from "lucide-react";
import HoloSettingsPanel from "@/components/HoloSettingsPanel";
import SupabaseStatus from "@/components/SupabaseStatus";

/* ⚡ Cathlab JARVIS Topbar v5.6.4 Stable
   🔸 Terhubung SessionContext (global username & role)
   🔸 Audit Supabase logout event
   🔸 Efek suara + getaran JARVIS
   🔸 Kompatibel Next 15 Turbopack
*/

export default function Topbar() {
  const {
    toggleSidebar,
    collapsed,
    setCollapsed,
    isMobile,
    toggleSettings,
    isSettingsOpen,
    themeMode,
    setShowLogoutAnim,
  } = useUI();
  const { username, role, resetSession } = useSession();

  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("--:--:--");
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [sweepTrigger, setSweepTrigger] = useState(0);

  /* 🧭 Safe mount */
  useEffect(() => setMounted(true), []);

  /* 🎢 Sidebar Motion */
  const motionX = useMotionValue(collapsed ? 80 : 288);
  const iconX = useTransform(motionX, [80, 288], [64, 24]);
  const sweepControls = useAnimationControls();

  useEffect(() => {
    if (!mounted) return;
    const target = collapsed ? 80 : 288;
    const controls = animate(motionX, target, {
      duration: 0.45,
      ease: "easeInOut",
    });
    return controls.stop;
  }, [collapsed, mounted, motionX]);

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
  }, [mounted, days]);

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
    try {
      // catat audit ke Supabase via API
      await fetch("/api/system/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout",
          module: "Topbar",
          status: "success",
          username,
          role,
          metadata: { device: navigator.userAgent },
        }),
      });
    } catch (err) {
      console.warn("⚠️ Gagal mencatat audit logout:", err);
    }

    // efek JARVIS
    const audio = new Audio("/sfx/shutdown.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
    navigator.vibrate?.([40, 60, 40]);

    // bersihkan session + tampilkan overlay
    localStorage.removeItem("idik_user");
    resetSession();
    sessionStorage.setItem("jarvis_logout", "true");
    setShowLogoutAnim(true);

    // redirect ke root setelah 2 detik
    setTimeout(() => {
      window.location.href = "/";
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

  /* 🧭 Toggle Sidebar */
  const handleJarvisToggle = () => {
    if (isMobile) toggleSidebar();
    else setCollapsed((p) => !p);
    triggerSweep();
    navigator.vibrate?.(25);
  };

  /* 🎨 Theme Style */
  const themeGlow =
    themeMode === "gold-cyan"
      ? "shadow-[0_2px_25px_rgba(255,215,0,0.3)]"
      : themeMode === "neo-white"
      ? "shadow-[0_2px_25px_rgba(255,255,255,0.25)]"
      : "shadow-[0_2px_25px_rgba(0,255,255,0.25)]";

  const gradientClass =
    themeMode === "gold-cyan"
      ? "from-[#081118]/85 via-[#0d1924]/80 to-[#142a2f]/70"
      : themeMode === "neo-white"
      ? "from-[#f7f7f7]/80 via-[#eaeaea]/70 to-[#d9d9d9]/70 text-gray-800"
      : "from-[#081118]/85 via-[#0d1924]/80 to-[#142a2f]/70";

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
        className={`relative z-[350] flex items-center justify-between px-5 py-3
          border-b border-cyan-500/30 bg-gradient-to-r ${gradientClass}
          backdrop-blur-2xl text-gray-200 ${themeGlow}
          transition-all duration-500 ease-in-out select-none overflow-hidden`}
      >
        {/* ✨ Portal Sweep */}
        <motion.div
          key={sweepTrigger}
          className="absolute inset-y-0 left-0 w-[180%] bg-gradient-to-r from-cyan-500/0 via-cyan-400/40 to-amber-300/0 pointer-events-none blur-[35px]"
          initial={{ x: "-100%", opacity: 0 }}
          animate={sweepControls}
        />

        {/* 🌀 Toggle Sidebar */}
        <motion.button
          onClick={handleJarvisToggle}
          style={{ x: iconX }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="p-2 relative"
          title="Toggle Sidebar"
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

        {/* 🏥 Judul */}
        <div className="flex-1 text-center">
          <h1 className="font-bold tracking-wide text-cyan-300 text-sm md:text-base drop-shadow-[0_0_6px_#00e0ff]">
            Instalasi Diagnostik Intervensi{" "}
            <span className="text-amber-400">Kardiovaskular</span>
          </h1>
          <p className="text-[10px] md:text-xs text-gray-400 font-semibold tracking-widest mt-0.5">
            RSUD dr. M. Soewandhie – Surabaya
          </p>
        </div>

        {/* ⏱ Info Waktu + User + Settings */}
        <div className="flex items-center gap-4">
          <div className="text-right leading-tight relative">
            <p className="text-cyan-400 font-semibold text-sm">
              {`${day}, ${date}`}
            </p>
            <p className="text-gray-300 font-mono text-sm">{time}</p>
            <span
              className={`absolute -right-4 top-1.5 w-2.5 h-2.5 rounded-full ${
                isOnline
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-red-500 animate-ping"
              }`}
            />
          </div>

          <div className="flex items-center gap-3 border-l border-cyan-700/40 pl-4">
            <SupabaseStatus />
            <User size={18} className="text-cyan-300" />
            <span className="font-semibold tracking-wide text-sm">
              {username || "User"}
            </span>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleSettings}
              title="Hologram Settings"
              className={`p-2 rounded-full ${
                isSettingsOpen
                  ? "bg-cyan-500/30"
                  : "bg-cyan-600/20 hover:bg-cyan-500/30"
              } text-cyan-300 transition-all shadow-[0_0_12px_rgba(0,255,255,0.4)]`}
            >
              <Settings size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2 rounded-full bg-cyan-600/20 hover:bg-gradient-to-r hover:from-cyan-500/30 hover:to-amber-400/30 text-cyan-300 shadow-[0_0_10px_rgba(0,255,255,0.3)] transition-all"
              title="Logout"
            >
              <LogOut size={18} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <HoloSettingsPanel />
    </>
  );
}
