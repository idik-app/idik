// threatMonitor.ts
export function monitorThreat(activity: string) {
  if (activity.includes("unauthorized"))
    console.warn("[Threat] Suspicious activity");
}
