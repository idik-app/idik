import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkAgentToken,
  type SimrsBotJobPayload,
  type SimrsBotJobStatus,
} from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

type PatchBody = {
  status?: SimrsBotJobStatus;
  error?: string;
  result?: unknown;
  payload?: SimrsBotJobPayload;
};

const ALLOWED: SimrsBotJobStatus[] = [
  "claimed",
  "running",
  "done",
  "error",
  "cancelled",
];

/**
 * PATCH — agent updates job status and/or payload (steps progress).
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = checkAgentToken(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ ok: false, error: "id wajib" }, { status: 400 });
  }

  let body: PatchBody = {};
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};

  if (body.status) {
    if (!ALLOWED.includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: "status invalid" },
        { status: 400 },
      );
    }
    patch.status = body.status;
    if (body.status === "running") patch.started_at = now;
    if (
      body.status === "done" ||
      body.status === "error" ||
      body.status === "cancelled"
    ) {
      patch.finished_at = now;
    }
  }

  if (body.error != null) {
    patch.error = String(body.error).slice(0, 500);
  }
  if (body.result !== undefined) {
    patch.result = body.result;
  }
  if (body.payload !== undefined) {
    patch.payload = body.payload;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, error: "tidak ada field patch" },
      { status: 400 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("simrs_bot_jobs")
      .update(patch)
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    if (!data) {
      return NextResponse.json({ ok: false, error: "Job tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
