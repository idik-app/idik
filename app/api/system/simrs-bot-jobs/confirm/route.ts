import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  markStep,
  parseJobPayload,
  type SimrsBotJob,
  type SimrsBotStep,
} from "@/lib/simrs/botJobs";
import { normalizeFieldValue } from "@/lib/simrs/botFormats";

export const dynamic = "force-dynamic";

/**
 * POST — user confirms pending SIMRS value → write to tindakan.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  let body: {
    job_id?: string;
    confirm?: boolean;
    value?: string;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const jobId = String(body.job_id || "").trim();
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "job_id wajib" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: job, error } = await supabase
      .from("simrs_bot_jobs")
      .select("*")
      .eq("id", jobId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job tidak ditemukan" }, { status: 404 });
    }

    const payload = parseJobPayload((job as SimrsBotJob).payload);
    const steps = (payload.steps || []) as SimrsBotStep[];

    if (body.confirm === false) {
      const nextSteps = markStep(steps, "confirm_value", "error", "Ditolak user");
      const { data, error: upErr } = await supabase
        .from("simrs_bot_jobs")
        .update({
          status: "cancelled",
          error: "Ditolak user pada konfirmasi nilai",
          finished_at: new Date().toISOString(),
          payload: {
            ...payload,
            confirmed: false,
            steps: nextSteps,
          },
        })
        .eq("id", jobId)
        .select("*")
        .single();
      if (upErr) {
        return NextResponse.json(
          { ok: false, error: upErr.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    // Re-check field still empty (race)
    const fieldKey = payload.field_key || "";
    const tindakanId = payload.tindakan_id;
    if (tindakanId && fieldKey) {
      const { data: row } = await supabase
        .from("tindakan")
        .select(fieldKey)
        .eq("id", tindakanId)
        .maybeSingle();
      const current = row
        ? (row as unknown as Record<string, unknown>)[fieldKey]
        : null;
      const filled =
        current != null &&
        String(current).trim() !== "" &&
        String(current).trim() !== "—" &&
        String(current).trim() !== "-";
      if (filled) {
        return NextResponse.json(
          {
            ok: false,
            error: "Field sudah terisi manual — bot tidak menimpa",
          },
          { status: 409 },
        );
      }
    }

    const raw = body.value ?? payload.pending_value ?? "";
    const { normalized } = normalizeFieldValue(fieldKey, String(raw));
    let nextSteps = markStep(steps, "confirm_value", "done");

    if (tindakanId && fieldKey && normalized) {
      const patchBody: Record<string, string> = { [fieldKey]: normalized };
      const { error: patchErr } = await supabase
        .from("tindakan")
        .update(patchBody)
        .eq("id", tindakanId);
      if (patchErr) {
        return NextResponse.json(
          { ok: false, error: patchErr.message },
          { status: 500 },
        );
      }
      nextSteps = markStep(nextSteps, "tulis_idik", "done");
      const { data, error: upErr } = await supabase
        .from("simrs_bot_jobs")
        .update({
          status: "done",
          finished_at: new Date().toISOString(),
          payload: {
            ...payload,
            confirmed: true,
            pending_value: String(raw),
            pending_value_normalized: normalized,
            steps: nextSteps,
          },
          result: { written: patchBody },
        })
        .eq("id", jobId)
        .select("*")
        .single();
      if (upErr) {
        return NextResponse.json(
          { ok: false, error: upErr.message },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true, data });
    }

    const { data, error: upErr } = await supabase
      .from("simrs_bot_jobs")
      .update({
        payload: {
          ...payload,
          confirmed: true,
          pending_value: String(raw),
          pending_value_normalized: normalized,
          steps: nextSteps,
        },
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (upErr) {
      return NextResponse.json(
        { ok: false, error: upErr.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
