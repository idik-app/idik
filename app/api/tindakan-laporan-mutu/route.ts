import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const UNIT_SLUG = "idik";
const REPORT_IDS = [
  "penundaan-elektif",
  "identifikasi-pasien",
  "e-report-tanpa-kesalahan",
  "kepatuhan-apd",
  "kebersihan-tangan",
] as const;

type ReportId = (typeof REPORT_IDS)[number];

type MutuRow = {
  tanggal: string;
  numerator: string;
  denominator: string;
};

type MonthlyPayload = {
  roomName: string;
  dayCount: number;
  reports: Partial<Record<ReportId, { rows: MutuRow[] }>>;
};

function isValidMonthYyyyMm(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function sanitizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeNumericText(value: unknown): string {
  return String(value ?? "").replace(/[^\d.,-]/g, "").trim();
}

function sanitizeRows(raw: unknown, dayCount: number): MutuRow[] {
  const rows = Array.isArray(raw) ? raw : [];
  return Array.from({ length: dayCount }, (_, index) => {
    const row = rows[index] as Record<string, unknown> | undefined;
    return {
      tanggal: sanitizeText(row?.tanggal || String(index + 1)),
      numerator: sanitizeNumericText(row?.numerator),
      denominator: sanitizeNumericText(row?.denominator),
    };
  });
}

function sanitizeReports(raw: unknown, dayCount: number): MonthlyPayload["reports"] {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const next: MonthlyPayload["reports"] = {};
  for (const reportId of REPORT_IDS) {
    const entry =
      source[reportId] && typeof source[reportId] === "object"
        ? (source[reportId] as Record<string, unknown>)
        : null;
    next[reportId] = {
      rows: sanitizeRows(entry?.rows, dayCount),
    };
  }
  return next;
}

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { searchParams } = new URL(req.url);
  const monthYyyyMm = sanitizeText(searchParams.get("monthYyyyMm"));
  if (!isValidMonthYyyyMm(monthYyyyMm)) {
    return NextResponse.json(
      { ok: false, message: "Parameter monthYyyyMm tidak valid." },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient(true);
    const { data, error } = await supabase
      .from("tindakan_laporan_mutu_monthly")
      .select("month_yyyymm,room_name,day_count,reports")
      .eq("unit_slug", UNIT_SLUG)
      .eq("month_yyyymm", monthYyyyMm)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({
        ok: true,
        data: null,
      });
    }

    const dayCount = Number(data.day_count) || 31;
    return NextResponse.json({
      ok: true,
      data: {
        monthYyyyMm: data.month_yyyymm,
        roomName: sanitizeText(data.room_name || "IDIK") || "IDIK",
        dayCount,
        reports: sanitizeReports(data.reports, dayCount),
      } satisfies MonthlyPayload & { monthYyyyMm: string },
    });
  } catch (err: any) {
    console.error("[GET /api/tindakan-laporan-mutu]", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Gagal memuat laporan mutu." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const body = await req.json();
    const monthYyyyMm = sanitizeText(body?.monthYyyyMm);
    const roomName = sanitizeText(body?.roomName || "IDIK") || "IDIK";
    const dayCount = Math.max(1, Math.min(31, Number(body?.dayCount) || 31));

    if (!isValidMonthYyyyMm(monthYyyyMm)) {
      return NextResponse.json(
        { ok: false, message: "Bulan laporan tidak valid." },
        { status: 400 },
      );
    }

    const reports = sanitizeReports(body?.reports, dayCount);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tindakan_laporan_mutu_monthly")
      .upsert(
        {
          unit_slug: UNIT_SLUG,
          month_yyyymm: monthYyyyMm,
          room_name: roomName,
          day_count: dayCount,
          reports,
          updated_by: user.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "unit_slug,month_yyyymm" },
      )
      .select("month_yyyymm,room_name,day_count,reports")
      .single();

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      data: {
        monthYyyyMm: data.month_yyyymm,
        roomName: sanitizeText(data.room_name || "IDIK") || "IDIK",
        dayCount: Number(data.day_count) || dayCount,
        reports: sanitizeReports(data.reports, Number(data.day_count) || dayCount),
      } satisfies MonthlyPayload & { monthYyyyMm: string },
    });
  } catch (err: any) {
    console.error("[POST /api/tindakan-laporan-mutu]", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Gagal menyimpan laporan mutu." },
      { status: 500 },
    );
  }
}
