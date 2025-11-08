"use client";
import { createContext, useContext, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { usePasienState } from "./states/usePasienState";
import { usePasienStats } from "../hooks/usePasienStats";
import { refreshPatients } from "../actions/refreshPatients";

const PasienContext = createContext<any>(null);

// 🔗 Supabase client global
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * 🧠 PasienProvider v4.0 Stable Realtime
 * Menampilkan data awal & auto-sync semua perubahan CRUD pasien.
 */
export function PasienProvider({ children }: { children: React.ReactNode }) {
  const base = usePasienState();
  const stats = usePasienStats(base.patients);

  useEffect(() => {
    // 🔹 Muat data awal saat komponen pertama kali dipasang
    async function loadInitial() {
      const fresh = await refreshPatients();
      base.setPatients(fresh);
    }
    loadInitial();

    // 🔹 Aktifkan listener realtime untuk semua event di tabel pasien
    const channel = supabase
      .channel("pasien-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pasien" },
        async () => {
          const fresh = await refreshPatients();
          base.setPatients(fresh);
        }
      )
      .subscribe();

    // 🔹 Bersihkan channel saat unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  /** 🎯 Kontrol seleksi & modal */
  function selectPatient(
    id: string | null,
    mode: "view" | "edit" | "add" | null = "view"
  ) {
    const found = id
      ? base.patients.find((p: any) => p.id === id) || null
      : null;
    base.setSelectedPatient(found);
    base.setModalMode(mode);
  }

  function openAddModal() {
    base.setSelectedPatient(null);
    base.setModalMode("add");
  }

  function clearSelection() {
    base.setSelectedPatient(null);
    base.setModalMode(null);
  }

  const contextValue = {
    ...base,
    stats: stats.total > 0 ? stats : { total: 0, male: 0, female: 0 },
    selectPatient,
    openAddModal,
    clearSelection,
    closeModal: clearSelection,
  };

  return (
    <PasienContext.Provider value={contextValue}>
      {children}
    </PasienContext.Provider>
  );
}

/** 🧩 Hook akses global pasien */
export function usePasien() {
  const ctx = useContext(PasienContext);
  if (!ctx) throw new Error("usePasien must be used within PasienProvider");
  return ctx;
}
