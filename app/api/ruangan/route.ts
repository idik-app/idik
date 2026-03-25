import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

/** Daftar master ruangan untuk form pemakaian / combobox (semua baris dengan nama). */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("ruangan")
    .select("id,nama,kode,kategori,aktif")
    .order("nama", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  type Row = {
    id: string;
    nama?: string | null;
    kode?: string | null;
    kategori?: string | null;
    aktif?: boolean | null;
  };

  const rows = (data ?? []).filter((r: Row) =>
    String(r.nama ?? "").trim().length > 0
  );

  return NextResponse.json({
    ok: true,
    ruangan: rows.map((r: Row) => ({
      id: String(r.id),
      nama: String(r.nama ?? "").trim(),
      kode: r.kode != null && String(r.kode).trim() ? String(r.kode).trim() : null,
      kategori:
        r.kategori != null && String(r.kategori).trim()
          ? String(r.kategori).trim()
          : null,
      aktif: r.aktif !== false,
    })),
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await req.json();
    const nama = String(body?.nama ?? "").trim();
    if (nama.length < 1) {
      return NextResponse.json(
        { ok: false, message: "Nama ruangan wajib diisi" },
        { status: 400 }
      );
    }

    const kodeRaw = body?.kode;
    const kode =
      kodeRaw != null && String(kodeRaw).trim().length > 0
        ? String(kodeRaw).trim()
        : null;

    const katRaw = body?.kategori;
    const kategori =
      katRaw != null && String(katRaw).trim().length > 0
        ? String(katRaw).trim()
        : null;

    let kapasitas: number | null = null;
    if (body?.kapasitas !== undefined && body?.kapasitas !== null && body?.kapasitas !== "") {
      const n = Number(body.kapasitas);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { ok: false, message: "Kapasitas harus berupa angka ≥ 0" },
          { status: 400 }
        );
      }
      kapasitas = Math.floor(n);
    }

    const ketRaw = body?.keterangan;
    const keterangan =
      ketRaw != null && String(ketRaw).trim().length > 0
        ? String(ketRaw).trim()
        : null;

    const aktif =
      body?.aktif === undefined || body?.aktif === null
        ? true
        : Boolean(body.aktif);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ruangan")
      .insert({
        nama,
        kode,
        kategori,
        kapasitas,
        keterangan,
        aktif,
      })
      .select(
        "id,nama,kode,kategori,kapasitas,keterangan,aktif,created_at,updated_at"
      )
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal menambah data ruangan";
    console.error("[POST /api/ruangan]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
