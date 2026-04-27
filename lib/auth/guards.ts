import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isLikelyUuid } from "@/lib/auth/resolveAppUser";

type GuardOk = {
  ok: true;
  userId: string;
  role: string;
  /** Slug unit dari JWT app_users (jika ada). */
  ruanganSlug?: string | null;
};
type GuardFail = { ok: false; response: NextResponse };

function json(status: number, message: string) {
  return NextResponse.json({ ok: false, message, error: message }, { status });
}

function getJwtSecret(): string | null {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") {
    return secret ? secret : null;
  }
  // dev/staging: izinkan fallback agar konsisten dengan middleware
  return secret || "dev-secret";
}

async function getSupabaseIdentity(): Promise<GuardOk | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;

    const roleRaw =
      (data.user.user_metadata as any)?.role ??
      (data.user.app_metadata as any)?.role ??
      "user";

    return {
      ok: true,
      userId: data.user.id,
      role: String(roleRaw).trim().toLowerCase(),
    };
  } catch {
    return null;
  }
}

async function getJwtIdentity(): Promise<GuardOk | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  try {
    const decoded = jwt.verify(token, secret) as Record<string, unknown>;
    const role = String(decoded?.role ?? "user").trim().toLowerCase();
    const userId = String(decoded?.username ?? decoded?.sub ?? "unknown");
    const ruRaw = decoded?.ruangan_slug;
    const ruanganSlug =
      typeof ruRaw === "string" && ruRaw.trim().length > 0
        ? ruRaw.trim()
        : null;
    return { ok: true, userId, role, ruanganSlug };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<GuardOk | GuardFail> {
  const jwtId = await getJwtIdentity();
  if (jwtId) return jwtId;

  const supa = await getSupabaseIdentity();
  if (supa) return supa;

  return { ok: false, response: json(401, "Unauthorized") };
}

export async function requireAdmin(): Promise<GuardOk | GuardFail> {
  const id = await requireUser();
  if (!id.ok) return id;

  const adminRoles = new Set(["admin", "administrator", "superadmin"]);
  if (!adminRoles.has(id.role)) {
    return {
      ok: false,
      response: json(403, "Forbidden: admin/administrator/superadmin only"),
    };
  }

  return id;
}

export async function requireRole(
  roles: string[]
): Promise<GuardOk | GuardFail> {
  const id = await requireUser();
  if (!id.ok) return id;

  const allow = new Set(roles.map((r) => String(r).toLowerCase()));
  if (!allow.has(id.role)) {
    return { ok: false, response: json(403, "Forbidden") };
  }

  return id;
}

/**
 * Memastikan user memiliki akses ke unit spesifik berdasarkan slug.
 * Superadmin otomatis lolos.
 */
export async function requireUnitAccess(
  unitSlug: string
): Promise<GuardOk | GuardFail> {
  const id = await requireUser();
  if (!id.ok) return id;

  const want = String(unitSlug ?? "").trim().toLowerCase();
  if (!want) {
    return { ok: false, response: json(400, "Missing unit slug") };
  }

  // 1. Superadmin: akses semua unit
  if (id.role === "superadmin") return id;

  // 2. JWT app_users: jika token membawa ruangan_slug, wajib cocok dengan unit yang diminta
  if (!isLikelyUuid(id.userId)) {
    const sessionSlug =
      id.ruanganSlug != null && String(id.ruanganSlug).trim().length > 0
        ? String(id.ruanganSlug).trim().toLowerCase()
        : null;
    if (sessionSlug && sessionSlug !== want) {
      return {
        ok: false,
        response: json(
          403,
          "Forbidden: akun ini terdaftar untuk unit lain"
        ),
      };
    }

    const jwtUnitRoles = new Set([
      "dokter",
      "perawat",
      "it",
      "radiografer",
      "casemix",
      "admin",
      "administrator",
      "staff",
      "cathlab",
    ]);
    if (jwtUnitRoles.has(id.role)) {
      return id;
    }
    return {
      ok: false,
      response: json(403, "Forbidden: Akses per unit belum tersedia untuk jenis akun ini"),
    };
  }

  // 3. Admin berbasis JWT tanpa penjajaran unit: tetap akses penuh (legacy)
  const adminRoles = new Set(["administrator", "admin"]);
  if (adminRoles.has(id.role)) return id;

  // 4. Supabase Auth: cek user_unit_access
  const supabase = await createClient();
  const { data: access } = await supabase
    .from("user_unit_access")
    .select("ruangan!inner(slug)")
    .eq("user_id", id.userId)
    .eq("ruangan.slug", unitSlug)
    .maybeSingle();

  if (!access) {
    return { ok: false, response: json(403, `Forbidden: No access to unit ${unitSlug}`) };
  }

  return id;
}

export function requireEnvFlag(
  flagName: string,
  message = "Endpoint disabled"
): GuardFail | null {
  if (process.env[flagName] === "true") return null;
  return { ok: false, response: json(403, message) };
}
