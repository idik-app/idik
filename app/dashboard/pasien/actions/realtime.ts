"use client";
import { createClient } from "@supabase/supabase-js";
import { Pasien } from "../types/pasien";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* 📡 Sinkronisasi realtime dengan notifikasi */
export function subscribePasienRealtime(
  onChange: (updated: Pasien[]) => void,
  onEvent?: (type: "INSERT" | "UPDATE" | "DELETE", record: any) => void
) {
  async function fetchLatest() {
    const { data } = await supabase
      .from("pasien")
      .select("*")
      .order("nama", { ascending: true });
    if (data) {
      onChange(
        data.map((p: any) => ({
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
        }))
      );
    }
  }

  const channel = supabase
    .channel("realtime-pasien")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pasien" },
      async (payload) => {
        await fetchLatest();
        if (onEvent)
          onEvent(payload.eventType as any, payload.new || payload.old);
      }
    )
    .subscribe();

  fetchLatest();
  return () => supabase.removeChannel(channel);
}
