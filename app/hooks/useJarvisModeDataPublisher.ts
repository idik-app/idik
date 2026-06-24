"use client";

import { useEffect } from "react";

import { useJarvisModeOptional } from "@/contexts/JarvisModeContext";
import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import type { TindakanFilteredSummary } from "@/app/dashboard/layanan/tindakan/components/TindakanSummary";

type PublisherInput = {
  stats: Record<string, number>;
  filtered?: TindakanFilteredSummary | null;
  allRows?: readonly TindakanJoinResult[];
  loading?: boolean;
};

/**
 * Sinkronkan data Cath Lab (Google Sheets → Supabase bridge) ke JARVIS Mode overlay.
 * Pasang di `TindakanDashboard` atau modul yang memegang snapshot tabel.
 */
export function useJarvisModeDataPublisher(input: PublisherInput) {
  const ctx = useJarvisModeOptional();
  const setData = ctx?.setData;

  useEffect(() => {
    if (!setData) return;
    setData({
      stats: input.stats,
      filtered: input.filtered,
      allRows: input.allRows ?? input.filtered?.allRows,
      loading: input.loading,
    });
  }, [
    setData,
    input.stats,
    input.filtered,
    input.allRows,
    input.loading,
  ]);
}
