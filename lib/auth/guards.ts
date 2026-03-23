import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server-";

type GuardOk = { ok: true; userId: string; role: string };
type GuardFail = { ok: false; response: NextResponse };

function json(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
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
    const decoded = jwt.verify(token, secret) as any;
    const role = String(decoded?.role ?? "user").trim().toLowerCase();
    const userId = String(decoded?.username ?? decoded?.sub ?? "unknown");
    return { ok: true, userId, role };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<GuardOk | GuardFail> {
  const supa = await getSupabaseIdentity();
  if (supa) return supa;

  const jwtId = await getJwtIdentity();
  if (jwtId) return jwtId;

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

export function requireEnvFlag(
  flagName: string,
  message = "Endpoint disabled"
): GuardFail | null {
  if (process.env[flagName] === "true") return null;
  return { ok: false, response: json(403, message) };
}
