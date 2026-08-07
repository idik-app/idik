import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgentToken, type SimrsBotJob } from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

/**
 * POST — agent claims oldest pending job (atomic).
 * Auth: Authorization: Bearer SIMRS_BOT_AGENT_TOKEN
 */
export async function POST(request: Request) {
  if (!requireAgentToken(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    const { data: pending, error: findErr } = await supabase
      .from("simrs_bot_jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json(
        { ok: false, error: findErr.message },
        { status: 500 },
      );
    }

    if (!pending) {
      return NextResponse.json(
        { ok: true, data: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from("simrs_bot_jobs")
      .update({ status: "claimed", claimed_at: now })
      .eq("id", pending.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimErr) {
      return NextResponse.json(
        { ok: false, error: claimErr.message },
        { status: 500 },
      );
    }

    // Race: another agent claimed first
    if (!claimed) {
      return NextResponse.json(
        { ok: true, data: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, data: claimed as SimrsBotJob },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
