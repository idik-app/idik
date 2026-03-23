import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import { parseKoronarPayload } from "@/lib/cathlab/koronarPayload";

const upsertBodySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().max(200).optional().nullable(),
  pasien_id: z.string().max(80).optional().nullable(),
  tindakan_id: z.string().max(80).optional().nullable(),
  template_id: z.string().max(64).optional(),
  payload: z.unknown(),
});

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("cathlab_koronar_annotation")
    .select(
      "id, title, pasien_id, tindakan_id, template_id, created_at, updated_at, payload"
    )
    .eq("created_by", auth.userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[koronar-annotation GET]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, rows: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = upsertBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parseKoronarPayload(parsed.data.payload);
  if (!payload) {
    return NextResponse.json(
      { ok: false, message: "Payload tidak valid (versi 1)" },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 }
    );
  }

  const { id, title, pasien_id } = parsed.data;

  if (id) {
    const { data: existing, error: fetchErr } = await supabase
      .from("cathlab_koronar_annotation")
      .select("id, created_by")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { ok: false, message: "Catatan tidak ditemukan" },
        { status: 404 }
      );
    }
    if (existing.created_by !== auth.userId) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }

    const { data: updated, error: upErr } = await supabase
      .from("cathlab_koronar_annotation")
      .update({
        title: title ?? null,
        pasien_id: pasien_id ?? null,
        tindakan_id: tindakan_id ?? null,
        template_id: templateResolved,
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .single();

    if (upErr) {
      console.error("[koronar-annotation PATCH]", upErr);
      return NextResponse.json(
        { ok: false, message: upErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      id: updated?.id ?? id,
      action: "updated",
    });
  }

  const { data: inserted, error: insErr } = await supabase
    .from("cathlab_koronar_annotation")
    .insert({
      created_by: auth.userId,
      title: title ?? null,
      pasien_id: pasien_id ?? null,
      tindakan_id: tindakan_id ?? null,
      template_id: templateResolved,
      payload,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("[koronar-annotation POST]", insErr);
    return NextResponse.json(
      { ok: false, message: insErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    action: "created",
  });
}
