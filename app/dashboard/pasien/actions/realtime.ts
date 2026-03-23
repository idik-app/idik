"use client";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/supabaseClient";
import { Pasien } from "../types/pasien";

// Simpan timer debounce global agar fetch tidak terlalu sering
let debounceTimer: NodeJS.Timeout | null = null;

/**
 * 📡 subscribePasienRealtime v6.6 — Anti-Spam Edition
 * - Mencegah fetch dan notifikasi berulang
 * - Jeda minimal antar-refresh: 2.5 detik
 * - Aman dari koneksi tidak stabil
 */
export function subscribePasienRealtime(
  onChange?: (updated: Pasien[]) => void,
  onEvent?: (type: "INSERT" | "UPDATE" | "DELETE", record: any) => void
) {
  if (!isSupabaseConfigured()) {
    // Supabase belum dikonfigurasi → jangan subscribe / ping agar UI tidak crash
    return () => {};
  }
  async function fetchLatestDebounced() {
    // blokir refresh beruntun
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("pasien")
          .select("*")
          .order("nama", { ascending: true });

        if (error) {
          console.warn("⚠️ Gagal memuat data pasien (diredam):", error.message);
          return;
        }

        if (Array.isArray(data) && typeof onChange === "function") {
          const mapped = data.map((p: any) => ({
            id: String(p.id),
            noRM: p.no_rm,
            nama: p.nama,
            jenisKelamin: p.jenis_kelamin ?? "L",
            tanggalLahir: p.tgl_lahir ?? "",
            alamat: p.alamat ?? "",
            noHP: p.no_telp ?? "",
            jenisPembiayaan: p.jenis_pembiayaan ?? "Umum",
            kelasPerawatan: p.kelas_perawatan ?? "Kelas 2",
            asuransi: p.asuransi ?? "",
          }));

          onChange(mapped);
        }
      } catch (err) {
        console.warn("⚠️ fetchLatest() gagal (diredam):", err);
      }
    }, 2500); // jeda 2.5 detik minimal antar-refresh
  }

  // Channel realtime utama
  const channel = supabase
    .channel("realtime-pasien")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pasien" },
      async (payload) => {
        await fetchLatestDebounced();

        if (typeof onEvent === "function") {
          const record = payload.new || payload.old || null;
          onEvent(payload.eventType as any, record);
        }
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") fetchLatestDebounced();
    });

  // Return fungsi cleanup
  return () => {
    try {
      supabase.removeChannel(channel);
    } catch (err) {
      console.warn("⚠️ Gagal hapus channel realtime:", err);
    }
  };
}
