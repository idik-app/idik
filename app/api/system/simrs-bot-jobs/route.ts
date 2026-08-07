import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildDefaultSteps,
  checkAgentToken,
  isSimrsBotAction,
  parseJobPayload,
  SIMRS_BOT_ACTIVE_STATUSES,
  type SimrsBotJob,
  type SimrsBotJobMode,
  type SimrsBotJobPayload,
} from "@/lib/simrs/botJobs";
import { isSimrsBotRecipeId } from "@/lib/simrs/botFieldMaps";

export const dynamic = "force-dynamic";

const ZOMBIE_MS = 30 * 60 * 1000;

/** GET — latest job (for UI badge / checklist). Auth: user OR agent token. */
export async function GET(request: Request) {
  const agentAuth = checkAgentToken(request);
  if (!agentAuth.ok) {
    const user = await requireUser();
    if (!user.ok) return user.response;
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    const supabase = createAdminClient();

    if (id) {
      const { data, error } = await supabase
        .from("simrs_bot_jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 },
        );
      }
      return NextResponse.json(
        { ok: true, data: (data as SimrsBotJob | null) ?? null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data, error } = await supabase
      .from("simrs_bot_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { ok: true, data: (data as SimrsBotJob | null) ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST — enqueue bot job with payload. */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  let body: {
    action?: string;
    payload?: SimrsBotJobPayload;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const action = body.action ?? "lihat_rekam_medis";
  if (!isSimrsBotAction(action)) {
    return NextResponse.json(
      { ok: false, error: "action tidak diizinkan" },
      { status: 400 },
    );
  }

  const payloadIn = parseJobPayload(body.payload);
  const mode: SimrsBotJobMode =
    payloadIn.mode ||
    (action === "teach_simrs_element"
      ? "teach_element"
      : action === "isi_field_dari_simrs"
        ? "tulis"
        : action === "bulk_isi_fields"
          ? "bulk"
          : action === "explore_simrs_recipe"
            ? "explore"
            : "explore");

  const recipe =
    payloadIn.recipe && isSimrsBotRecipeId(payloadIn.recipe)
      ? payloadIn.recipe
      : "erm_ri_perawat";

  if (
    (action === "isi_field_dari_simrs" || action === "teach_simrs_element") &&
    !payloadIn.tindakan_id
  ) {
    return NextResponse.json(
      { ok: false, error: "tindakan_id wajib dari drawer" },
      { status: 400 },
    );
  }

  const steps =
    Array.isArray(payloadIn.steps) && payloadIn.steps.length > 0
      ? payloadIn.steps
      : buildDefaultSteps({
          mode,
          recipe,
          noRm: payloadIn.no_rm,
          fieldKey: payloadIn.field_key,
        });

  const payload: SimrsBotJobPayload = {
    ...payloadIn,
    mode,
    recipe,
    steps,
    rs_id: payloadIn.rs_id || "default",
  };

  try {
    const supabase = createAdminClient();

    // Cancel zombie jobs older than 30m still "active"
    const cutoff = new Date(Date.now() - ZOMBIE_MS).toISOString();
    await supabase
      .from("simrs_bot_jobs")
      .update({
        status: "cancelled",
        error: "timeout zombie",
        finished_at: new Date().toISOString(),
      })
      .in("status", [...SIMRS_BOT_ACTIVE_STATUSES])
      .lt("created_at", cutoff);

    const agentId = payload.agent_id || null;

    let activeQuery = supabase
      .from("simrs_bot_jobs")
      .select("id, status, action, created_at, agent_id")
      .in("status", [...SIMRS_BOT_ACTIVE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1);

    if (agentId) {
      activeQuery = activeQuery.eq("agent_id", agentId);
    }

    const { data: active, error: activeErr } = await activeQuery.maybeSingle();

    if (activeErr) {
      return NextResponse.json(
        { ok: false, error: activeErr.message },
        { status: 500 },
      );
    }

    if (active) {
      return NextResponse.json(
        {
          ok: false,
          error: `Job bot sudah ${active.status} — tunggu selesai`,
          data: active,
        },
        { status: 409 },
      );
    }

    const { data: created, error: insErr } = await supabase
      .from("simrs_bot_jobs")
      .insert({
        action,
        status: "pending",
        requested_by: user.userId,
        payload,
        agent_id: agentId,
        rs_id: payload.rs_id || "default",
        parent_job_id: payload.parent_job_id || null,
      })
      .select("*")
      .single();

    if (insErr) {
      return NextResponse.json(
        { ok: false, error: insErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: created as SimrsBotJob });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
