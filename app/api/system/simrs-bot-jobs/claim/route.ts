import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAgentToken, type SimrsBotJob } from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

/**
 * POST — agent claims oldest pending job (atomic).
 * Optional body: { agent_id, rs_id } — prefer jobs for that agent, else unassigned.
 */
export async function POST(request: Request) {
  const auth = checkAgentToken(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  let body: { agent_id?: string; rs_id?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    /* empty body ok */
  }
  const agentId = String(body.agent_id || "").trim();

  try {
    const supabase = createAdminClient();

    // Prefer jobs targeted at this agent, then unassigned
    let pending: SimrsBotJob | null = null;

    if (agentId) {
      const { data } = await supabase
        .from("simrs_bot_jobs")
        .select("*")
        .eq("status", "pending")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      pending = (data as SimrsBotJob | null) ?? null;
    }

    if (!pending) {
      const { data, error: findErr } = await supabase
        .from("simrs_bot_jobs")
        .select("*")
        .eq("status", "pending")
        .is("agent_id", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (findErr) {
        return NextResponse.json(
          { ok: false, error: findErr.message },
          { status: 500 },
        );
      }
      pending = (data as SimrsBotJob | null) ?? null;
    }

    // Fallback: any pending (single-agent deployments)
    if (!pending) {
      const { data, error: findErr } = await supabase
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
      pending = (data as SimrsBotJob | null) ?? null;
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
      .update({
        status: "claimed",
        claimed_at: now,
        agent_id: agentId || pending.agent_id || "default",
      })
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
