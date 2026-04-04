import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/guards";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const supabase = await createClient();

  const { data, error } = await supabase.from("doctor").select("*");
  return NextResponse.json({ data, error });
}
