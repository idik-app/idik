// identityGuard.ts
export function verifyIdentity(token: string) {
  return token.startsWith("IDIK");
}
