export async function POST() {
  globalThis.logs = [];
  return Response.json({ ok: true });
}
