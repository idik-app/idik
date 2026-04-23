import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getAdminOr503 } from "../helpers";

export const dynamic = "force-dynamic";

/**
 * POST — urutan shortcut (pinned) saja.
 * Body: { orderedIds: string[] } — UUID yang di-pin, dari kiri ke kanan.
 */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { supabase, response } = getAdminOr503();
  if (!supabase || response) return response!;

  let body: { orderedIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body JSON tidak valid" }, { status: 400 });
  }

  const raw = body.orderedIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { ok: false, message: "orderedIds harus array" },
      { status: 400 },
    );
  }

  const orderedIds = raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  if (orderedIds.length < 1) {
    return NextResponse.json({ ok: true });
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("internal_phone_directory")
      .update({ is_pinned: true, pin_order: i })
      .eq("id", orderedIds[i]);
    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
