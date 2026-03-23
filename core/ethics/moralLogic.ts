// moralLogic.ts
export function moralDecision(action: string) {
  const allowed = !action.includes("harm");
  return { action, allowed };
}
