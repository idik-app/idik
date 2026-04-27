import { NextResponse } from "next/server";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { requireUnitAccess } from "@/lib/auth/guards";
import {
  DEFAULT_JARVIS_MENU_SEED,
  REGISTER_ICCU_SEED,
} from "@/lib/intensive/defaultJarvisMenuSeed";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

async function requireRoomAndRuanganId(roomSlug: string | null) {
  const slug = roomSlug?.trim().toLowerCase();
  if (!slug) {
    return { ok: false as const, response: badRequest("roomSlug wajib (query)") };
  }

  const auth = await requireUnitAccess(slug);
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const supabase = getServiceSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("ruangan")
    .select("id, nama")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !row?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Ruangan tidak ditemukan" }, { status: 404 }),
    };
  }

  const roomNama = String((row as { nama?: string | null }).nama ?? "").trim();
  return {
    ok: true as const,
    ruanganId: row.id as string,
    roomSlug: slug,
    roomNama: roomNama || slug,
  };
}

/**
 * Bila suatu unit belum punya baris menu (ruangan baru / migrasi lompat),
 * isi bawaan agar FAB Jarvis selalu punya item.
 */
async function ensureDefaultMenuRows(
  supabase: SupabaseClient,
  ruanganId: string,
  roomSlug: string,
): Promise<void> {
  const base = DEFAULT_JARVIS_MENU_SEED.map((row, i) => ({
    label: row.label,
    icon_name: row.icon_name,
    action_type: row.action_type,
    action_value: row.action_value,
    order_index: i,
    is_active: true,
    ruangan_id: ruanganId,
  }));

  const rows =
    roomSlug === "iccu"
      ? [
          ...base,
          {
            label: REGISTER_ICCU_SEED.label,
            icon_name: REGISTER_ICCU_SEED.icon_name,
            action_type: REGISTER_ICCU_SEED.action_type,
            action_value: REGISTER_ICCU_SEED.action_value,
            order_index: base.length,
            is_active: true,
            ruangan_id: ruanganId,
          },
        ]
      : base;

  const { error } = await supabase.from("intensive_jarvis_menu").insert(rows);
  if (error) {
    if (
      /duplicate|unique|violates/i.test(error.message) ||
      (error as { code?: string }).code === "23505"
    ) {
      return;
    }
    throw new Error(error.message);
  }
}

// GET: menu aktif untuk satu ruangan
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get("roomSlug");
    const roomSlug = raw != null && String(raw).trim() ? String(raw).trim().toLowerCase() : null;

    const gate = await requireRoomAndRuanganId(roomSlug);
    if (!gate.ok) return gate.response;

    const supabase = getServiceSupabaseAdmin();
    const loadRows = () =>
      supabase
        .from("intensive_jarvis_menu")
        .select("*")
        .eq("is_active", true)
        .eq("ruangan_id", gate.ruanganId)
        .order("order_index", { ascending: true });

    const { data, error } = await loadRows();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      try {
        await ensureDefaultMenuRows(supabase, gate.ruanganId, gate.roomSlug);
      } catch (e) {
        console.error("[jarvis-menu] ensureDefaultMenuRows", e);
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "Gagal seed menu default" },
          { status: 500 },
        );
      }
      const { data: data2, error: err2 } = await loadRows();
      if (err2) {
        return NextResponse.json({ ok: false, error: err2.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, data: data2 ?? [], roomNama: gate.roomNama });
    }

    return NextResponse.json({ ok: true, data, roomNama: gate.roomNama });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

/** Simpan order_index 0..n-1 untuk satu ruangan (drag-and-drop). */
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("roomSlug");

    const gate = await requireRoomAndRuanganId(roomSlug);
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const { orderedIds } = body as { orderedIds?: unknown };

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return badRequest("orderedIds wajib berupa array id yang tidak kosong");
    }
    if (!orderedIds.every((x) => typeof x === "string" && x.length > 0)) {
      return badRequest("Setiap orderedIds harus string id");
    }

    const supabase = getServiceSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: rows, error: fetchErr } = await supabase
      .from("intensive_jarvis_menu")
      .select("id")
      .eq("ruangan_id", gate.ruanganId)
      .in("id", orderedIds);

    if (fetchErr) {
      return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 });
    }
    const found = new Set((rows ?? []).map((r) => r.id as string));
    if (found.size !== orderedIds.length) {
      return badRequest("orderedIds harus milik ruangan ini");
    }

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i] as string;
      const { error } = await supabase
        .from("intensive_jarvis_menu")
        .update({ order_index: i, updated_at: now })
        .eq("id", id)
        .eq("ruangan_id", gate.ruanganId);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: tambah / ubah item (hanya untuk ruangan terkait)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("roomSlug");

    const gate = await requireRoomAndRuanganId(roomSlug);
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const { id, label, icon_name, action_type, action_value, order_index, is_active } = body;

    const supabase = getServiceSupabaseAdmin();

    const basePayload = {
      label,
      icon_name,
      action_type,
      action_value,
      order_index: order_index ?? 0,
      is_active: is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (id) {
      const { data: existing, error: exErr } = await supabase
        .from("intensive_jarvis_menu")
        .select("id")
        .eq("id", id)
        .eq("ruangan_id", gate.ruanganId)
        .maybeSingle();

      if (exErr) {
        return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
      }
      if (!existing) {
        return badRequest("Item tidak ditemukan untuk ruangan ini");
      }

      result = await supabase
        .from("intensive_jarvis_menu")
        .update(basePayload)
        .eq("id", id)
        .eq("ruangan_id", gate.ruanganId);
    } else {
      result = await supabase
        .from("intensive_jarvis_menu")
        .insert({ ...basePayload, ruangan_id: gate.ruanganId });
    }

    if (result.error) {
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const roomSlug = searchParams.get("roomSlug");

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID required" }, { status: 400 });
    }

    const gate = await requireRoomAndRuanganId(roomSlug);
    if (!gate.ok) return gate.response;

    const supabase = getServiceSupabaseAdmin();
    const { error } = await supabase
      .from("intensive_jarvis_menu")
      .delete()
      .eq("id", id)
      .eq("ruangan_id", gate.ruanganId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
