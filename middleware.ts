import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/* 🛡️ IDIK-App Advanced Security Middleware v2.0
   🔹 Global API Protection & JWT Verification
   🔹 Security Headers (HSTS, CSP, X-Frame-Options)
   🔹 RBAC: multi-tier access control
*/

const LOG_PREFIX = "[Security-Middleware]";
const ADMIN_ROLES = ["admin", "administrator", "superadmin"];
const ADMINISTRATOR_ROLES = ["administrator", "superadmin"];
const SUPERADMIN_ROLES = ["superadmin"];

// Whitelist rute publik (tidak butuh auth)
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/version",
  "/api/health",
];

/** Secret management dengan fallback aman (error di production) */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error(`${LOG_PREFIX} FATAL: JWT_SECRET tidak terkonfigurasi di Production!`);
  }
  return secret || "dev-secret-warning-unsecure";
}

/** Helper untuk menyuntikkan header keamanan standar industri */
function applySecurityHeaders(res: NextResponse) {
  const headers = res.headers;
  headers.set("X-DNS-Prefetch-Control", "on");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // CSP Dasar (Bisa diperketat sesuai kebutuhan)
  headers.set("Content-Security-Policy", "frame-ancestors 'none';");
  return res;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");
  
  // 1. Inisialisasi Response (default: lanjut ke rute berikutnya)
  let res = NextResponse.next();

  // 2. Terapkan Security Headers ke semua response (termasuk redirect)
  res = applySecurityHeaders(res);

  // 3. Bypass Auth untuk Rute Publik
  const isPublicApi = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
  if (isPublicApi) return res;

  // Khusus /distributor/pemakaian dengan focus_order (Public Portal)
  if (pathname === "/distributor/pemakaian" && req.nextUrl.searchParams.get("focus_order")) {
    return res;
  }

  // 4. Verifikasi Token
  const token = req.cookies.get("session")?.value;
  if (!token) {
    if (isApi) {
      return applySecurityHeaders(NextResponse.json({ ok: false, message: "Unauthorized: No session" }, { status: 401 }));
    }
    return applySecurityHeaders(redirectToHome(req, "missing"));
  }

  try {
    const secret = getSecret();
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    const role = String((payload as any)?.role ?? "pasien").trim().toLowerCase();

    // 5. RBAC Logic
    
    // Portal Distributor
    if (pathname.startsWith("/distributor")) {
      const allow = ["distributor", "perawat", "vendor", ...ADMIN_ROLES];
      if (!allow.includes(role)) return applySecurityHeaders(redirectToUnauthorized(req));
    }

    // Portal Depo
    if (pathname.startsWith("/depo")) {
      const allow = ["depo_farmasi", "depo", "perawat", "farmasi", ...ADMIN_ROLES];
      if (!allow.includes(role)) return applySecurityHeaders(redirectToUnauthorized(req));
    }

    // Rute Sensitif (Database/Audit)
    if (pathname.includes("/database") || pathname.includes("/audit")) {
      const isSensitiveApi = isApi && (pathname.includes("/database") || pathname.includes("/audit"));
      
      // Superadmin Only untuk Database
      if (pathname.includes("/database")) {
        if (!SUPERADMIN_ROLES.includes(role)) {
          if (isApi) return applySecurityHeaders(NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }));
          return applySecurityHeaders(redirectToUnauthorized(req));
        }
      } 
      // Administrator+ untuk Audit
      else if (pathname.includes("/audit")) {
        if (!ADMINISTRATOR_ROLES.includes(role)) {
          if (isApi) return applySecurityHeaders(NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }));
          return applySecurityHeaders(redirectToUnauthorized(req));
        }
      }
    }

    // Admin-only Dashboard
    if (pathname.startsWith("/dashboard/admin") && !ADMIN_ROLES.includes(role)) {
      return applySecurityHeaders(redirectToUnauthorized(req));
    }

    // 6. Finalisasi - Lanjutkan dengan headers
    return res;
  } catch (err) {
    console.error(`${LOG_PREFIX} JWT Error:`, err);
    if (isApi) {
      return applySecurityHeaders(NextResponse.json({ ok: false, message: "Unauthorized: Invalid token" }, { status: 401 }));
    }
    return applySecurityHeaders(redirectToHome(req, "invalid"));
  }
}

/* 🔁 Redirect Helpers */
function redirectToHome(req: NextRequest, reason: string) {
  const url = new URL("/", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  url.searchParams.set("reason", reason);
  const res = NextResponse.redirect(url);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

function redirectToUnauthorized(req: NextRequest) {
  const url = new URL("/unauthorized", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/* ✅ Matcher: Mencakup API dan semua portal utama */
export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/system/:path*",
    "/distributor/:path*",
    "/depo/:path*",
  ],
};

