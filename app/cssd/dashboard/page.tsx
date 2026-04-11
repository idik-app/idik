"use client";

import { useEffect, useState } from "react";
import { 
  RefreshCcw, 
  CheckCircle2, 
  Loader2, 
  Package, 
  User, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type PemakaianOrder = {
  id: string;
  tanggal: string;
  pasien: string;
  no_rm?: string;
  dokter: string;
  status_alkes_cssd: string | null;
  items: any[];
  petugas_cssd?: string;
};

export default function CSSDDashboardPage() {
  const [orders, setOrders] = useState<PemakaianOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pemakaian-orders?limit=100", {
        cache: "no-store"
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal memuat data order");
      }
      // Filter orders that need sterilization (PROCESSING)
      const filtered = (json.orders ?? []).filter((o: any) => 
        o.status_alkes_cssd === 'PROCESSING'
      );
      setOrders(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function markAsReady(orderId: string) {
    if (processingId) return;
    setProcessingId(orderId);
    try {
      const res = await fetch(`/api/pemakaian-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_alkes_cssd: 'READY' })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal memperbarui status");
      }
      // Remove from list after success
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCcw className="h-6 w-6 text-amber-500" />
              CSSD / UNIT STERILISASI
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Manajemen Siklus Alkes Reuse & Sterilisasi Cathlab
            </p>
          </div>
          <button 
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh Data
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 p-4 rounded-2xl">
            <div className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Antrean Steril</div>
            <div className="text-3xl font-black text-amber-700 dark:text-amber-300">{orders.length}</div>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Daftar Antrean Pencucian</h2>
          
          {loading && orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800">
              <Loader2 className="h-10 w-10 text-slate-300 animate-spin mb-4" />
              <p className="text-slate-400 font-bold">Memuat antrean...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4 opacity-20" />
              <p className="text-slate-400 font-bold">Tidak ada antrean pencucian alat.</p>
              <p className="text-xs text-slate-400">Semua alat sudah berstatus READY.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => (
                <div 
                  key={order.id}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-black rounded-lg">
                          SEDANG DICUCI
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-bold tracking-tighter">
                          ID: {order.id}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-none">
                          {order.pasien}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold flex items-center gap-1">
                          <User className="h-3 w-3" />
                          RM: {order.no_rm || "—"} • {order.dokter}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {order.items.filter(it => it.tipe === 'R').map((item, idx) => (
                          <div key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-800/30">
                            <Package className="h-3 w-3 opacity-70" />
                            <span className="text-[10px] font-black uppercase tracking-tight">{item.barang}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="text-right pr-4 hidden md:block">
                        <div className="text-[10px] font-black text-slate-400 uppercase">Petugas CSSD</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">{order.petugas_cssd || "Belum ditentukan"}</div>
                      </div>
                      <button
                        onClick={() => markAsReady(order.id)}
                        disabled={processingId === order.id}
                        className={cn(
                          "w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all",
                          "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                        )}
                      >
                        {processingId === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        SELESAI STERIL (READY)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-zinc-600">
          <AlertCircle className="h-4 w-4" />
          <p className="text-[10px] font-bold uppercase tracking-widest italic">
            Klik tombol selesai steril akan otomatis menghijaukan indikator di TindakanTable
          </p>
        </div>
      </div>
    </div>
  );
}
