"use server";

import { createClient } from "@supabase/supabase-js";

interface DataPoint {
  day: string;
  total: number;
}

/** Jumlah tindakan per hari (7 hari terakhir) dari Supabase; jika gagal → 0 per hari. */
export async function getTindakanMingguan(): Promise<DataPoint[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase belum dikonfigurasi");

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("tindakan")
      .select("tanggal")
      .gte(
        "tanggal",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
      .lte("tanggal", new Date().toISOString());

    if (error) throw error;

    const countByDay: Record<string, number> = {};
    for (const row of data) {
      const day = new Date(row.tanggal).toLocaleDateString("id-ID", {
        weekday: "short",
      });
      countByDay[day] = (countByDay[day] || 0) + 1;
    }

    const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    return days.map((d) => ({ day: d, total: countByDay[d] || 0 }));
  } catch {
    const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    return days.map((d) => ({ day: d, total: 0 }));
  }
}
