import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const supabaseServer = await createClient();
  const { data, error } = await supabaseServer
    .from("system_filelog")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  return NextResponse.json({ status: "ok", data });
}
