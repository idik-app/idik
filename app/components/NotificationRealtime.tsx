"use client"

import { useNotificationBell } from "@/app/contexts/NotificationContext"
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Clock,
  ExternalLink,
  Settings
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"

const NOTIF_ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  error: <XCircle className="w-4 h-4 text-rose-500" />,
  info: <Info className="w-4 h-4 text-cyan-500" />,
  system: <Settings className="w-4 h-4 text-slate-500" />,
}

export default function NotificationRealtime() {
  const { bellAlerts, clearAllBellAlerts } = useNotificationBell()

  return (
    <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#0a1118]/95 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(0,255,255,0.1)] z-[100] animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/10 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Bell size={16} />
          </div>
          <span className="font-bold text-sm tracking-wide text-white">Notifikasi</span>
        </div>
        {bellAlerts.length > 0 && (
          <button 
            onClick={clearAllBellAlerts}
            className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/60 hover:text-cyan-400 transition-colors"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto custom-scroll">
        {bellAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">Belum ada notifikasi baru</p>
            <p className="text-[11px] text-slate-500 mt-1">Aktivitas sistem akan muncul di sini</p>
          </div>
        ) : (
          <div className="divide-y divide-cyan-500/5">
            {bellAlerts.map((notif) => (
              <div 
                key={notif.id} 
                className="group relative flex items-start gap-3 p-4 hover:bg-white/5 transition-all cursor-default"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {NOTIF_ICONS[notif.type as keyof typeof NOTIF_ICONS] || NOTIF_ICONS.info}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      notif.type === 'success' ? 'text-emerald-400/80' :
                      notif.type === 'warning' ? 'text-amber-400/80' :
                      notif.type === 'error' ? 'text-rose-400/80' :
                      'text-cyan-400/80'
                    }`}>
                      {notif.type === 'system' ? 'Sistem' : notif.type === 'success' ? 'Berhasil' : notif.type === 'warning' ? 'Peringatan' : 'Info'}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: id })}
                    </div>
                  </div>
                  
                  <p className="text-[13px] leading-relaxed text-slate-200 group-hover:text-white transition-colors">
                    {notif.message.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-cyan-300 font-bold">{part}</strong> : part
                    )}
                  </p>
                </div>

                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ExternalLink size={12} className="text-cyan-500/40" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {bellAlerts.length > 0 && (
        <div className="px-4 py-2 border-t border-cyan-500/10 bg-white/5 text-center">
          <button className="text-[11px] font-semibold text-slate-500 hover:text-cyan-400 transition-colors">
            Lihat semua riwayat aktivitas
          </button>
        </div>
      )}
    </div>
  )
}
