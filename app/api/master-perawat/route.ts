import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Daftar perawat aktif/nonaktif dari `master_perawat` — tab Dokter & tim. */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + service role).",
      },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("master_perawat")
    .select("id, nama_perawat, bidang, aktif")
    .order("nama_perawat", { ascending: true });

  if (error) {
    const msg = String(error.message ?? "");
    const code = String((error as { code?: string }).code ?? "");
    /** Migrasi belum dijalankan / cache PostgREST belum melihat tabel baru. */
    const tableMissing =
      /schema cache/i.test(msg) ||
      /could not find the table/i.test(msg) ||
      (/does not exist/i.test(msg) && /master_perawat/i.test(msg)) ||
      code === "42P01" ||
      code === "PGRST205";
    if (tableMissing) {
      console.warn(
        "[api/master-perawat] Tabel public.master_perawat belum ada — jalankan migrasi Supabase (lihat supabase/migrations/20260331170000_master_perawat_tim_tindakan.sql).",
      );
      return NextResponse.json({
        ok: true,
        perawats: [],
        setupNeeded: true,
      });
    }
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  type Row = {
    id: string;
    nama_perawat?: string | null;
    bidang?: string | null;
    aktif?: boolean | null;
  };

  const rows = (data ?? []).filter((r: Row) => {
    const nama = String(r.nama_perawat ?? "").trim();
    return nama.length > 0;
  });

  return NextResponse.json({
    ok: true,
    perawats: rows.map((r: Row) => ({
      id: r.id,
      nama_perawat: String(r.nama_perawat ?? "").trim(),
      bidang: r.bidang != null && String(r.bidang).trim() ? String(r.bidang).trim() : null,
      aktif: r.aktif !== false,
    })),
  });
}

/** Tambah baris master (pengguna terautentikasi — selaras POST master kategori tindakan). */
export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const nama_perawat = String(body?.nama_perawat ?? body?.nama ?? "").trim();
    const bidangRaw = body?.bidang;
    const bidang =
      bidangRaw != null && String(bidangRaw).trim().length > 0
        ? String(bidangRaw).trim()
        : null;

    if (nama_perawat.length < 1) {
      return NextResponse.json(
        { ok: false, message: "Nama perawat wajib diisi." },
        { status: 400 },
      );
    }

    const aktif =
      body?.aktif === undefined || body?.aktif === null
        ? true
        : Boolean(body.aktif);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("master_perawat")
      .insert({ nama_perawat, bidang, aktif })
      .select("id,nama_perawat,bidang,aktif")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal menambah master perawat";
    console.error("[POST /api/master-perawat]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
