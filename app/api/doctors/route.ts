import { NextResponse } from "next/server";
import { requireUser, requireAdmin } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { createAdminClient } from "@/lib/supabase/admin";

/** Daftar dokter aktif untuk form pemakaian / pemilihan operator (master `doctor`). */
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
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("doctor")
    .select("*")
    .order("nama_dokter", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  type Row = {
    id: string;
    nama_dokter?: string | null;
    /** Beberapa seed / migrasi lama memakai `nama` */
    nama?: string | null;
    spesialis?: string | null;
    status?: boolean | null;
  };

  /** Tampilkan semua baris yang punya nama (aktif & nonaktif) agar form pemakaian tidak kosong. */
  const rows = (data ?? []).filter((r: Row) => {
    const nama = String(r.nama_dokter ?? r.nama ?? "").trim();
    return nama.length > 0;
  });

  return NextResponse.json({
    ok: true,
    doctors: rows.map((r: Row) => ({
      id: r.id,
      nama_dokter: String(r.nama_dokter ?? r.nama ?? "").trim(),
      spesialis: r.spesialis ?? null,
      aktif: r.status !== false,
    })),
  });
}

/** Tambah dokter memakai service role — bypass RLS (insert dari anon sering ditolak). */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await req.json();
    const nama_dokter = String(body?.nama_dokter ?? body?.nama ?? "").trim();
    const spesialisRaw = body?.spesialis;
    const kontakRaw = body?.kontak;
    const spesialis =
      spesialisRaw != null && String(spesialisRaw).trim().length > 0
        ? String(spesialisRaw).trim()
        : null;
    const kontak =
      kontakRaw != null && String(kontakRaw).trim().length > 0
        ? String(kontakRaw).trim()
        : null;

    if (nama_dokter.length < 1) {
      return NextResponse.json(
        { ok: false, message: "nama_dokter wajib diisi" },
        { status: 400 }
      );
    }

    let statusBool = true;
    if (body?.status !== undefined && body?.status !== null) {
      if (typeof body.status === "boolean") {
        statusBool = body.status;
      } else {
        const s = String(body.status).toLowerCase().trim();
        if (s === "aktif") statusBool = true;
        else if (s === "cuti" || s === "nonaktif") statusBool = false;
      }
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("doctor")
      .insert({
        nama_dokter,
        spesialis,
        kontak,
        status: statusBool,
      })
      .select("id,nama_dokter,spesialis,kontak,status")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menambah dokter";
    console.error("[POST /api/doctors]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
