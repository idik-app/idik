import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("system_audit")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    console.error("[AUDIT FETCH ERROR]", err);
    return NextResponse.json(
      { ok: false, message: err.message },
      { status: 500 }
    );
  }
}
