import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-";

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.from("users").select("*");
  return NextResponse.json({ data, error });
}

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({ message: "Data diterima", body });
}
