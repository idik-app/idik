import { supabase } from "@/core/services/supabaseClient";
import { Tindakan } from "../domain/tindakan";

/** ⚙️ tindakanRepository v6.8 — Cathlab JARVIS Gold-Cyan Hybrid */
export const tindakanRepository = {
  /** 🔹 Ambil semua data tindakan (utama untuk statistik) */
  async getAll(): Promise<Tindakan[]> {
    const { data, error } = await supabase
      .from("tindakan_medik")
      .select("*")
      .order("tanggal", { ascending: false });

    if (error?.message?.includes("Could not find the table")) {
      console.warn("⚠️ Tabel tindakan_medik belum tersedia di Supabase.");
      return [];
    }
    if (error) {
      console.error("❌ tindakanRepository.getAll:", error.message);
      return [];
    }

    return (data as Tindakan[]) ?? [];
  },

  /** 🔹 Ambil data tindakan berdasarkan dokter */
  async getByDokter(dokter: string): Promise<Tindakan[]> {
    const { data, error } = await supabase
      .from("tindakan_medik")
      .select("*")
      .eq("dokter", dokter)
      .order("tanggal", { ascending: false });

    if (error) {
      console.error("❌ tindakanRepository.getByDokter:", error.message);
      return [];
    }
    return (data as Tindakan[]) ?? [];
  },

  /** 🔹 Tambah tindakan baru */
  async add(tindakan: Partial<Tindakan>): Promise<boolean> {
    const { error } = await supabase.from("tindakan_medik").insert([tindakan]);
    if (error) {
      console.error("❌ tindakanRepository.add:", error.message);
      return false;
    }
    return true;
  },

  /** 🔹 Update tindakan */
  async update(id: string, updateData: Partial<Tindakan>): Promise<boolean> {
    const { error } = await supabase
      .from("tindakan_medik")
      .update(updateData)
      .eq("id", id);
    if (error) {
      console.error("❌ tindakanRepository.update:", error.message);
      return false;
    }
    return true;
  },

  /** 🔹 Hapus tindakan */
  async remove(id: string): Promise<boolean> {
    const { error } = await supabase
      .from("tindakan_medik")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("❌ tindakanRepository.remove:", error.message);
      return false;
    }
    return true;
  },
};
