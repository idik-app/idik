import { requireAdmin } from "@/lib/auth/guards";

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  globalThis.logs = [];
  return Response.json({ ok: true });
}
