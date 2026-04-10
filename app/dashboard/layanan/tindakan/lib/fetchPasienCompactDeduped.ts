/**
 * Dedupe concurrent GET /api/pasien?compact=1 (mis. React Strict Mode dev double-mount).
 * Setelah sync master, panggil invalidate agar fetch berikutnya fresh.
 */
let inflight: Promise<unknown[]> | null = null;

export function invalidatePasienCompactDedupedCache() {
  inflight = null;
}

export async function fetchPasienCompactDeduped(): Promise<unknown[]> {
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch("/api/pasien?compact=1&limit=1000", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: unknown;
          error?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Gagal mengambil data pasien.");
        }
        return Array.isArray(json.data) ? json.data : [];
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}
