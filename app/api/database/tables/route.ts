import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/app/api/audit/log";

export async function GET() {
  try {
    console.log("Testing Supabase connection...");
    const supabase = createAdminClient();

    // ✅ gunakan fungsi Postgres yang aman, bukan information_schema langsung
    const { data, error } = await supabase.rpc("list_all_tables");

    if (error) throw error;

    const tables = data.map((t: { table_name: string }) => t.table_name);
    const lastSync = new Date().toLocaleString("id-ID");

    await logAudit("DB_AUTODISCOVERY", {
      tables: tables.length,
      time: lastSync,
    });

    return NextResponse.json({
      ok: true,
      tables,
      lastSync,
    });
  } catch (err: any) {
    await logAudit("DB_AUTODISCOVERY_FAIL", {
      error: err.message,
      time: new Date().toISOString(),
    });

    return NextResponse.json(
      { ok: false, message: err.message || "Failed to fetch tables" },
      { status: 500 }
    );
  }
}
