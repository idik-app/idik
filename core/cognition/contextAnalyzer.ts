// contextAnalyzer.ts
export function analyzeContext(input: string) {
  console.log("[ContextAnalyzer] Analyzing:", input);
  return { keywords: input.split(" "), complexity: input.length };
}
