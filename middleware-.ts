import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

/* ⚙️ IDIK-App Middleware v1.4 – Gold-Cyan Hybrid + RBAC
   🔹 Verifikasi JWT berbasis cookie "session"
   🔹 Menolak akses non-admin ke modul sensitif
   🔹 Menyertakan redirect aman dengan parameter asal (?from=/dashboard/...)
*/

const SECRET = process.env.JWT_SECRET || "dev-secret";

// Modul sensitif hanya untuk admin
const adminRoutes = ["/dashboard/audit", "/dashboard/database"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Hanya pantau rute dashboard
  if (!pathname.startsWith("/dashboard")) return NextResponse.next();

  const token = req.cookies.get("session")?.value;
  if (!token) return redirectToHome(req, "missing");

  try {
    const decoded: any = jwt.verify(token, SECRET);

    // Simpan payload ke request (untuk debugging / header)
    const role = decoded.role?.toLowerCase?.() || "user";

    // Proteksi halaman admin
    if (adminRoutes.some((r) => pathname.startsWith(r)) && role !== "admin") {
      console.warn(`[RBAC] akses ditolak (${role}) ke ${pathname}`);
      return redirectToUnauthorized(req);
    }

    // Lolos → lanjutkan
    return NextResponse.next();
  } catch (err) {
    console.warn("⚠️ Token invalid/expired:", err);
    return redirectToHome(req, "invalid");
  }
}

/* 🔁 Redirect helper: kembali ke root dengan alasan */
function redirectToHome(req: NextRequest, reason: "missing" | "invalid") {
  const url = new URL("/", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

/* 🚫 Redirect ke halaman unauthorized */
function redirectToUnauthorized(req: NextRequest) {
  const url = new URL("/unauthorized", req.url);
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/* ✅ Matcher */
export const config = {
  matcher: ["/dashboard/:path*"],
};
