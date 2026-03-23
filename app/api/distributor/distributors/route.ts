import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

export async function GET() {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  let q = supabase.from("master_distributor").select("id,nama_pt,is_active").order("nama_pt", { ascending: true });
  if (!id.isAdminView && id.distributorId) {
    q = q.eq("id", id.distributorId);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}

