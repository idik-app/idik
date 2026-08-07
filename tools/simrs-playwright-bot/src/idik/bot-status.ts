import { config } from "../config.js";
import type { IdikSession } from "./login.js";

export type BotStatusState =
  | "idle"
  | "running"
  | "ok"
  | "error"
  | "agent_offline";

export type BotStatusPayload = {
  state: BotStatusState;
  norm?: string;
  at: string;
  ms?: number;
  error?: string;
  job_id?: string;
  step?: string;
  steps?: unknown[];
  agent_id?: string;
  heartbeat?: boolean;
};

export async function postBotStatus(
  session: IdikSession | null,
  payload: Omit<BotStatusPayload, "at"> & { at?: string },
): Promise<void> {
  if (!config.botStatusEnabled) return;
  const body: BotStatusPayload = {
    state: payload.state,
    norm: payload.norm,
    ms: payload.ms,
    error: payload.error ? String(payload.error).slice(0, 200) : undefined,
    at: payload.at ?? new Date().toISOString(),
    job_id: payload.job_id,
    step: payload.step,
    steps: payload.steps,
    agent_id: payload.agent_id,
    heartbeat: payload.heartbeat ?? true,
  };
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (session?.cookieHeader) headers.Cookie = session.cookieHeader;
    if (config.agentToken) {
      headers.Authorization = `Bearer ${config.agentToken}`;
    }
    await fetch(`${config.idikBaseUrl}/api/system/simrs-bot-status`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    /* status sync must not break bot */
  }
}

export async function postAgentHeartbeat(agentId: string, rsId = "default") {
  if (!config.agentToken) return;
  try {
    await fetch(`${config.idikBaseUrl}/api/system/simrs-bot-agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.agentToken}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
        rs_id: rsId,
        label: agentId,
      }),
    });
    await postBotStatus(null, {
      state: "idle",
      heartbeat: true,
      agent_id: agentId,
      norm: "heartbeat",
    });
  } catch {
    /* ignore */
  }
}
