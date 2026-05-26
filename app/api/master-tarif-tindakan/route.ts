import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

export const dynamic = "force-dynamic";

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
    .from("master_tarif_tindakan")
    .select("id,nama,nama_cari,tarif_rupiah,aktif,kode")
    .order("nama", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    tarif: data,
  });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const body = await req.json();
    const { id, nama, kode, tarif_rupiah, aktif } = body;

    if (!nama) {
      return NextResponse.json(
        { ok: false, message: "Nama wajib diisi" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const nama_cari = nama.toUpperCase().trim();

    const { data, error } = await supabase
      .from("master_tarif_tindakan")
      .upsert(
        {
          id: id || undefined,
          nama,
          nama_cari,
          kode,
          tarif_rupiah,
          aktif: aktif !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "nama_cari" },
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[POST /api/master-tarif-tindakan]", err);
    return NextResponse.json(
      { ok: false, message: err.message },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { ok: false, message: "ID wajib disertakan" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("master_tarif_tindakan")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[DELETE /api/master-tarif-tindakan]", err);
    return NextResponse.json(
      { ok: false, message: err.message },
      { status: 500 },
    );
  }
}
