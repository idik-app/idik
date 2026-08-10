import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseJobPayload,
  type SimrsBotJob,
} from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

type TeachAction = "continue" | "finish" | "mark_type_rm" | "cancel";

/**
 * POST — user signals teach wizard (Tambah langkah / Selesai / tandai RM).
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  let body: { job_id?: string; teach_action?: TeachAction } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const jobId = String(body.job_id || "").trim();
  const action = body.teach_action;
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "job_id wajib" }, { status: 400 });
  }
  if (
    action !== "continue" &&
    action !== "finish" &&
    action !== "mark_type_rm" &&
    action !== "cancel"
  ) {
    return NextResponse.json(
      { ok: false, error: "teach_action invalid" },
      { status: 400 },
    );
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

    const row = job as SimrsBotJob;
    if (row.status !== "running" && row.status !== "claimed") {
      return NextResponse.json(
        { ok: false, error: "Job tidak sedang menunggu ajar" },
        { status: 409 },
      );
    }

    const payload = parseJobPayload(row.payload);
    if (!payload.teach_pending && action !== "cancel") {
      return NextResponse.json(
        { ok: false, error: "Belum ada langkah menunggu keputusan" },
        { status: 409 },
      );
    }

    const { data, error: upErr } = await supabase
      .from("simrs_bot_jobs")
      .update({
        payload: {
          ...payload,
          teach_action: action,
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
