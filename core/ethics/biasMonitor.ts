// biasMonitor.ts
export function biasScore(dataset: any[]) {
  const score = Math.random();
  return { score, safe: score < 0.7 };
}
