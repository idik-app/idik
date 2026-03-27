import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server-";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienValidation";
import { mapSheetRowToPasien } from "@/app/dashboard/pasien/data/pasienImportMap";
import { mapToSupabase } from "@/app/dashboard/pasien/data/pasienSchema";
import { logPasienAudit } from "@/lib/audit/logPasien";

const MAX_ROWS = 2000;
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

/*───────────────────────────────────────────────
 📡 POST /api/pasien/import
 - Upload file Excel/CSV → parse → validasi → insert ke Supabase (tabel pasien)
 - Kombinasi spreadsheet + IDIK-App + Supabase
───────────────────────────────────────────────*/
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File tidak ditemukan. Gunakan field 'file'." },
        { status: 400 }
      );
    }

    const type = file.type?.toLowerCase() || "";
    const name = (file.name || "").toLowerCase();
    const isCsv = name.endsWith(".csv") || type === "text/csv";
    const isExcel =
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      ALLOWED_TYPES.some((t) => type.includes(t));
    if (!isCsv && !isExcel) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv.",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = isCsv
      ? XLSX.read(buffer, { type: "buffer", raw: true })
      : XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) {
      return NextResponse.json(
        { ok: false, error: "Sheet kosong atau tidak terbaca." },
        { status: 400 }
      );
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      defval: "",
      raw: false,
    });

    if (rows.length === 0) {
      return NextResponse.json(
        { ok: true, imported: 0, failed: 0, errors: [], message: "Tidak ada baris data." },
        { status: 200 }
      );
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Maksimal ${MAX_ROWS} baris per import. File Anda: ${rows.length} baris.`,
        },
        { status: 400 }
      );
    }

    const toInsert: Record<string, unknown>[] = [];
    const errors: { row: number; noRM?: string; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped = mapSheetRowToPasien(row);
      const parsed = pasienSchema.safeParse(mapped);
      if (!parsed.success) {
        const first = parsed.error.flatten().fieldErrors;
        const msg = Object.entries(first)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
          .join("; ");
        errors.push({
          row: i + 2,
          noRM: mapped.noRM as string,
          message: msg,
        });
        continue;
      }
      toInsert.push(mapToSupabase(parsed.data));
    }

    if (toInsert.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          imported: 0,
          failed: rows.length,
          errors: errors.slice(0, 50),
          message: "Tidak ada baris yang valid. Perbaiki data lalu coba lagi.",
        },
        { status: 200 }
      );
    }

    const supabase = await createClient();
    const { data: inserted, error } = await supabase
      .from("pasien")
      .insert(toInsert)
      .select("id");

    if (error) {
      console.error("❌ Supabase bulk insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal menyimpan ke database." },
        { status: 500 }
      );
    }

    const userId = (await supabase.auth.getUser()).data?.user?.id;
    await logPasienAudit(
      "IMPORT",
      {
        count: inserted?.length ?? toInsert.length,
        failed: errors.length,
        source: "spreadsheet",
      },
      userId
    );

    return NextResponse.json(
      {
        ok: true,
        imported: inserted?.length ?? toInsert.length,
        failed: errors.length,
        errors: errors.slice(0, 50),
        message:
          errors.length > 0
            ? `${inserted?.length ?? 0} pasien berhasil diimpor, ${errors.length} baris gagal validasi.`
            : `${inserted?.length ?? 0} pasien berhasil diimpor ke Supabase.`,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    console.error("❌ Import pasien error:", err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
