"use client";

import { useEffect } from "react";

import type { PasienOption } from "@/components/ui/pasien-combobox";
import { useJarvisModeOptional } from "@/contexts/JarvisModeContext";
import type { TindakanJoinResult } from "@/app/dashboard/layanan/tindakan/bridge/mapping.types";
import type { TindakanFilteredSummary } from "@/app/dashboard/layanan/tindakan/components/TindakanSummary";

type PublisherInput = {
  stats?: Record<string, number>;
  filtered?: TindakanFilteredSummary | null;
  allRows?: readonly TindakanJoinResult[];
  pasienOptions?: readonly PasienOption[];
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
      ...(input.stats !== undefined && { stats: input.stats }),
      ...(input.filtered !== undefined && { filtered: input.filtered }),
      ...(input.allRows !== undefined && {
        allRows: input.allRows ?? input.filtered?.allRows,
      }),
      ...(input.pasienOptions !== undefined && {
        pasienOptions: input.pasienOptions,
      }),
      ...(input.loading !== undefined && { loading: input.loading }),
    });
  }, [
    setData,
    input.stats,
    input.filtered,
    input.allRows,
    input.pasienOptions,
    input.loading,
  ]);
}
