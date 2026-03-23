// app/api/database/query/route.ts

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin"; // Import helper Admin
import { logAudit } from "@/app/api/audit/log";
import { requireAdmin, requireEnvFlag } from "@/lib/auth/guards";

export async function POST(req: Request) {
  const disabled = requireEnvFlag(
    "ENABLE_RAW_SQL_API",
    "RAW SQL API disabled"
  );
  if (disabled) return disabled.response;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { sql } = body;

  // 1. Validasi Input & Akses
  if (!sql || typeof sql !== "string") {
    return NextResponse.json(
      { ok: false, message: "Query SQL tidak ditemukan." },
      { status: 400 }
    );
  }

  // Keamanan: Admin sudah divalidasi server-side (Supabase/JWT cookie)

  let queryResult: any = null;
  let queryError: any = null;

  try {
    // 2. Inisialisasi Supabase Admin Client
    const supabaseAdmin = createAdminClient();

    // 3. Panggil Fungsi PostgreSQL Kustom ('execute_raw_sql')
    const { data, error } = await supabaseAdmin.rpc("execute_raw_sql", {
      sql_query: sql, // Kirim string SQL mentah
    });

    queryResult = data;
    queryError = error;

    if (queryError) {
      throw new Error(`DB Error [${queryError.code}]: ${queryError.message}`);
    }

    // 4. Log Audit Sukses
    await logAudit("RUN_RAW_SQL_SUCCESS", {
      sql: sql,
      user: admin.userId,
    });
  } catch (error: any) {
    queryError = error.message;

    // Log audit untuk query yang gagal
    await logAudit("RAW_SQL_FAIL", {
      sql: sql,
      user: admin.userId,
      error: error.message,
    });

    // Kembalikan error SQL ke frontend
    return NextResponse.json(
      { ok: false, message: `Eksekusi Gagal: ${error.message}` },
      { status: 400 }
    );
  }

  // 5. Response Sukses
  return NextResponse.json(
    {
      ok: true,
      data: queryResult, // Berisi hasil data atau status DML dari fungsi RPC
      message: "Query berhasil dijalankan.",
    },
    { status: 200 }
  );
}
