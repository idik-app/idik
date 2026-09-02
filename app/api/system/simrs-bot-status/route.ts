import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { checkAgentToken, requireAgentToken } from "@/lib/simrs/botJobs";
import type { SimrsBotStep } from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

type BotStatusState = "idle" | "running" | "ok" | "error" | "agent_offline";

type BotStatus = {
  state: BotStatusState;
  norm?: string;
  at: string;
  ms?: number;
  error?: string;
  job_id?: string;
  step?: string;
  steps?: SimrsBotStep[];
  agent_id?: string;
  heartbeat?: boolean;
};

/** In-memory — cukup untuk indikator ringan; reset saat cold start. */
let lastStatus: BotStatus = {
  state: "idle",
  at: new Date(0).toISOString(),
};

const OFFLINE_MS = 45_000;

function getLastBotStatus(): BotStatus {
  return lastStatus;
}

/**
 * GET — status bot SIMRS + deteksi agent_offline dari heartbeat stale.
 */
export async function GET() {
  if (process.env.NEXT_PUBLIC_SIMRS_BOT_STATUS === "0") {
    return NextResponse.json(
      { ok: true, disabled: true, data: null },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  let data = lastStatus;
  const age = Date.now() - new Date(lastStatus.at).getTime();
  if (
    lastStatus.heartbeat &&
    age > OFFLINE_MS &&
    lastStatus.state !== "running"
  ) {
    data = {
      ...lastStatus,
      state: "agent_offline",
      error: "Agen PC RS tidak mengirim heartbeat",
    };
  } else if (!lastStatus.heartbeat && age > OFFLINE_MS * 2) {
    // no heartbeat ever / very old
    if (lastStatus.state === "idle" && new Date(lastStatus.at).getTime() === 0) {
      data = {
        ...lastStatus,
        state: "agent_offline",
        error: "Agen belum pernah terhubung",
        at: new Date().toISOString(),
      };
    }
  }

  return NextResponse.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** POST — bot meng-update status (session user ATAU agent token). */
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_SIMRS_BOT_STATUS === "0") {
    return NextResponse.json({ ok: true, disabled: true });
  }

  const agentOk = requireAgentToken(request);
  if (!agentOk) {
    const user = await requireUser();
    if (!user.ok) return user.response;
  }

  let body: Partial<BotStatus> = {};
  try {
    body = (await request.json()) as Partial<BotStatus>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalid" }, { status: 400 });
  }

  const state = body.state;
  const allowed: BotStatusState[] = [
    "idle",
    "running",
    "ok",
    "error",
    "agent_offline",
  ];
  if (!state || !allowed.includes(state as BotStatusState)) {
    return NextResponse.json({ ok: false, error: "state invalid" }, { status: 400 });
  }

  lastStatus = {
    state: state as BotStatusState,
    norm: body.norm ? String(body.norm).slice(0, 32) : undefined,
    at: body.at || new Date().toISOString(),
    ms:
      typeof body.ms === "number" && Number.isFinite(body.ms)
        ? Math.round(body.ms)
        : undefined,
    error: body.error ? String(body.error).slice(0, 200) : undefined,
    job_id: body.job_id ? String(body.job_id) : undefined,
    step: body.step ? String(body.step) : undefined,
    steps: Array.isArray(body.steps) ? body.steps : undefined,
    agent_id: body.agent_id ? String(body.agent_id) : undefined,
    heartbeat: body.heartbeat === true || agentOk,
  };

  return NextResponse.json({ ok: true, data: lastStatus });
}

void checkAgentToken;
