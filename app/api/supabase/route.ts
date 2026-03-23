import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/lib/database.types";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const store = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => store.get(n)?.value,
        set() {},
        remove() {},
      },
    }
  );

  const { data, error } = await supabase.from("doctor").select("*");
  return NextResponse.json({ data, error });
}
