"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { motion } from "framer-motion";
import { Pasien } from "../types/pasien";
import { usePasienLoader } from "./usePasienLoader";
import { usePasienRealtime } from "./usePasienRealtime";
import { usePasienFilter } from "./usePasienFilter";
import { supabase } from "@/lib/supabaseClient";

/* ==========================================================
   🧠 Context Type Definition
========================================================== */
interface PasienContextType {
  patients: Pasien[];
  setPatients: React.Dispatch<React.SetStateAction<Pasien[]>>;
  filteredPatients: Pasien[];
  paginatedPatients: Pasien[];
  modalMode: "add" | "edit" | "view" | null;
  setModalMode: (m: "add" | "edit" | "view" | null) => void;
  selectedPatient: Pasien | null;
  setSelectedPatient: (p: Pasien | null) => void;
  pendingDelete: Pasien | null;
  setPendingDelete: (p: Pasien | null) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  pasienActionStatus: string | null;
  setPasienActionStatus: (v: string | null) => void;
  stats: Record<string, number>;
  insight: string | null;
  filterPembiayaan: string;
  setFilterPembiayaan: (v: string) => void;
  filterKelas: string;
  setFilterKelas: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  rowsPerPage: number;
  setRowsPerPage: (v: number) => void;
  syncPasien: () => Promise<void>;
}

/* ==========================================================
   ⚙️ Create Context
========================================================== */
const PasienContext = createContext<PasienContextType | undefined>(undefined);

/* ==========================================================
   🧩 Provider Implementation
========================================================== */
export function PasienProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<Pasien[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Pasien | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Pasien | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view" | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pasienActionStatus, setPasienActionStatus] = useState<string | null>(
    null
  );

  /* 🩺 Loader awal */
  const { loading, refresh: loaderRefresh } = usePasienLoader(setPatients);

  /* 🔁 Sync manual */
  const syncPasien = useCallback(async () => {
    const { data, error } = await supabase.from("pasien").select("*");
    if (!error && data) setPatients(data as Pasien[]);
  }, []);

  /* ⚡ Realtime listener */
  usePasienRealtime(setPatients);

  /* ⏱️ Auto-refresh 1 menit */
  useEffect(() => {
    const interval = setInterval(syncPasien, 60000);
    return () => clearInterval(interval);
  }, [syncPasien]);

  /* 🔍 Filter */
  const [filterPembiayaan, setFilterPembiayaan] = useState("Semua");
  const [filterKelas, setFilterKelas] = useState("Semua");

  const filteredSource = patients.filter((p) => {
    const byPembiayaan =
      filterPembiayaan === "Semua" ||
      (p.jenisPembiayaan || "").includes(filterPembiayaan);
    const byKelas =
      filterKelas === "Semua" || (p.kelasPerawatan || "") === filterKelas;
    return byPembiayaan && byKelas;
  });

  const {
    filteredPatients,
    paginatedPatients,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    rowsPerPage,
    setRowsPerPage,
  } = usePasienFilter(filteredSource);

  /* 📊 Statistik dan insight */
  const [stats, setStats] = useState<Record<string, number>>({});
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (!patients.length) return;
    const today = new Date().toLocaleDateString("id-ID");
    setStats({
      total: patients.length,
      hariIni: patients.filter(
        (p) =>
          p.created_at &&
          new Date(p.created_at).toLocaleDateString("id-ID") === today
      ).length,
      bpjs: patients.filter((p) => p.jenisPembiayaan?.includes("BPJS")).length,
      umum: patients.filter((p) => p.jenisPembiayaan === "Umum").length,
      asuransi: patients.filter((p) => p.jenisPembiayaan === "Asuransi").length,
    });
  }, [patients]);

  useEffect(() => {
    if (!filteredSource.length) {
      setInsight("❌ Tidak ada data sesuai filter yang dipilih.");
      return;
    }
    const total = filteredSource.length;
    const bpjs = filteredSource.filter((p) =>
      p.jenisPembiayaan?.includes("BPJS")
    ).length;
    const umum = filteredSource.filter(
      (p) => p.jenisPembiayaan === "Umum"
    ).length;
    const asuransi = filteredSource.filter(
      (p) => p.jenisPembiayaan === "Asuransi"
    ).length;
    let rekomendasi = "";
    if (bpjs / total > 0.7)
      rekomendasi = "Mayoritas pasien BPJS — periksa kuota klaim.";
    else if (umum / total > 0.6)
      rekomendasi = "Dominasi pasien umum — potensi tindakan elektif tinggi.";
    else if (asuransi / total > 0.5)
      rekomendasi = "Banyak pasien asuransi — pantau approval.";
    else rekomendasi = "Distribusi pembiayaan seimbang.";
    setInsight(
      `📊 Filter ${filterPembiayaan}/${filterKelas}. Total ${total}. 💡 ${rekomendasi}`
    );
  }, [filteredSource, filterPembiayaan, filterKelas]);

  /* 💾 Context value */
  const contextValue: PasienContextType = {
    patients,
    setPatients,
    filteredPatients,
    paginatedPatients,
    modalMode,
    setModalMode,
    selectedPatient,
    setSelectedPatient,
    pendingDelete,
    setPendingDelete,
    isProcessing,
    setIsProcessing,
    pasienActionStatus,
    setPasienActionStatus,
    stats,
    insight,
    filterPembiayaan,
    setFilterPembiayaan,
    filterKelas,
    setFilterKelas,
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    totalPages,
    rowsPerPage,
    setRowsPerPage,
    syncPasien,
  };

  /* ⏳ Loading UI */
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div className="w-12 h-12 border-4 border-cyan-400 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );

  return (
    <PasienContext.Provider value={contextValue}>
      {isProcessing && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <motion.div
            className="w-20 h-20 border-4 border-yellow-400 rounded-full shadow-[0_0_25px_4px_rgba(255,215,0,0.4)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />
        </div>
      )}
      {children}
    </PasienContext.Provider>
  );
}

/* ==========================================================
   🔗 Hook Akses Global
========================================================== */
export const usePasien = () => {
  const ctx = useContext(PasienContext);
  if (!ctx) throw new Error("usePasien must be used within PasienProvider");
  return ctx;
};
