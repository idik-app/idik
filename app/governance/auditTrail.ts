// auditTrail.ts
export function logAction(user: string, action: string) {
  console.log(`[AuditTrail] ${user} -> ${action}`);
}
