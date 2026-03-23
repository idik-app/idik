"use server";

import { createClient } from "@supabase/supabase-js";

interface Tindakan {
  tanggal: string;
  dokter: string;
  tindakan: string;
}

/** Mengambil 5 tindakan terbaru dari Supabase (tanpa data lokal palsu). */
export async function getTindakanTerbaru(): Promise<Tindakan[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase belum dikonfigurasi");

    const supabase = createClient(url, key);

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
