"use client";
import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePasienRealtime } from "./usePasienRealtime";
import { Pasien } from "../types/pasien";

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
        const mapped = data.map(
          (p: any): Pasien => ({
            id: String(p.id),
            noRM: p.no_rm ?? "",
            nama: p.nama ?? "",
            jenisKelamin: p.jk ?? "L",
            tanggalLahir: p.tanggal_lahir ?? "",
            alamat: p.alamat ?? "",
            noHP: p.no_hp ?? "",
            jenisPembiayaan: p.pembiayaan ?? "Umum",
            kelasPerawatan: p.kelas ?? "Kelas 2",
            asuransi: p.asuransi ?? "",
            created_at: p.created_at ?? "",
            updated_at: p.updated_at ?? "",
          })
        );

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
