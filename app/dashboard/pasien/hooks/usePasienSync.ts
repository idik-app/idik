"use client";
import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePasienRealtime } from "./usePasienRealtime";
import { Pasien } from "../types/pasien";
import { mapFromSupabase } from "../data/pasienSchema";

export function usePasienSync(
  setPatients: React.Dispatch<React.SetStateAction<Pasien[]>>
) {
  const initialized = useRef(false);

  const syncPasien = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("pasien")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const mapped = data.map((p: any) => mapFromSupabase(p)) as Pasien[];

        setPatients(mapped);
      }
    } catch (err) {
      console.warn("⚠️ Gagal memuat data pasien:", err);
    }
  }, [setPatients]);

  usePasienRealtime(setPatients);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    syncPasien();
  }, [syncPasien]);

  useEffect(() => {
    const timer = setInterval(syncPasien, 300000);
    return () => clearInterval(timer);
  }, [syncPasien]);

  return { syncPasien };
}
