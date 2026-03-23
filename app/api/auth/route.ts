import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { getRedirectTargetForRole } from "@/lib/auth/redirect";

const COOKIE_NAME = "session";

type AuthUser = {
  username: string;
  password: string;
  role: string;
  distributorId?: string | null;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET wajib di-set di production");
  }
  return secret || "dev-secret";
}

/** Supabase admin client untuk baca app_users (hanya jika env ada). */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/** Ambil user dari tabel app_users dan verifikasi password. */
async function getUserFromDb(
  supabase: SupabaseAdmin,
  username: string,
  password: string
): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("username, password_hash, role, distributor_id")
      .eq("username", username)
      .maybeSingle();

    if (error || !data?.password_hash) return null;

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) return null;

    const role = ((data.role as string) || "pasien").toLowerCase();
    return {
      username: data.username,
      password: "", // tidak dikembalikan
      role,
      distributorId: (data as any)?.distributor_id ?? null,
    };
  } catch {
    return null;
  }
}

/* ============================================================
   🔐 LOGIN — hanya DB (app_users), Supabase service role wajib
============================================================ */
export async function POST(req: Request) {
  let secret: string;
  try {
    secret = getSecret();
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Server auth tidak dikonfigurasi (JWT_SECRET)." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, message: "Username dan password wajib." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Login hanya dari database: set NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY (service role) agar tabel app_users dapat dibaca.",
      },
      { status: 503 }
    );
  }

  const user = await getUserFromDb(supabase, username, password);

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 }
    );
  }

  const role = String(user.role).trim().toLowerCase();
  const distributorId = user.distributorId ?? null;
  const distributorRoles = new Set(["distributor", "vendor"]);
  const hasDistributorId =
    distributorId != null && String(distributorId).trim() !== "";
  if (distributorRoles.has(role) && !hasDistributorId) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Akun distributor belum terikat ke data master (distributor_id kosong). Hubungi admin RS.",
      },
      { status: 403 }
    );
  }
  const token = jwt.sign(
    { username: user.username, role, distributor_id: distributorId },
    secret,
    { expiresIn: "30d" }
  );

  const target = getRedirectTargetForRole(role);

  console.log(
    `[Auth] login ok username=${user.username} role=${role} target=${target}`
  );

  const res = NextResponse.json({ ok: true, target }, { status: 200 });
  const isProd = process.env.NODE_ENV === "production";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.toLowerCase();
  const isHttps =
    req.url.toLowerCase().startsWith("https://") || forwardedProto === "https";
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Jika kamu akses via http://localhost tapi NODE_ENV=production,
    // cookie secure:true tidak akan tersimpan/terkirim.
    secure: isProd && isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 hari agar tidak logout saat idle
  });

  return res;
}

/* ============================================================
   🚪 LOGOUT
============================================================ */
export async function DELETE(req: Request) {
  const res = new NextResponse(
    JSON.stringify({ ok: true, message: "Logout berhasil" }),
    { status: 200 }
  );
  const isProd = process.env.NODE_ENV === "production";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.toLowerCase();
  const isHttps =
    req.url.toLowerCase().startsWith("https://") || forwardedProto === "https";
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    // Samakan secure flag dengan saat cookie dibuat supaya benar-benar terhapus.
    secure: isProd && isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
