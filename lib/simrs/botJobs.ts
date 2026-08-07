/** Shared types + helpers for SIMRS bot job queue. */

export const SIMRS_BOT_ACTIONS = ["lihat_rekam_medis"] as const;
export type SimrsBotAction = (typeof SIMRS_BOT_ACTIONS)[number];

export const SIMRS_BOT_ACTIVE_STATUSES = [
  "pending",
  "claimed",
  "running",
] as const;

export type SimrsBotJobStatus =
  | "pending"
  | "claimed"
  | "running"
  | "done"
  | "error"
  | "cancelled";

export type SimrsBotJob = {
  id: string;
  action: string;
  status: SimrsBotJobStatus;
  requested_by: string | null;
  error: string | null;
  result: unknown;
  created_at: string;
  claimed_at: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export function isSimrsBotAction(v: unknown): v is SimrsBotAction {
  return (
    typeof v === "string" &&
    (SIMRS_BOT_ACTIONS as readonly string[]).includes(v)
  );
}

/** Verify agent Bearer token against SIMRS_BOT_AGENT_TOKEN env. */
export function requireAgentToken(request: Request): boolean {
  const expected = (process.env.SIMRS_BOT_AGENT_TOKEN || "").trim();
  if (!expected) return false;
  const auth = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return false;
  return m[1].trim() === expected;
}
