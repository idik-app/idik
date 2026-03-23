// app/api/users/route.ts
import { createServerClientInstance } from "@/lib/supabase/server-";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.from("doctor").select("*");
  return Response.json({ data, error });
}
