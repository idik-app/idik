import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* ⚙️ IDIK-App Middleware v1.5 – 9 Role RBAC (docs/AUDIT_LEVEL_IDIK.md)
   🔹 Verifikasi JWT berbasis cookie "session"
   🔹 RBAC: admin / administrator / superadmin untuk rute sensitif
*/

/** Secret harus sama dengan app/api/auth/route.ts (baca per-request agar konsisten dengan API). */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    console.error("[Middleware] JWT_SECRET tidak di-set di production");
    return "";
  }
  return secret || "dev-secret";
}

// Role tiers (lowercase)
const ADMIN_ROLES = ["admin", "administrator", "superadmin"];
const ADMINISTRATOR_ROLES = ["administrator", "superadmin"];
const SUPERADMIN_ROLES = ["superadmin"];

const LOG_PREFIX = "[Middleware]";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isSystem = pathname.startsWith("/system");
  const isDistributor = pathname.startsWith("/distributor");
  const isDepo = pathname.startsWith("/depo");

  /** URL lama: login depo terpisah — sekarang semua lewat root `/`. */
  if (pathname === "/depo/login" || pathname.startsWith("/depo/login/")) {
    const url = new URL("/", req.url);
    const from = req.nextUrl.searchParams.get("from");
    if (from) url.searchParams.set("from", from);
    return NextResponse.redirect(url);
  }

  if (!isDashboard && !isSystem && !isDistributor && !isDepo)
    return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) {
    console.log(`${LOG_PREFIX} ${pathname} → redirect reason=missing (no session cookie)`);
    return redirectToHome(req, "missing");
  }

  // /system/* tidak ada RBAC khusus; cukup wajib login
  if (isSystem) {
    const secret = getSecret();
    if (!secret) return redirectToHome(req, "invalid");
    try {
      const secretKey = new TextEncoder().encode(secret);
      await jwtVerify(token, secretKey);
      return NextResponse.next();
    } catch (err) {
      console.warn(`${LOG_PREFIX} ${pathname} → redirect reason=invalid (token verify failed):`, err);
      return redirectToHome(req, "invalid");
    }
  }

  const secret = getSecret();
  if (!secret) {
    console.log(`${LOG_PREFIX} ${pathname} → redirect reason=invalid (JWT_SECRET empty)`);
    return redirectToHome(req, "invalid");
  }

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const role =
      (payload as any)?.role != null
        ? String((payload as any)?.role).trim().toLowerCase()
        : "pasien";

    // Portal distributor: allow distributor + admin tiers
    if (isDistributor) {
      const allow = new Set([
        "distributor",
        // Legacy role mapping: getRedirectTargetForRole("vendor") → /distributor/dashboard
        // so middleware must allow it too.
        "vendor",
        "admin",
        "administrator",
        "superadmin",
      ]);
      if (!allow.has(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
      console.log(`${LOG_PREFIX} ${pathname} → ok role=${role}`);
      return NextResponse.next();
    }

    if (isDepo) {
      const allow = new Set([
        "depo_farmasi",
        "depo",
        "farmasi",
        "pharmacy",
        "admin",
        "administrator",
        "superadmin",
      ]);
      if (!allow.has(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
      console.log(`${LOG_PREFIX} ${pathname} → ok role=${role}`);
      return NextResponse.next();
    }

    // Rute sensitif: tier admin / administrator / superadmin (cek spesifik dulu)
    if (pathname.startsWith("/system/database/audit")) {
      if (!ADMINISTRATOR_ROLES.includes(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
    } else if (pathname.startsWith("/system/database")) {
      if (!SUPERADMIN_ROLES.includes(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
    } else if (pathname.startsWith("/dashboard/database")) {
      if (!SUPERADMIN_ROLES.includes(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
    } else if (pathname.startsWith("/dashboard/audit")) {
      if (!ADMINISTRATOR_ROLES.includes(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
    } else if (pathname.startsWith("/dashboard/admin")) {
      if (!ADMIN_ROLES.includes(role)) {
        console.warn(`${LOG_PREFIX} [RBAC] ditolak role=${role} path=${pathname} → /unauthorized`);
        return redirectToUnauthorized(req);
      }
    }

    console.log(`${LOG_PREFIX} ${pathname} → ok role=${role}`);
    return NextResponse.next();
  } catch (err) {
    console.warn(`${LOG_PREFIX} ${pathname} → redirect reason=invalid (token verify failed):`, err);
    return redirectToHome(req, "invalid");
  }
}

/* 🔁 Redirect helper: kembali ke root dengan alasan (no-store agar redirect tidak di-cache) */
function redirectToHome(req: NextRequest, reason: "missing" | "invalid") {
  const url = new URL("/", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  url.searchParams.set("reason", reason);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("Pragma", "no-cache");
  return res;
}

/* 🚫 Redirect ke halaman unauthorized */
function redirectToUnauthorized(req: NextRequest) {
  const url = new URL("/unauthorized", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/* ✅ Matcher: dashboard + system (keduanya wajib login) */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/system",
    "/system/:path*",
    "/distributor",
    "/distributor/:path*",
    "/depo",
    "/depo/:path*",
  ],
};
