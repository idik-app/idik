import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { UNIT_DYNAMIC_PATH_ALLOWED_ROLES } from "@/lib/auth/redirect";

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

/** SIMRS bot agent (PC LAN) — auth via Bearer SIMRS_BOT_AGENT_TOKEN di route handler. */
const SIMRS_BOT_AGENT_API_PREFIXES = [
  "/api/system/simrs-bot-jobs",
  "/api/system/simrs-bot-field-maps",
  "/api/system/simrs-bot-agents",
  "/api/system/simrs-bot-status",
  "/api/system/simrs-bot-workflows",
];

function isSimrsBotAgentBearerRequest(req: NextRequest, pathname: string): boolean {
  if (!SIMRS_BOT_AGENT_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return false;
  }
  const auth = req.headers.get("authorization") || "";
  return /^Bearer\s+\S+/i.test(auth);
}

/** Secret management dengan fallback aman (error di production) */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error(`${LOG_PREFIX} FATAL: JWT_SECRET tidak terkonfigurasi di Production!`);
  }
  // Samakan dengan app/api/auth, guards, dan app/page (verifikasi JWT harus konsisten).
  return secret || "dev-secret";
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
  headers.set(
    "Permissions-Policy",
    /** `camera=(self)` agar barcode scanner (/distributor/…) bisa memanggil getUserMedia; blokir mikrofon/lokasi luar origin tetap konservatif. */
    "camera=(self), microphone=(self), geolocation=()",
  );
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

  // Bypass static files & media assets (sfx, sounds, images, fonts, etc.)
  if (
    pathname.startsWith("/sfx/") ||
    pathname.startsWith("/sounds/") ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|mp3|wav|ogg|woff2?|ttf|eot)$/i.test(pathname)
  ) {
    return res;
  }

  // 3. Bypass Auth untuk Rute Publik
  const isPublicApi = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
  /** Login & logout JWT (`app/api/auth/route.ts`) — tanpa cookie; jangan pakai prefix `/api/auth` agar `/api/auth/me` tetap terlindungi. */
  const isAuthSessionExchange =
    pathname === "/api/auth" &&
    (req.method === "POST" || req.method === "DELETE");
  if (isPublicApi || isAuthSessionExchange) return res;

  // Agen Playwright PC RS: Bearer saja (tanpa cookie session); token divalidasi di route.
  if (isApi && isSimrsBotAgentBearerRequest(req, pathname)) {
    return res;
  }

  // Khusus /distributor/pemakaian dengan focus_order (Public Portal)
  if (pathname === "/distributor/pemakaian" && req.nextUrl.searchParams.get("focus_order")) {
    return res;
  }

  // Dokumen root: publik (intro + modal login). Tanpa cookie, redirect ke
  // `/?from=/&reason=missing` memicu permintaan ke `/` lagi → loop tak terbatas (ERR_TOO_MANY_REDIRECTS).
  if (!isApi && pathname === "/") {
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

    // 5. RBAC Logic & Unit Isolation
    
    // Check for dynamic unit path: /[room]/...
    const pathSegments = pathname.split("/").filter(Boolean);
    const potentialRoom = pathSegments[0];
    
    // Daftar reserved paths yang bukan merupakan ID Unit
    const RESERVED_PATHS = ["api", "dashboard", "system", "distributor", "depo", "unauthorized", "login", "auth", "casemix"];
    
    if (potentialRoom && !RESERVED_PATHS.includes(potentialRoom)) {
      // Rute unit dinamis: /iccu/dashboard, /idik/..., dll.
      // Selaraskan dengan `getRedirectTargetForRole` + `requireUnitAccess` (staff, radiografer, …).
      if (!UNIT_DYNAMIC_PATH_ALLOWED_ROLES.has(role)) {
        // Khusus API tindakan, allow casemix tanpa unit slug
        if (!(isApi && pathname.startsWith("/api/tindakan") && role === "casemix")) {
          return applySecurityHeaders(redirectToUnauthorized(req));
        }
      }

      res.headers.set("x-unit-slug", potentialRoom);
    }

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

    // Casemix-only Dashboard
    if (pathname.startsWith("/casemix") && !["casemix", "perawat", ...ADMIN_ROLES].includes(role)) {
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

/* ✅ Matcher: Mencakup API, Portal utama, dan Unit dinamis */
export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/system/:path*",
    "/distributor/:path*",
    "/depo/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sfx/|sounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|woff|woff2|ttf|eot)$).*)",
  ],
};

