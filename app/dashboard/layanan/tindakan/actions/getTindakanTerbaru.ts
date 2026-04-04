"use server";

import { createAdminClient } from "@/lib/supabase/admin";

interface Tindakan {
  tanggal: string;
  dokter: string;
  tindakan: string;
}

/** Mengambil 5 tindakan terbaru dari Supabase (tanpa data lokal palsu). */
export async function getTindakanTerbaru(): Promise<Tindakan[]> {
  try {
    const supabase = createAdminClient(true);

    const { data, error } = await supabase
      .from("tindakan")
      .select(
        `
        tanggal,
        nama_tindakan,
        dokter:dokter_id ( nama_dokter )
        `
      )
      .order("tanggal", { ascending: false })
      .limit(5);

    if (error) throw error;

    const rows = (data ?? []) as any[];

    return rows.map((row) => {
      const dokterRel = row?.dokter;
      const dokterNama = Array.isArray(dokterRel)
        ? dokterRel?.[0]?.nama_dokter
        : dokterRel?.nama_dokter;

      return {
        tanggal: new Date(row.tanggal).toLocaleDateString("id-ID"),
        dokter: dokterNama || "-",
        tindakan: row.nama_tindakan,
      };
    });
  } catch {
    return [];
  }
}
