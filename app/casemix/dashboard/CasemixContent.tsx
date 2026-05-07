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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative flex h-screen min-h-0 min-w-0 flex-col gap-4 overflow-hidden bg-gradient-to-br from-[#F0F7FF] via-[#FFFFFF] to-[#E8F1FF] p-4 text-slate-900 [color-scheme:light]"
    >
      {/* 🚀 Header Casemix - Bright Modern Glassmorphism */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/60 px-6 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex items-center gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#3B82F6] text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)]">
            <Wallet size={28} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Casemix Dashboard
            </h1>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Verifikasi & Input BPJS
              </p>
            </div>
          </div>
        </div>

        {/* 👤 User Profile & Logout */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/80 p-2 pl-5 shadow-sm">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Authorized Operator
            </span>
            <span className="flex items-center gap-2 text-base font-bold text-slate-800">
              {username}
              <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200/50">
                <User size={16} className="text-slate-500" />
              </div>
            </span>
          </div>
          <div className="h-10 w-px bg-slate-100" />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-lg hover:shadow-red-100"
            title="Logout"
          >
            {loggingOut ? (
              <Loader2 size={20} className="animate-spin shrink-0" />
            ) : (
              <LogOut size={20} className="shrink-0 transition-transform group-hover:translate-x-1" />
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white bg-white/80 text-slate-900 shadow-[0_15px_40px_rgba(0,0,0,0.05)] backdrop-blur-md [color-scheme:light]">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CasemixTable 
            data={paginatedData}
            isLoading={adapter.loading}
            onRowClick={(id) => adapter.openDetail(id)}
            onBiayaSynced={adapter.syncListAfterAutosave}
          />
        </div>
        
        {/* 🔢 Pagination */}
        <div className="shrink-0 border-t border-slate-50 bg-white/90 px-4 py-2">
          <TablePagination
            variant="enterprise"
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
      <div className="shrink-0 opacity-75 transition-opacity duration-300 hover:opacity-100">
        <DiagnosticsHUD module="Casemix" variant="soft" />
      </div>

      {/* 🔍 Detail Drawer (Reuse from Tindakan) */}
      <TindakanDetailDrawer
        open={Boolean(adapter.detailOpenId)}
        initialTab="biaya"
        record={adapter.selectedRecord as TindakanJoinResult}
        onClose={adapter.closeDetailDrawer}
        onRecordPatch={adapter.syncListAfterAutosave}
      />
    </motion.div>
  );
}
