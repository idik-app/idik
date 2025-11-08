// app/api/users/route.ts
import { createServerClientInstance } from "@/lib/supabase/server-";

export async function GET() {
  const supabase = await createServerClientInstance();
  const { data, error } = await supabase.from("doctor").select("*");
  return Response.json({ data, error });
}
