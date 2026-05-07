"use client";

import { motion } from "framer-motion";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useTindakanBridgeAdapter } from "@/app/dashboard/layanan/tindakan/bridge/useTindakanBridgeAdapter";
import DiagnosticsHUD from "@/components/DiagnosticsHUD";
import { Wallet, LogOut, User, Loader2 } from "lucide-react";
import CasemixToolbar from "./components/CasemixToolbar";
import CasemixTable from "./components/CasemixTable";
import TablePagination from "@/app/dashboard/layanan/tindakan/components/TablePagination";
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative flex h-screen min-h-0 min-w-0 flex-col gap-3 overflow-hidden bg-[#E6EEF7] p-3 text-[#333333] [color-scheme:light] dark:bg-neutral-950 dark:text-neutral-200"
    >
      {/* 🚀 Header Casemix - Classic Hospital Theme */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-sm border border-[#A3B8CC] bg-[#003366] px-3 py-2.5 text-white shadow-sm dark:border-[#A3B8CC]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-white/25 bg-white/10">
            <Wallet size={18} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight text-white dark:text-white">
              Sistem Informasi RSUD DR. M. SOEWANDHIE - Casemix
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D0E0F0] dark:text-white/85">
              Verifikasi & Input BPJS / JKN
            </p>
          </div>
        </div>

        {/* 👤 User Profile & Logout */}
        <div className="flex items-center gap-3 rounded-sm border border-[#A3B8CC] bg-[#F0F5FA] px-3 py-2 text-[#333333] dark:border-[#A3B8CC] dark:bg-neutral-900 dark:text-white">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#555555] dark:text-white/85">
              Logged in as
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-black dark:text-white">
              <User size={13} className="text-[#003366] dark:text-[#7EB8FF]" />
              {username}
            </span>
          </div>
          <div className="h-7 w-px bg-[#A3B8CC] dark:bg-neutral-600" />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-[#C62828]/45 bg-white text-[#C62828] transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/50 dark:bg-neutral-800 dark:text-red-300 dark:hover:bg-neutral-700"
            title="Logout"
          >
            {loggingOut ? (
              <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
              <LogOut size={16} className="shrink-0" />
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-[#A3B8CC] bg-white text-neutral-900 shadow-sm [color-scheme:light] dark:border-[#A3B8CC] dark:bg-white dark:text-neutral-900">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CasemixTable 
            data={paginatedData}
            isLoading={adapter.loading}
            onBiayaSynced={adapter.syncListAfterAutosave}
          />
        </div>
        
        {/* 🔢 Pagination */}
        <div className="shrink-0 border-t border-[#A3B8CC] bg-[#F0F5FA] px-2 dark:border-[#A3B8CC] dark:bg-neutral-900">
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

    </motion.div>
  );
}
