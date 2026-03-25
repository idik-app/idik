import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const COOKIE_NAME = "session";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("JWT_SECRET wajib di-set di production");
  }
  return secret || "dev-secret";
}

export type DashboardSession = {
  username: string;
  role: string;
};

/**
 * Memverifikasi cookie `session` (sama seperti middleware dashboard).
 * Dipakai server actions agar mutasi DB tidak mengandalkan Supabase Auth + RLS anon.
 */
export async function requireDashboardSession(): Promise<DashboardSession> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    throw new Error("Sesi tidak ditemukan. Silakan login ulang.");
  }

  const secret = getSecret();
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    const username = String((payload as { username?: string })?.username ?? "").trim();
    const role = String(
      (payload as { role?: string })?.role ?? "pasien"
    )
      .trim()
      .toLowerCase();
    if (!username) {
      throw new Error("Token sesi tidak valid.");
    }
    return { username, role };
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Sesi")) throw e;
    throw new Error("Sesi tidak valid atau kedaluwarsa. Silakan login ulang.");
  }
}
