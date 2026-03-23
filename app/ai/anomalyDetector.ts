// anomalyDetector.ts
export function detectAnomaly(data: number[]) {
  const mean = data.reduce((a, b) => a + b) / data.length;
  const abnormal = data.filter((v) => Math.abs(v - mean) > mean * 0.2);
  return { mean, abnormal };
}
