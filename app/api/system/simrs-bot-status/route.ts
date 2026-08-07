import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { requireAgentToken } from "@/lib/simrs/botJobs";

export const dynamic = "force-dynamic";

type BotStatusState = "idle" | "running" | "ok" | "error";

type BotStatus = {
  state: BotStatusState;
  norm?: string;
  at: string;
  ms?: number;
  error?: string;
};

/** In-memory — cukup untuk indikator ringan; reset saat cold start. */
let lastStatus: BotStatus = {
  state: "idle",
  at: new Date(0).toISOString(),
};

/**
 * GET — status bot SIMRS (payload kecil, tanpa query DB berat).
 * Boleh tanpa auth agar badge ringan; tidak menampilkan PII selain No. RM.
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
  return NextResponse.json(
    { ok: true, data: lastStatus },
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
  if (
    state !== "idle" &&
    state !== "running" &&
    state !== "ok" &&
    state !== "error"
  ) {
    return NextResponse.json({ ok: false, error: "state invalid" }, { status: 400 });
  }

  lastStatus = {
    state,
    norm: body.norm ? String(body.norm).slice(0, 32) : undefined,
    at: body.at || new Date().toISOString(),
    ms:
      typeof body.ms === "number" && Number.isFinite(body.ms)
        ? Math.round(body.ms)
        : undefined,
    error: body.error ? String(body.error).slice(0, 120) : undefined,
  };

  return NextResponse.json({ ok: true, data: lastStatus });
}
