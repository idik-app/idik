import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAgentToken } from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

/** GET — list agents (heartbeat registry). */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("simrs_bot_agents")
      .select("*")
      .order("last_seen_at", { ascending: false });
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: true, data: data || [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** POST — agent heartbeat upsert. */
export async function POST(request: Request) {
  const auth = checkAgentToken(request);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  let body: {
    agent_id?: string;
    rs_id?: string;
    label?: string;
    meta?: Record<string, unknown>;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const agentId = String(body.agent_id || "default").trim() || "default";
  const rsId = String(body.rs_id || "default").trim() || "default";

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("simrs_bot_agents")
      .upsert(
        {
          agent_id: agentId,
          rs_id: rsId,
          label: body.label || agentId,
          last_seen_at: new Date().toISOString(),
          meta: body.meta || {},
        },
        { onConflict: "agent_id" },
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
