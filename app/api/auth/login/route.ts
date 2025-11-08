// 💾 app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server-";

/* ============================================================
   🔐 LOGIN DENGAN SUPABASE AUTH
============================================================ */
export async function POST(req: Request) {
  const { email, password } = await req.json();

  // 1. Supabase Server Client (await karena async)
  const supabase = await createClient();

  // 2. Login user
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    console.error("❌ SUPABASE AUTH ERROR:", error?.message);
    return NextResponse.json(
      {
        ok: false,
        message:
          error?.message || "Kredensial salah atau user tidak ditemukan.",
      },
      { status: 401 }
    );
  }

  // 3. Ambil role dari metadata (default: "user")
  const userRole = data.user.user_metadata?.role || "user";

  // 4. Peta role → halaman redirect
  const routeMap: Record<string, string> = {
    admin: "/dashboard/admin",
    staff: "/dashboard/inventaris",
    user: "/dashboard/pasien",
  };
  const target = routeMap[userRole] || "/dashboard";

  // 5. Redirect (Supabase sudah otomatis set cookie session)
  return new NextResponse(null, {
    status: 307,
    headers: { Location: target },
  });
}

/* ============================================================
   🚪 LOGOUT – Hapus Session Supabase
============================================================ */
export async function DELETE() {
  const supabase = await createClient(); // ← perlu await
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("❌ SUPABASE LOGOUT ERROR:", error.message);
    return NextResponse.json(
      { ok: false, message: "Gagal logout." },
      { status: 500 }
    );
  }

  // Supabase otomatis hapus cookie sesi
  return NextResponse.json(
    { ok: true, message: "Logout berhasil" },
    { status: 200 }
  );
}
