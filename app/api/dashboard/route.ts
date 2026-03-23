import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-";
import { requireUser } from "@/lib/auth/guards";

export async function GET() {
  const id = await requireUser();
  if (!id.ok) return id.response;

  const supabase = await createClient();
  const { data, error } = await supabase.from("users").select("*");
  return NextResponse.json({ data, error });
}

export async function POST(req: Request) {
  const id = await requireUser();
  if (!id.ok) return id.response;
  const body = await req.json();
  return NextResponse.json({ message: "Data diterima", body });
}
