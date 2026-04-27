import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRedirectTargetForRole } from "@/lib/auth/redirect";

const COOKIE_NAME = "session";

type AuthUser = {
  username: string;
  password: string;
  role: string;
  distributorId?: string | null;
  ruanganSlug?: string | null;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET wajib di-set di production");
  }
  return secret || "dev-secret";
}

const isDev = process.env.NODE_ENV !== "production";

/** Ambil user dari tabel app_users dan verifikasi password. */
async function getUserFromDb(
  supabase: any,
  username: string,
  password: string
): Promise<AuthUser | null> {
  try {
    // Tanpa embed `ruangan ( slug )`: relasi/embed kadang gagal di schema/cache DB
    // sehingga seluruh login terlihat "salah password" (401).
    const { data, error } = await supabase
      .from("app_users")
      .select(
        "username, password_hash, role, distributor_id, ruangan_id"
      )
      .eq("username", username)
      .maybeSingle();

    if (error) {
      if (isDev) {
        console.warn("[Auth] app_users query error:", error.message, error.code);
      }
      return null;
    }

    if (!data?.password_hash) {
      if (isDev && data) {
        console.warn(
          "[Auth] app_users row exists but password_hash kosong:",
          username
        );
      }
      return null;
    }

    const ok = await bcrypt.compare(password, data.password_hash);
    if (!ok) {
      if (isDev) {
        console.warn("[Auth] password tidak cocok untuk username:", username);
      }
      return null;
    }

    const role = ((data.role as string) || "pasien").toLowerCase();
    let ruanganSlug: string | null = null;
    const ruId = (data as { ruangan_id?: string | null }).ruangan_id;
    if (ruId != null && String(ruId).trim() !== "") {
      const { data: ru, error: ruErr } = await supabase
        .from("ruangan")
        .select("slug")
        .eq("id", ruId)
        .maybeSingle();
      if (ruErr && isDev) {
        console.warn("[Auth] ruangan slug lookup error:", ruErr.message);
      } else if (ru?.slug != null) {
        const s = String(ru.slug).trim();
        ruanganSlug = s.length > 0 ? s : null;
      }
    }

    return {
      username: data.username,
      password: "",
      role,
      distributorId: (data as any)?.distributor_id ?? null,
      ruanganSlug,
    };
  } catch (e) {
    if (isDev) {
      console.warn("[Auth] getUserFromDb exception:", e);
    }
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

  const supabase = createAdminClient();

  const user = await getUserFromDb(supabase, username, password);

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Username atau password salah." },
      { status: 401 }
    );
  }

  const role = String(user.role).trim().toLowerCase();
  const distributorId = user.distributorId ?? null;
  const ruanganSlug = user.ruanganSlug ?? null;
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
    {
      username: user.username,
      role,
      distributor_id: distributorId,
      ruangan_slug: ruanganSlug,
    },
    secret,
    { expiresIn: "30d" }
  );

  const target = getRedirectTargetForRole(role, { ruanganSlug });

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
