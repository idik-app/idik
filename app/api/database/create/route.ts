import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin, requireEnvFlag } from "@/lib/auth/guards";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY!
);

function isSafeIdentifier(name: unknown) {
  return typeof name === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function normalizeColumnType(type: unknown) {
  if (typeof type !== "string") return null;
  const t = type.trim().toLowerCase();
  const allowed = new Set([
    "text",
    "uuid",
    "int",
    "integer",
    "bigint",
    "boolean",
    "timestamp",
    "timestamptz",
    "date",
    "numeric",
    "jsonb",
  ]);
  return allowed.has(t) ? t : null;
}

export async function POST(req: Request) {
  const disabled = requireEnvFlag(
    "ENABLE_DDL_API",
    "DDL API disabled"
  );
  if (disabled) return disabled.response;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const { tableName, columns } = await req.json();

    // validasi minimal
    if (!tableName || !Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    if (!isSafeIdentifier(tableName)) {
      return NextResponse.json(
        { error: "Nama tabel tidak valid" },
        { status: 400 }
      );
    }

    // generate SQL
    const columnDefs = columns
      .map((c: { name: unknown; type: unknown }) => {
        if (!isSafeIdentifier(c?.name)) return null;
        const t = normalizeColumnType(c?.type);
        if (!t) return null;
        return `${c.name} ${t}`;
      })
      .filter(Boolean)
      .join(", ");

    if (!columnDefs) {
      return NextResponse.json(
        { error: "Definisi kolom tidak valid" },
        { status: 400 }
      );
    }

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
