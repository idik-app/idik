"use client"

import { useTheme } from "@/contexts/ThemeContext"
import { useNotificationBell } from "@/app/contexts/NotificationContext"
import { Bell, Moon, Sun, User as PersonCircle } from "lucide-react"
import NotificationRealtime from "./NotificationRealtime"

export default function Topbar({ 
  title = "Dashboard", 
  extra, 
  transparent = false 
}: { 
  title?: string, 
  extra?: React.ReactNode, 
  transparent?: boolean 
}) {
  const { theme, toggleTheme } = useTheme()
  const { bellAlerts } = useNotificationBell()
  const dark = theme === "dark"

  const bgClass = transparent 
    ? "bg-transparent" 
    : (dark ? "bg-slate-900 text-white border-slate-800" : "bg-white text-slate-900 border-slate-200")

  return (
    <header className={`flex items-center justify-between px-4 py-2 border-b transition-colors duration-300 ${!transparent ? 'shadow-sm' : ''} ${bgClass}`}>
      {/* Judul Halaman */}
      <div className="flex items-center gap-4">
        <h5 className="font-bold text-lg mb-0">{title}</h5>
        {extra}
      </div>

      {/* Aksi Kanan */}
      <div className="flex items-center gap-4">
        {/* Notifikasi */}
        <div className="relative group">
          <button
            className={`p-2 rounded-lg hover:bg-slate-500/10 transition-colors relative ${dark ? "text-white" : "text-slate-600"}`}
            aria-label="Notifikasi"
          >
            <Bell size={20} />
            {bellAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {bellAlerts.length}
              </span>
            )}
          </button>
          <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-50">
            <NotificationRealtime />
          </div>
        </div>

        {/* Theme Switcher */}
        <button
          className={`p-2 rounded-lg hover:bg-slate-500/10 transition-colors ${dark ? "text-amber-400" : "text-blue-600"}`}
          onClick={toggleTheme}
          title="Ganti tema"
        >
          {dark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Profil */}
        <div className="relative group">
          <button
            className={`flex items-center gap-2 p-2 rounded-lg hover:bg-slate-500/10 transition-colors ${dark ? "text-white" : "text-slate-600"}`}
          >
            <PersonCircle size={20} />
            <span className="text-sm font-medium hidden sm:inline">Admin</span>
          </button>
          <div className={`absolute right-0 top-full mt-2 hidden group-hover:block w-48 rounded-xl border shadow-xl z-50 ${dark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
            <ul className="py-2 list-none m-0 px-0">
              <li><a className={`block px-4 py-2 text-sm hover:bg-slate-500/10 no-underline ${dark ? "text-white" : "text-slate-700"}`} href="#">Profil</a></li>
              <li><a className={`block px-4 py-2 text-sm hover:bg-slate-500/10 no-underline ${dark ? "text-white" : "text-slate-700"}`} href="#">Logout</a></li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  )
}
