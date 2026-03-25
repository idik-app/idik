import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import {
  getAppUserRowBySessionIdentity,
  isLikelyUuid,
} from "@/lib/auth/resolveAppUser";

/** Info sesi login (JWT app_users / Supabase + app_users). */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + service role).",
      },
      { status: 503 }
    );
  }

  const row = await getAppUserRowBySessionIdentity(supabase, user.userId);
  const username =
    row?.username ??
    (!isLikelyUuid(user.userId) ? user.userId : null);

  return NextResponse.json({
    ok: true,
    username: username ?? user.userId,
    role: user.role,
  });
}
