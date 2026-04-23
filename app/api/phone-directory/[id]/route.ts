import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getAdminOr503, rowToClient, type PhoneDirRow } from "../helpers";

export const dynamic = "force-dynamic";

/** PATCH — ubah baris (termasuk pin / unpin) */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { id } = await params;
  const idTrim = String(id ?? "").trim();
  if (!idTrim) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  const { supabase, response } = getAdminOr503();
  if (!supabase || response) return response!;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body JSON tidak valid" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.unit !== undefined) {
    const u = String(body.unit ?? "").trim();
    if (u.length < 1) {
      return NextResponse.json({ ok: false, message: "Unit tidak boleh kosong" }, { status: 400 });
    }
    patch.unit = u;
  }
  if (body.ext !== undefined) {
    const e = String(body.ext ?? "").trim();
    if (e.length < 1) {
      return NextResponse.json(
        { ok: false, message: "Ekstensi tidak boleh kosong" },
        { status: 400 },
      );
    }
    patch.ext = e;
  }
  if (body.location !== undefined) {
    patch.location = String(body.location ?? "").trim();
  }
  if (body.floor !== undefined) {
    const f = body.floor;
    patch.floor =
      f != null && String(f).trim() ? String(f).trim() : null;
  }

  if (body.isPinned !== undefined) {
    const want = Boolean(body.isPinned);
    patch.is_pinned = want;
    if (want) {
      const { data: maxRow } = await supabase
        .from("internal_phone_directory")
        .select("pin_order")
        .eq("is_pinned", true)
        .neq("id", idTrim)
        .order("pin_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const max = maxRow?.pin_order;
      patch.pin_order = typeof max === "number" ? max + 1 : 0;
    } else {
      patch.pin_order = null;
    }
  }

  if (Object.keys(patch).length < 1) {
    return NextResponse.json(
      { ok: false, message: "Tidak ada field yang diubah" },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabase
    .from("internal_phone_directory")
    .update(patch)
    .eq("id", idTrim)
    .select("id,unit,ext,location,floor,is_pinned,pin_order")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }
  if (!updated) {
    return NextResponse.json({ ok: false, message: "Tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, item: rowToClient(updated as PhoneDirRow) });
}

/** DELETE — hapus baris */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { id } = await params;
  const idTrim = String(id ?? "").trim();
  if (!idTrim) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  const { supabase, response } = getAdminOr503();
  if (!supabase || response) return response!;

  const { data: delRow, error } = await supabase
    .from("internal_phone_directory")
    .delete()
    .eq("id", idTrim)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }
  if (!delRow) {
    return NextResponse.json({ ok: false, message: "Tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
