import { config } from "../config.js";
import type { IdikSession } from "./login.js";

export type BotStatusState = "idle" | "running" | "ok" | "error";

export type BotStatusPayload = {
  state: BotStatusState;
  norm?: string;
  at: string;
  ms?: number;
  error?: string;
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
    error: payload.error ? String(payload.error).slice(0, 120) : undefined,
    at: payload.at ?? new Date().toISOString(),
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
