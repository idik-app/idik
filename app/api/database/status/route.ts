import { requireUser } from "@/lib/auth/guards";

export async function GET() {
  const id = await requireUser();
  if (!id.ok) return id.response;

  try {
    // Panggil Supabase atau query ringan
    await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
