/**
 * Gabungkan pemanggilan async identik yang overlap (mis. React Strict Mode dev).
 * Setelah selesai (sukses/gagal), kunci dibuang sehingga request berikutnya fresh.
 *
 * Map di `globalThis` agar dedupe tetap satu antar potongan bundle client (HMR / split).
 */
const G = globalThis as typeof globalThis & {
  __idikRunDeduped?: Map<string, Promise<unknown>>;
};
const inflight = G.__idikRunDeduped ?? (G.__idikRunDeduped = new Map());

export function runDeduped<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn().finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, p);
  return p as Promise<T>;
}
