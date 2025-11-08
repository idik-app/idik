// app/api/database/query/route.ts

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin"; // Import helper Admin
import { logAudit } from "@/app/api/audit/log";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { sql, user } = body;

  // 1. Validasi Input & Akses
  if (!sql || typeof sql !== "string") {
    return NextResponse.json(
      { ok: false, message: "Query SQL tidak ditemukan." },
      { status: 400 }
    );
  }

  // Keamanan: Hanya izinkan Admin (role: 'admin') menjalankan Raw SQL
  if (!user || user.role !== "admin") {
    await logAudit("RAW_SQL_ATTEMPT_DENIED", {
      sql: sql.substring(0, 50) + "...",
      user: user?.id || "unauthenticated",
    });
    return NextResponse.json(
      { ok: false, message: "Akses ditolak. Hanya Admin yang diizinkan." },
      { status: 403 }
    );
  }

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
      user: user.id,
    });
  } catch (error: any) {
    queryError = error.message;

    // Log audit untuk query yang gagal
    await logAudit("RAW_SQL_FAIL", {
      sql: sql,
      user: user.id,
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
