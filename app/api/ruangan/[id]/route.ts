import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const supabase = createAdminClient();

    const { data: existing, error: findErr } = await supabase
      .from("ruangan")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Ruangan tidak ditemukan" },
        { status: 404 }
      );
    }

    const patch: Record<string, unknown> = {};

    if (body?.nama !== undefined) {
      const nama = String(body.nama).trim();
      if (nama.length < 1) {
        return NextResponse.json(
          { ok: false, message: "Nama tidak boleh kosong" },
          { status: 400 }
        );
      }
      patch.nama = nama;
    }

    if (body?.kode !== undefined) {
      const kodeRaw = body.kode;
      patch.kode =
        kodeRaw != null && String(kodeRaw).trim().length > 0
          ? String(kodeRaw).trim()
          : null;
    }

    if (body?.kategori !== undefined) {
      const katRaw = body.kategori;
      patch.kategori =
        katRaw != null && String(katRaw).trim().length > 0
          ? String(katRaw).trim()
          : null;
    }

    if (body?.kapasitas !== undefined) {
      if (body.kapasitas === null || body.kapasitas === "") {
        patch.kapasitas = null;
      } else {
        const n = Number(body.kapasitas);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json(
            { ok: false, message: "Kapasitas harus berupa angka ≥ 0" },
            { status: 400 }
          );
        }
        patch.kapasitas = Math.floor(n);
      }
    }

    if (body?.keterangan !== undefined) {
      const ketRaw = body.keterangan;
      patch.keterangan =
        ketRaw != null && String(ketRaw).trim().length > 0
          ? String(ketRaw).trim()
          : null;
    }

    if (body?.aktif !== undefined) {
      patch.aktif = Boolean(body.aktif);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, message: "Tidak ada perubahan" },
        { status: 400 }
      );
    }

    const { data: updated, error: upErr } = await supabase
      .from("ruangan")
      .update(patch)
      .eq("id", id)
      .select(
        "id,nama,kode,kategori,kapasitas,keterangan,aktif,created_at,updated_at"
      )
      .maybeSingle();

    if (upErr) throw upErr;

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal memperbarui data ruangan";
    console.error("[PATCH /api/ruangan/:id]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: existing, error: findErr } = await supabase
      .from("ruangan")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json(
        { ok: false, message: "Ruangan tidak ditemukan" },
        { status: 404 }
      );
    }

    const { error: delErr } = await supabase.from("ruangan").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal menghapus data ruangan";
    console.error("[DELETE /api/ruangan/:id]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
