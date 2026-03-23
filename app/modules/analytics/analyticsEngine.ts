// analyticsEngine.ts
export function generateInsight(dataset: any[]) {
  const total = dataset.length;
  return { total, insight: `Analisis ${total} data selesai.` };
}
