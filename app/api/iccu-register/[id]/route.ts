import { NextResponse } from "next/server";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { requireUnitAccess } from "@/lib/auth/guards";
import { iccuRegisterPatchSchema } from "@/lib/iccu-register/validation";
import { ICCU_INVASIVE_KEYS } from "@/lib/iccu-register/constants";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

async function gateRoom(roomSlug: string | null) {
  const slug = roomSlug?.trim();
  if (!slug) {
    return { ok: false as const, response: badRequest("roomSlug wajib (query)") };
  }
  const auth = await requireUnitAccess(slug);
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Server tidak dikonfigurasi (Supabase service role)." },
        { status: 503 },
      ),
    };
  }

  const { data: row, error } = await supabase
    .from("ruangan")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !row?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Ruangan tidak ditemukan" }, { status: 404 }),
    };
  }

  return { ok: true as const, ruanganId: row.id as string, supabase };
}

function normalizePatch(raw: Record<string, unknown>) {
  const invasive = raw.invasive_procedures;
  if (Array.isArray(invasive)) {
    const set = new Set<string>();
    for (const x of invasive) {
      const s = String(x);
      if ((ICCU_INVASIVE_KEYS as readonly string[]).includes(s)) set.add(s);
    }
    raw.invasive_procedures = [...set];
  }

  for (const key of ["tanggal_lahir", "periode_masuk", "periode_keluar"] as const) {
    const v = raw[key];
    if (v === "") raw[key] = null;
  }
  if (raw.bed === "") raw.bed = null;
  if (raw.archived_at === "") delete raw.archived_at;

  return raw;
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) return badRequest("id wajib");

    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("roomSlug");
    const gate = await gateRoom(roomSlug);
    if (!gate.ok) return gate.response;

    const { data: existing, error: exErr } = await gate.supabase
      .from("iccu_register_entry")
      .select("*")
      .eq("id", id)
      .eq("ruangan_id", gate.ruanganId)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const normalized = normalizePatch(body as Record<string, unknown>);
    const parsed = iccuRegisterPatchSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const updatePayload = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined),
    ) as Record<string, unknown>;

    if (Object.prototype.hasOwnProperty.call(updatePayload, "archived_at")) {
      const av = updatePayload.archived_at;
      if (av != null && typeof av === "string" && av.length > 0) {
        const merged = { ...existing, ...updatePayload } as Record<string, unknown>;
        const ck = merged.cara_keluar;
        const pk = merged.periode_keluar;
        if (
          ck == null ||
          String(ck).trim() === "" ||
          pk == null ||
          String(pk).trim() === ""
        ) {
          return badRequest(
            "Lengkapi cara keluar dan tanggal keluar (periode) sebelum mengarsipkan.",
          );
        }
      }
    }

    const { data: updated, error: upErr } = await gate.supabase
      .from("iccu_register_entry")
      .update(updatePayload)
      .eq("id", id)
      .eq("ruangan_id", gate.ruanganId)
      .select("*")
      .single();

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: updated });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id) return badRequest("id wajib");

    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("roomSlug");
    const gate = await gateRoom(roomSlug);
    if (!gate.ok) return gate.response;

    const { error } = await gate.supabase
      .from("iccu_register_entry")
      .delete()
      .eq("id", id)
      .eq("ruangan_id", gate.ruanganId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
