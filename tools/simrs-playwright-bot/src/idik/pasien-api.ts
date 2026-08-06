import { config } from "../config.js";
import type { IdikSession } from "./login.js";
import { timed } from "../util/timing.js";

export type IdikPasien = {
  id: string;
  noRM: string;
  nama?: string;
  [key: string]: unknown;
};

async function idikFetch(
  session: IdikSession,
  path: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  headers.set("Cookie", session.cookieHeader);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${config.idikBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
}

export async function findPasienByNoRm(
  session: IdikSession,
  noRm: string,
): Promise<IdikPasien | null> {
  const { result } = await timed("idik:findPasien", async () => {
    const res = await idikFetch(
      session,
      `/api/pasien?noRm=${encodeURIComponent(noRm)}`,
    );
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: IdikPasien | null;
    };
    if (!res.ok || !json.ok || !json.data?.id) return null;
    return json.data;
  });
  return result;
}

export async function addPasien(
  session: IdikSession,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; data?: IdikPasien; error?: string; ms: number }> {
  const { result, ms } = await timed("idik:addPasien", async () => {
    const res = await idikFetch(session, "/api/pasien/add", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: IdikPasien;
      error?: unknown;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false as const,
        error:
          typeof json.error === "string"
            ? json.error
            : json.message || `HTTP ${res.status}`,
      };
    }
    return { ok: true as const, data: json.data };
  });
  return { ...result, ms };
}

export async function updatePasien(
  session: IdikSession,
  id: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; data?: IdikPasien; error?: string; ms: number }> {
  const { result, ms } = await timed("idik:updatePasien", async () => {
    const res = await idikFetch(
      session,
      `/api/pasien/${encodeURIComponent(id)}/edit`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      data?: IdikPasien;
      error?: unknown;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false as const,
        error:
          typeof json.error === "string"
            ? json.error
            : json.message || `HTTP ${res.status}`,
      };
    }
    return { ok: true as const, data: json.data };
  });
  return { ...result, ms };
}

export async function listTindakan(
  session: IdikSession,
  search = "",
): Promise<Record<string, unknown>[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : "";
  const res = await idikFetch(session, `/api/tindakan${q}`);
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: Record<string, unknown>[];
  };
  if (!res.ok || !json.ok || !Array.isArray(json.data)) return [];
  return json.data;
}

export async function patchTindakan(
  session: IdikSession,
  id: string,
  patch: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const res = await idikFetch(session, `/api/tindakan/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || json.ok === false) {
    return { ok: false, error: json.message || `HTTP ${res.status}` };
  }
  return { ok: true };
}
