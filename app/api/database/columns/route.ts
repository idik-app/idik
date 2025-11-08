import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/app/api/audit/log";

export async function POST(req: Request) {
  const { table } = await req.json();

  if (!table)
    return NextResponse.json(
      { ok: false, message: "Parameter 'table' wajib dikirim." },
      { status: 400 }
    );

  try {
    const supabase = createAdminClient();

    // 🔹 Panggil fungsi SQL khusus di Supabase
    const { data: columns, error: errCols } = await supabase.rpc(
      "get_table_schema",
      {
        table_name: table,
      }
    );
    if (errCols) throw errCols;

    // 🔹 Ambil 10 sampel data dari tabel
    const { data: sample, error: errSample } = await supabase
      .from(table)
      .select("*")
      .limit(10);
    if (errSample) throw errSample;

    await logAudit("DB_SCHEMA_FETCH", {
      table,
      columns: columns?.length ?? 0,
      sample: sample?.length ?? 0,
    });

    return NextResponse.json({ ok: true, columns, sample });
  } catch (err: any) {
    await logAudit("DB_SCHEMA_FETCH_FAIL", { table, error: err.message });
    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch schema" },
      { status: 500 }
    );
  }
}
