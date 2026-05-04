"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTindakanBridgeAdapter } from "@/app/dashboard/layanan/tindakan/bridge/useTindakanBridgeAdapter";
import DiagnosticsHUD from "@/components/DiagnosticsHUD";
import { Wallet, LogOut, User, Loader2 } from "lucide-react";
import CasemixToolbar from "./components/CasemixToolbar";
import CasemixTable from "./components/CasemixTable";
import TablePagination from "@/app/dashboard/layanan/tindakan/components/TablePagination";
import TindakanDetailDrawer from "@/app/dashboard/layanan/tindakan/components/TindakanDetailDrawer";
import { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import { useSession } from "@/app/contexts/SessionContext";

export default function CasemixContent() {
  const adapter = useTindakanBridgeAdapter();
  const { username, resetSession } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });

  const handleLogout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // 1. Audit log logout
      await fetch("/api/system/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logout",
          module: "CasemixDashboard",
          metadata: { device: navigator.userAgent },
        }),
      }).catch(() => {});

      // 2. Clear session di server (cookie)
      await fetch("/api/auth", { method: "DELETE" }).catch(() => {});

      // 3. Reset local state
      resetSession();
      localStorage.removeItem("idik_user");
      
      // 4. Redirect
      window.location.href = "/";
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/";
    }
  }, [loggingOut, resetSession]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const onRefresh = async () => {
    setIsLoading(true);
    try {
      await adapter.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  // Filter & Search Logic
  const filteredData = useMemo(() => {
    let list = (adapter.tindakanList as TindakanJoinResult[]) || [];
    
    // Debug log untuk melihat data mentah dari adapter
    console.log("[Casemix] Data dari adapter:", list.length);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => 
        (r.nama_pasien || "").toLowerCase().includes(q) || 
        (r.no_rm || "").toLowerCase().includes(q)
      );
    }

    if (dateFilter.from) {
      list = list.filter(r => r.tanggal && r.tanggal >= dateFilter.from);
    }
    if (dateFilter.to) {
      list = list.filter(r => r.tanggal && r.tanggal <= dateFilter.to);
    }

    return list;
  }, [adapter.tindakanList, search, dateFilter]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    console.log(`[Casemix] Pagination: page=${currentPage}, size=${pageSize}, start=${start}, end=${end}, total=${filteredData.length}`);
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, pageSize]);

  // Initial data load
  useEffect(() => {
    if (adapter.tindakanList.length === 0 && !adapter.loading && !adapter.error) {
      void adapter.refresh();
    }
  }, [adapter.tindakanList.length, adapter.loading, adapter.error]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative flex h-screen min-h-0 min-w-0 flex-col gap-4 overflow-hidden bg-gradient-to-br from-black via-gray-900 to-cyan-950 p-4"
    >
      {/* 🚀 Header Casemix */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Wallet size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Casemix Dashboard
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-500/70">
              Verifikasi & Input Perolehan BPJS
            </p>
          </div>
        </div>

        {/* 👤 User Profile & Logout */}
        <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2 backdrop-blur-sm">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-500/50">
              Logged in as
            </span>
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <User size={14} className="text-cyan-400" />
              {username}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-white/10" />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
            title="Logout"
          >
            {loggingOut ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <LogOut size={18} className="transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* 🛠 Toolbar */}
      <CasemixToolbar 
        onRefresh={onRefresh}
        isLoading={isLoading || adapter.loading}
        onSearch={setSearch}
        onFilter={(from, to) => setDateFilter({ from, to })}
      />

      {/* 📋 Tabel Tindakan */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/5 bg-black/40 shadow-2xl backdrop-blur-md overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <CasemixTable 
            data={paginatedData}
            isLoading={adapter.loading}
            onRowClick={(id) => adapter.openDetail(id)}
          />
        </div>
        
        {/* 🔢 Pagination */}
        <div className="shrink-0 border-t border-white/5 bg-white/[0.02] px-2">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[25, 50, 100]}
          />
        </div>
      </div>

      {/* 🧠 Diagnostics HUD */}
      <div className="shrink-0 opacity-40 hover:opacity-100 transition-opacity duration-300">
        <DiagnosticsHUD module="Casemix" />
      </div>

      {/* 🔍 Detail Drawer (Reuse from Tindakan) */}
      <TindakanDetailDrawer
        open={Boolean(adapter.detailOpenId)}
        initialTab="biaya"
        record={adapter.selectedRecord as TindakanJoinResult}
        onClose={adapter.closeDetailDrawer}
        onRecordPatch={adapter.refresh}
      />
    </motion.div>
  );
}
