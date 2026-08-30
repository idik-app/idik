import { mutate } from "swr";

const FETCH_TIMEOUT_MS = 60_000;

/** Batas baris default tabel / Jadwal per rentang tanggal. */
export const DEFAULT_TINDAKAN_LIMIT = 1000;
export const JADWAL_TINDAKAN_LIMIT = 1000;

export function clampTindakanLimit(limit?: number): number {
  if (typeof limit === "number" && Number.isFinite(limit)) {
    return Math.min(Math.max(Math.trunc(limit), 1), 10000);
  }
  return DEFAULT_TINDAKAN_LIMIT;
}

export function buildTindakanListKey(params?: {
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}): string {
  const p = new URLSearchParams();
  p.set("limit", String(clampTindakanLimit(params?.limit)));
  if (params?.from) p.set("from", params.from);
  if (params?.to) p.set("to", params.to);
  if (params?.search) p.set("search", params.search);
  return `/api/tindakan?${p.toString()}`;
}

export function isTindakanListSwrKey(key: unknown): key is string {
  return typeof key === "string" && key.startsWith("/api/tindakan?");
}

export async function fetchTindakanList(url: string) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new Error(
        "Request terlalu lama (lebih dari 60 detik). Coba muat ulang.",
      );
    }
    throw err;
  }
}

/** Revalidate semua cache daftar tindakan (tabel utama + Jadwal Cath Lab). */
export function mutateAllTindakanLists() {
  return mutate(isTindakanListSwrKey, undefined, { revalidate: true });
}
