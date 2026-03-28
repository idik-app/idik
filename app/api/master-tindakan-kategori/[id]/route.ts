import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const supabase = createAdminClient();

    const { data: existing, error: findErr } = await supabase
      .from("master_kategori_tindakan")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Master kategori tidak ditemukan" },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = {};

    if (body?.nama !== undefined) {
      const nama = String(body.nama).trim();
      if (nama.length < 1) {
        return NextResponse.json(
          { ok: false, message: "Nama tidak boleh kosong" },
          { status: 400 },
        );
      }
      patch.nama = nama;
    }

    if (body?.urutan !== undefined) {
      if (body.urutan === null || body.urutan === "") {
        patch.urutan = 0;
      } else {
        const n = Number(body.urutan);
        if (!Number.isFinite(n)) {
          return NextResponse.json(
            { ok: false, message: "Urutan harus berupa angka" },
            { status: 400 },
          );
        }
        patch.urutan = Math.trunc(n);
      }
    }

    if (body?.aktif !== undefined) {
      patch.aktif = Boolean(body.aktif);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, message: "Tidak ada perubahan" },
        { status: 400 },
      );
    }

    const { data: updated, error: upErr } = await supabase
      .from("master_kategori_tindakan")
      .update(patch)
      .eq("id", id)
      .select("id,nama,urutan,aktif,created_at,updated_at")
      .maybeSingle();

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal memperbarui master kategori";
    console.error("[PATCH /api/master-tindakan-kategori/:id]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: existing, error: findErr } = await supabase
      .from("master_kategori_tindakan")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Master kategori tidak ditemukan" },
        { status: 404 },
      );
    }

    const { error: delErr } = await supabase
      .from("master_kategori_tindakan")
      .delete()
      .eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal menghapus master kategori";
    console.error("[DELETE /api/master-tindakan-kategori/:id]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
