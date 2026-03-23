import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export type DistributorIdentity =
  | {
      ok: true;
      username: string;
      role: string;
      distributorId?: string;
      isAdminView: boolean;
    }
  | { ok: false; reason: "missing" | "invalid" | "forbidden" };

export async function getDistributorIdentity(): Promise<DistributorIdentity> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return { ok: false, reason: "missing" };

  const secret = process.env.JWT_SECRET || "dev-secret";
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const decoded = jwt.verify(token, secret) as any;
    const role = String(decoded?.role ?? "user").trim().toLowerCase();
    const username = String(decoded?.username ?? "unknown").trim();
    const adminRoles = new Set(["admin", "administrator", "superadmin"]);
    if (adminRoles.has(role)) {
      return { ok: true, username, role, isAdminView: true };
    }
    // Legacy DB role "vendor" — sama haknya dengan distributor (middleware + login).
    if (role !== "distributor" && role !== "vendor") {
      return { ok: false, reason: "forbidden" };
    }

    const distributorId = String(decoded?.distributor_id ?? "");
    if (!distributorId) return { ok: false, reason: "invalid" };

    return { ok: true, username, role, distributorId, isAdminView: false };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

