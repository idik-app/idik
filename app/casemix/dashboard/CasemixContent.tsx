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
      className="relative flex h-screen min-h-0 min-w-0 flex-col gap-4 overflow-hidden bg-[#F0F7FF] p-4 text-slate-900 [color-scheme:light] dark:bg-slate-950 dark:text-slate-100"
    >
      {/* 🚀 Header Casemix - Bright & Clean */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-2xl border border-white bg-white/90 px-6 py-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-900/80 dark:shadow-none">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <Wallet size={24} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-blue-900 dark:text-white">
              Casemix Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-400 dark:text-blue-300">
                Medical Verification System
              </p>
            </div>
          </div>
        </div>

        {/* 👤 User Profile & Logout */}
        <div className="flex items-center gap-4 rounded-xl border border-blue-50 bg-blue-50/30 p-1.5 pl-4 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 dark:text-slate-500">
              Active User
            </span>
            <span className="flex items-center gap-2 text-sm font-extrabold text-blue-900 dark:text-slate-200">
              {username}
              <div className="h-6 w-6 rounded-lg bg-blue-100 flex items-center justify-center dark:bg-slate-700">
                <User size={14} className="text-blue-500 dark:text-slate-400" />
              </div>
            </span>
          </div>
          <div className="h-8 w-px bg-blue-100 dark:bg-slate-700" />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="group flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 hover:shadow-md dark:bg-slate-900 dark:hover:bg-red-950/30"
            title="Logout"
          >
            {loggingOut ? (
              <Loader2 size={18} className="animate-spin shrink-0" />
            ) : (
              <LogOut size={18} className="shrink-0 transition-transform group-hover:translate-x-0.5" />
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white bg-white/80 text-slate-900 shadow-2xl shadow-blue-100/40 backdrop-blur-md [color-scheme:light] dark:border-slate-800/50 dark:bg-slate-900/50 dark:text-slate-100 dark:shadow-none">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CasemixTable 
            data={paginatedData}
            isLoading={adapter.loading}
            onRowClick={(id) => adapter.openDetail(id)}
            onBiayaSynced={adapter.syncListAfterAutosave}
          />
        </div>
        
        {/* 🔢 Pagination */}
        <div className="shrink-0 border-t border-blue-50 bg-white/60 px-2 dark:border-slate-800/50 dark:bg-slate-900/40">
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
