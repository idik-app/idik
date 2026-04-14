"use client";

import { useEffect, useState } from "react";
import {
  RefreshCcw,
  CheckCircle2,
  Loader2,
  Package,
  User,
  Calendar,
  AlertCircle,
  LayoutDashboard,
  ClipboardList,
  History,
  FileText,
  Search,
  Plus,
  ArrowRight,
  MoreVertical,
  Trash2,
  Edit2,
  ExternalLink,
  MessageSquare,
  Download,
  Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";

type PemakaianOrder = {
  id: string;
  tanggal: string;
  pasien: string;
  no_rm?: string;
  dokter: string;
  status_alkes_cssd: string | null;
  items: any[];
  petugas_cssd?: string;
  created_at?: string;
};

type BarangReuse = {
  id: string;
  nama: string;
  ukuran?: string;
  kategori?: string;
  stok_steril: number;
  stok_kotor: number;
  total_reuse: number;
  status: "STERIL" | "KOTOR" | "PROSES";
  tanggal: string;
};

export default function CSSDDashboardPage() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "barang" | "pemakaian" | "laporan"
  >("dashboard");
  const [orders, setOrders] = useState<PemakaianOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data for Barang Reuse (as requested in wireframe 3.1)
  const [barangReuse, setBarangReuse] = useState<BarangReuse[]>([
    {
      id: "1",
      nama: "BALLON Simpas",
      ukuran: "2.0x12",
      kategori: "Ballon",
      stok_steril: 5,
      stok_kotor: 2,
      total_reuse: 12,
      status: "STERIL",
      tanggal: "2026-04-13",
    },
    {
      id: "2",
      nama: "Kateter Hisser",
      ukuran: "-",
      kategori: "Catheter",
      stok_steril: 2,
      stok_kotor: 5,
      total_reuse: 8,
      status: "KOTOR",
      tanggal: "2026-04-13",
    },
    {
      id: "3",
      nama: "Optitorque JL 3.5",
      ukuran: "5F",
      kategori: "Catheter",
      stok_steril: 10,
      stok_kotor: 0,
      total_reuse: 15,
      status: "PROSES",
      tanggal: "2026-04-12",
    },
    {
      id: "4",
      nama: "Guide Wire Terumo",
      ukuran: "0.035",
      kategori: "Wire",
      stok_steril: 8,
      stok_kotor: 1,
      total_reuse: 20,
      status: "STERIL",
      tanggal: "2026-04-12",
    },
  ]);

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pemakaian-orders?limit=100", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal memuat data order");
      }
      setOrders(json.orders ?? []);
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
        body: JSON.stringify({ status_alkes_cssd: "READY" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json?.message || "Gagal memperbarui status");
      }
      // Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status_alkes_cssd: "READY" } : o,
        ),
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  }

  const antreanPencucian = orders.filter(
    (o) => o.status_alkes_cssd === "PROCESSING",
  );
  const totalReuse = barangReuse.reduce(
    (acc, curr) => acc + curr.total_reuse,
    0,
  );
  const siapPakai = barangReuse.reduce(
    (acc, curr) => acc + curr.stok_steril,
    0,
  );
  const dalamProses = barangReuse.filter((b) => b.status === "PROSES").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <RefreshCcw className="h-6 w-6 text-amber-500" />
              IDIK - DASHBOARD CSSD
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Unit Sterilisasi & Manajemen Barang Reuse
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right mr-4 hidden md:block">
              <div className="text-[10px] font-black text-slate-400 uppercase">
                User Access
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                Admin CSSD
              </div>
            </div>
            <button
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 transition-colors shadow-sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === "dashboard"
                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg shadow-slate-200 dark:shadow-none"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800",
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("barang")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === "barang"
                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg shadow-slate-200 dark:shadow-none"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800",
            )}
          >
            <Package className="h-4 w-4" />
            Barang Reuse
          </button>
          <button
            onClick={() => setActiveTab("pemakaian")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === "pemakaian"
                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg shadow-slate-200 dark:shadow-none"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800",
            )}
          >
            <ClipboardList className="h-4 w-4" />
            Pemakaian
          </button>
          <button
            onClick={() => setActiveTab("laporan")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === "laporan"
                ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg shadow-slate-200 dark:shadow-none"
                : "text-slate-500 hover:bg-slate-50 dark:hover:bg-zinc-800",
            )}
          >
            <FileText className="h-4 w-4" />
            Laporan
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              TOTAL REUSE
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white">
              {totalReuse}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
              <ArrowRight className="h-3 w-3" />
              Bulan ini
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              SIAP PAKAI (OK)
            </div>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {siapPakai}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              Stok Steril
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              DALAM PROSES
            </div>
            <div className="text-3xl font-black text-amber-500">
              {dalamProses}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              Sedang Dicuci/Steril
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              ANTREAN STERIL
            </div>
            <div className="text-3xl font-black text-blue-500">
              {antreanPencucian.length}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-400">
              Dari Cathlab
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <div className="space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">
                  Quick Actions
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center justify-center gap-3 p-6 bg-emerald-500 text-white rounded-3xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all active:scale-95">
                    <Plus className="h-8 w-8" />
                    <span className="text-sm font-black">TERIMA ALAT</span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-3 p-6 bg-rose-500 text-white rounded-3xl shadow-lg shadow-rose-500/20 hover:scale-[1.02] transition-all active:scale-95">
                    <AlertCircle className="h-8 w-8" />
                    <span className="text-sm font-black">GAGAL PAKAI</span>
                  </button>
                </div>
              </div>

              {/* Real-time Pemakaian (Mini) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Pemakaian Terakhir
                  </h2>
                  <button
                    onClick={() => setActiveTab("pemakaian")}
                    className="text-[10px] font-black text-blue-500 uppercase hover:underline"
                  >
                    Lihat Semua
                  </button>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                  <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {orders.slice(0, 4).map((order) => (
                      <div
                        key={order.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">
                              {order.pasien}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              {
                                order.items.filter((it) => it.tipe === "R")
                                  .length
                              }{" "}
                              Alat Reuse
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 uppercase">
                            {format(new Date(order.tanggal), "HH:mm")}
                          </div>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[8px] font-black uppercase",
                              order.status_alkes_cssd === "READY"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            )}
                          >
                            {order.status_alkes_cssd || "PENDING"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inventory Summary (Mini) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Daftar Barang Reuse
                  </h2>
                  <button
                    onClick={() => setActiveTab("barang")}
                    className="text-[10px] font-black text-blue-500 uppercase hover:underline"
                  >
                    Kelola Stok
                  </button>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          No
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Tanggal
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Nama Barang
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Status
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                          Aksi
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {barangReuse.map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {format(new Date(item.tanggal), "dd/MM/yyyy")}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">
                              {item.nama}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              {item.ukuran}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                                item.status === "STERIL"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : item.status === "KOTOR"
                                    ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              )}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors text-slate-400 hover:text-slate-900 dark:hover:text-white">
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "barang" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Manajemen Stok Barang Reuse
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari barang..."
                      className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-black rounded-xl text-sm font-black hover:opacity-90 transition-all shadow-lg shadow-slate-200 dark:shadow-none">
                    <Plus className="h-4 w-4" />
                    TAMBAH
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        No
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nama Barang
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Kategori
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Steril
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Kotor
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Total Reuse
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {barangReuse
                      .filter((b) =>
                        b.nama.toLowerCase().includes(searchTerm.toLowerCase()),
                      )
                      .map((item, idx) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">
                              {item.nama}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              {item.ukuran}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-500 uppercase">
                              {item.kategori}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-emerald-600 dark:text-emerald-400">
                            {item.stok_steril}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-rose-600 dark:text-rose-400">
                            {item.stok_kotor}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-slate-900 dark:text-white">
                            {item.total_reuse}x
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 rounded-xl transition-colors">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500 rounded-xl transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "pemakaian" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Monitoring Pemakaian Real-time
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari pasien..."
                      className="pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-white transition-all w-full sm:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Waktu
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Pasien
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nama Alat
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Tipe
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                    {orders
                      .filter((o) =>
                        o.pasien
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()),
                      )
                      .map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                        >
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {format(new Date(order.tanggal), "HH:mm")}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">
                              {order.pasien}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              RM: {order.no_rm || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {order.items.map((it, idx) => (
                                <span
                                  key={idx}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                                    it.tipe === "R"
                                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800",
                                  )}
                                >
                                  {it.barang}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg">
                              R
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                                order.status_alkes_cssd === "READY"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                              )}
                            >
                              {order.status_alkes_cssd || "PENDING"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => markAsReady(order.id)}
                              disabled={order.status_alkes_cssd === "READY"}
                              className={cn(
                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all",
                                order.status_alkes_cssd === "READY"
                                  ? "bg-slate-100 text-slate-400 dark:bg-zinc-800 cursor-not-allowed"
                                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20",
                              )}
                            >
                              {order.status_alkes_cssd === "READY"
                                ? "SELESAI"
                                : "KONFIRMASI"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "laporan" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Rekapitulasi Penggunaan Alat Reuse
                </h2>
                <div className="flex items-center gap-2">
                  <select className="px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold focus:outline-none">
                    <option>April 2026</option>
                    <option>Maret 2026</option>
                  </select>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 transition-colors shadow-sm">
                    <Download className="h-4 w-4" />
                    EXPORT
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-100 dark:border-zinc-800">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Nama Barang
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Awal
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Masuk
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Pakai
                        </th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                          Gagal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {barangReuse.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">
                              {item.nama}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase">
                              {item.ukuran}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-500">
                            10
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-blue-500">
                            5
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-500">
                            {item.total_reuse}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-rose-500">
                            1
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4">
                  <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Preview Pesan WhatsApp
                    </h3>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl mb-4">
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 leading-relaxed">
                        Halo Dokter/Manajemen, Berikut Laporan Reuse April 2026:
                        <br />- Total Pemakaian: {totalReuse} Alat
                        <br />
                        - Tingkat Kegagalan: 3.4% (5 Alat)
                        <br />- Stok Kritis: Kateter Hisser (Sisa 2)
                      </p>
                    </div>
                    <button className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl text-sm font-black hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                      <MessageSquare className="h-4 w-4" />
                      KIRIM KE GRUP CATHLAB
                    </button>
                  </div>

                  <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Ringkasan Kualitas
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span>Success Rate</span>
                          <span className="text-emerald-400">96.6%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: "96.6%" }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span>Failure Rate</span>
                          <span className="text-rose-400">3.4%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-400 rounded-full"
                            style={{ width: "3.4%" }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-8 flex flex-col items-center gap-2 text-slate-400 dark:text-zinc-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="text-[10px] font-bold uppercase tracking-widest italic">
              Sistem Terintegrasi dengan Cathlab & Depo Farmasi
            </p>
          </div>
          <p className="text-[8px] font-black uppercase opacity-50">
            IDIK APP v2.0 - CSSD MODULE
          </p>
        </div>
      </div>
    </div>
  );
}
