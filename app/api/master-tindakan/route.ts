import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

export const dynamic = "force-dynamic";

/** Daftar master jenis tindakan untuk combobox & halaman admin. */
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
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("master_tindakan")
    .select("id,nama,urutan,aktif,created_at,updated_at")
    .order("urutan", { ascending: true })
    .order("nama", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  type Row = {
    id: string;
    nama?: string | null;
    urutan?: number | null;
    aktif?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  };

  const rows = (data ?? []).filter((r: Row) =>
    String(r.nama ?? "").trim().length > 0,
  );

  return NextResponse.json({
    ok: true,
    masterTindakan: rows.map((r: Row) => ({
      id: String(r.id),
      nama: String(r.nama ?? "").trim(),
      urutan: typeof r.urutan === "number" ? r.urutan : 0,
      aktif: r.aktif !== false,
      created_at: r.created_at ?? null,
      updated_at: r.updated_at ?? null,
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
        { ok: false, message: "Nama tindakan wajib diisi" },
        { status: 400 },
      );
    }

    let urutan = 0;
    if (body?.urutan !== undefined && body?.urutan !== null && body?.urutan !== "") {
      const n = Number(body.urutan);
      if (!Number.isFinite(n)) {
        return NextResponse.json(
          { ok: false, message: "Urutan harus berupa angka" },
          { status: 400 },
        );
      }
      urutan = Math.trunc(n);
    }

    const aktif =
      body?.aktif === undefined || body?.aktif === null
        ? true
        : Boolean(body.aktif);

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("master_tindakan")
      .insert({ nama, urutan, aktif })
      .select("id,nama,urutan,aktif,created_at,updated_at")
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal menambah master tindakan";
    console.error("[POST /api/master-tindakan]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
