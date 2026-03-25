import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";

function toBoolStatus(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "aktif") return true;
    if (s === "cuti" || s === "nonaktif") return false;
  }
  return undefined;
}

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
    const {
      nama_dokter,
      nama,
      spesialis,
      kontak,
      status: statusRaw,
    } = body ?? {};

    const supabase = createAdminClient();

    const { data: existing, error: findErr } = await supabase
      .from("doctor")
      .select("id,nama_dokter,spesialis,kontak,status")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Dokter tidak ditemukan" }, { status: 404 });
    }

    const oldNama = (existing.nama_dokter ?? "").trim();
    const patch: Record<string, unknown> = {};

    const nextNamaFromBody =
      nama_dokter !== undefined
        ? String(nama_dokter).trim()
        : nama !== undefined
          ? String(nama).trim()
          : undefined;

    if (nextNamaFromBody !== undefined) {
      if (nextNamaFromBody.length < 1) {
        return NextResponse.json(
          { ok: false, message: "nama_dokter tidak boleh kosong" },
          { status: 400 }
        );
      }
      patch.nama_dokter = nextNamaFromBody;
    }

    if (spesialis !== undefined) {
      const s = String(spesialis).trim();
      patch.spesialis = s.length ? s : null;
    }
    if (kontak !== undefined) {
      const k = String(kontak).trim();
      patch.kontak = k.length ? k : null;
    }
    if (statusRaw !== undefined) {
      const b = toBoolStatus(statusRaw);
      if (b === undefined) {
        return NextResponse.json({ ok: false, message: "status tidak valid" }, { status: 400 });
      }
      patch.status = b;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, message: "Nothing to update" }, { status: 400 });
    }

    const newNama =
      (patch.nama_dokter as string | undefined) ?? oldNama;
    const syncUser =
      patch.nama_dokter !== undefined && oldNama.length > 0 && newNama !== oldNama;

    if (syncUser) {
      const { error: uErr } = await supabase
        .from("app_users")
        .update({ username: newNama })
        .eq("role", "dokter")
        .eq("username", oldNama);
      if (uErr) {
        return NextResponse.json(
          { ok: false, message: uErr.message || "Gagal sinkron username user dokter" },
          { status: 400 }
        );
      }
    }

    const { data: updated, error: upErr } = await supabase
      .from("doctor")
      .update(patch)
      .eq("id", id)
      .select("id,nama_dokter,spesialis,kontak,status")
      .maybeSingle();

    if (upErr) {
      if (syncUser) {
        await supabase
          .from("app_users")
          .update({ username: oldNama })
          .eq("role", "dokter")
          .eq("username", newNama);
      }
      throw upErr;
    }

    return NextResponse.json({ ok: true, data: updated }, { status: 200 });
  } catch (err: any) {
    console.error("[PATCH /api/doctors/:id]", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to update doctor" },
      { status: 500 }
    );
  }
}

/** Hapus baris `doctor` memakai service role (bypass RLS). Klien anon sering gagal diam-diam karena kebijakan RLS. */
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
      .from("doctor")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (findErr) throw findErr;
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Dokter tidak ditemukan" }, { status: 404 });
    }

    const { error: delErr } = await supabase.from("doctor").delete().eq("id", id);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete doctor";
    console.error("[DELETE /api/doctors/:id]", err);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
