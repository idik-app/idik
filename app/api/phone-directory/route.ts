import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getAdminOr503, rowToClient, type PhoneDirRow } from "./helpers";

export const dynamic = "force-dynamic";

/** GET — daftar direktori telepon internal */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { supabase, response } = getAdminOr503();
  if (!supabase || response) return response!;

  const { data, error } = await supabase
    .from("internal_phone_directory")
    .select("id,unit,ext,location,floor,is_pinned,pin_order")
    .order("is_pinned", { ascending: false })
    .order("pin_order", { ascending: true })
    .order("unit", { ascending: true });

  if (error) {
    const msg = String(error.message ?? "");
    const code = String((error as { code?: string }).code ?? "");
    const tableMissing =
      /schema cache/i.test(msg) ||
      /could not find the table/i.test(msg) ||
      (/does not exist/i.test(msg) && /internal_phone_directory/i.test(msg)) ||
      code === "42P01" ||
      code === "PGRST205";
    if (tableMissing) {
      console.warn(
        "[api/phone-directory] Tabel belum ada — jalankan migrasi 20260423120000_internal_phone_directory.sql",
      );
      return NextResponse.json({ ok: true, items: [], setupNeeded: true });
    }
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const items = (data ?? []).map((r) => rowToClient(r as PhoneDirRow));
  return NextResponse.json({ ok: true, items });
}

/** POST — tambah baris */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { supabase, response } = getAdminOr503();
  if (!supabase || response) return response!;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body JSON tidak valid" }, { status: 400 });
  }

  const unit = String(body.unit ?? "").trim();
  const ext = String(body.ext ?? "").trim();
  if (unit.length < 1 || ext.length < 1) {
    return NextResponse.json(
      { ok: false, message: "Unit dan ekstensi wajib diisi" },
      { status: 400 },
    );
  }

  const location = String(body.location ?? "").trim();
  const floorRaw = body.floor;
  const floor =
    floorRaw != null && String(floorRaw).trim() ? String(floorRaw).trim() : null;

  const isPinned = Boolean(body.isPinned);
  let pin_order: number | null = null;
  if (isPinned) {
    const { data: maxRow } = await supabase
      .from("internal_phone_directory")
      .select("pin_order")
      .eq("is_pinned", true)
      .order("pin_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const max = maxRow?.pin_order;
    pin_order = typeof max === "number" ? max + 1 : 0;
  }

  const { data: created, error } = await supabase
    .from("internal_phone_directory")
    .insert({
      unit,
      ext,
      location,
      floor,
      is_pinned: isPinned,
      pin_order,
    })
    .select("id,unit,ext,location,floor,is_pinned,pin_order")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, item: rowToClient(created as PhoneDirRow) });
}
