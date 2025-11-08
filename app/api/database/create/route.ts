import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // gunakan SERVICE_KEY, bukan anon
);

export async function POST(req: Request) {
  try {
    const { tableName, columns } = await req.json();

    // validasi minimal
    if (!tableName || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    // generate SQL
    const columnDefs = columns
      .map((c: { name: string; type: string }) => `${c.name} ${c.type}`)
      .join(", ");

    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs});`;

    // jalankan query SQL
    const { error } = await supabase.rpc("exec_sql", { query: sql });

    if (error) throw error;

    return NextResponse.json({ message: `Tabel ${tableName} berhasil dibuat` });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
