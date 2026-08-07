import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isSimrsBotAction,
  SIMRS_BOT_ACTIVE_STATUSES,
  type SimrsBotJob,
} from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

/** GET — latest job (for UI badge / button state). Auth required. */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const supabase = createAdminClient();
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

/** POST — enqueue lihat_rekam_medis (or other allowed actions). */
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  let body: { action?: string } = {};
  try {
    body = (await request.json()) as { action?: string };
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

  try {
    const supabase = createAdminClient();

    const { data: active, error: activeErr } = await supabase
      .from("simrs_bot_jobs")
      .select("id, status, action, created_at")
      .eq("action", action)
      .in("status", [...SIMRS_BOT_ACTIVE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
          error: `Job ${action} sudah ${active.status} — tunggu selesai`,
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
