import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const COOKIE_NAME = "session";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return "";
  }
  return secret || "dev-secret";
}

/* ⚙️ IDIK-App API: /api/auth/refresh
   - Baca JWT dari cookie session, kembalikan username + role agar client bisa set SessionContext.
*/

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const secret = getSecret();
  const isProd = process.env.NODE_ENV === "production";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.toLowerCase();
  const isHttps =
    req.url.toLowerCase().startsWith("https://") || forwardedProto === "https";

  if (!token || !secret) {
    return NextResponse.json(
      {
        ok: false,
        message: "No session",
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );
  }

  try {
    const decoded = jwt.verify(token, secret) as {
      username?: string;
      role?: string;
      distributor_id?: string | null;
    };

    const username =
      typeof decoded?.username === "string" ? decoded.username : null;
    const role =
      typeof decoded?.role === "string"
        ? decoded.role.trim().toLowerCase()
        : "user";
    const distributor_id =
      typeof decoded?.distributor_id === "string"
        ? decoded.distributor_id
        : decoded?.distributor_id ?? null;

    // Sliding session: perpanjang token agar tidak expired saat idle
    const refreshedToken = jwt.sign(
      { username, role, distributor_id },
      secret,
      { expiresIn: "30d" }
    );

    const res = NextResponse.json({
      ok: true,
      message: "Token refresh OK",
      timestamp: new Date().toISOString(),
      username: username ?? undefined,
      role,
    });

    res.cookies.set(COOKIE_NAME, refreshedToken, {
      httpOnly: true,
      secure: isProd && isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 hari agar tidak logout saat idle
    });

    return res;
  } catch {
    const res = NextResponse.json(
      {
        ok: false,
        message: "Token invalid or expired",
        timestamp: new Date().toISOString(),
      },
      { status: 401 }
    );

    // Bersihkan cookie supaya middleware tidak lagi memverifikasi token invalid.
    res.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: isProd && isHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  }
}
