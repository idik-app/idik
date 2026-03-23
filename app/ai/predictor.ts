// predictor.ts
export function predictNext(values: number[]) {
  const trend = values.slice(-3).reduce((a, b) => a + b) / 3;
  return trend + Math.random();
}
