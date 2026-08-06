export function nowMs(): number {
  return Date.now();
}

export async function timed<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; ms: number }> {
  const t0 = nowMs();
  const result = await fn();
  const ms = nowMs() - t0;
  console.log(`[${label}] ${ms}ms`);
  return { result, ms };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
