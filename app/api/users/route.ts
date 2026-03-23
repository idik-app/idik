// app/api/users/route.ts (DI SERVER) - CRUD untuk public.app_users
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/app/api/audit/log";
import {
  mapAppUserRow,
  resolveDistributorIdForCreate,
} from "@/lib/api/app-user-distributor";

const ROLE_OPTIONS = [
  "pasien",
  "dokter",
  "perawat",
  "it",
  "radiografer",
  "casemix",
  "admin",
  "administrator",
  "superadmin",
  "distributor",
  "depo_farmasi",
] as const;

function isRole(x: unknown): x is (typeof ROLE_OPTIONS)[number] {
  return typeof x === "string" && (ROLE_OPTIONS as readonly string[]).includes(x);
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("app_users")
      .select(
        "id,username,role,distributor_id,created_at,updated_at,master_distributor(nama_pt)"
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (data ?? []).map((r) => mapAppUserRow(r as Record<string, unknown>));
    return NextResponse.json({ ok: true, data: rows }, { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/users]", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const body = await req.json();
    const {
      username,
      password,
      role,
      distributor_id = null,
      distributor_nama_pt,
    } = body ?? {};
    const roleNormalized =
      typeof role === "string" ? role.trim().toLowerCase() : role;

    if (typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json(
        { ok: false, message: "username wajib (min 3 karakter)" },
        { status: 400 }
      );
    }
    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { ok: false, message: "password wajib (min 6 karakter)" },
        { status: 400 }
      );
    }
    if (!isRole(roleNormalized)) {
      return NextResponse.json(
        { ok: false, message: "role tidak valid" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const supabase = createAdminClient();
    const resolved = await resolveDistributorIdForCreate(
      supabase,
      roleNormalized,
      distributor_id,
      distributor_nama_pt
    );
    if (!resolved.ok) {
      return NextResponse.json(
        { ok: false, message: resolved.message },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("app_users")
      .insert({
        username: username.trim(),
        password_hash: passwordHash,
        role: roleNormalized,
        distributor_id: resolved.distributorId,
      })
      .select(
        "id,username,role,distributor_id,created_at,updated_at,master_distributor(nama_pt)"
      )
      .single();

    if (error) {
      console.error("[POST /api/users] insert error", error);
      return NextResponse.json(
        { ok: false, message: error.message || "Failed to create user" },
        { status: 400 }
      );
    }

    // Jangan blok response hanya karena audit log (buat UI lebih responsif)
    void logAudit(
      "USER_CREATE",
      {
        target_user_id: data.id,
        target_username: data.username,
        role: data.role,
      },
      admin.userId
    );

    return NextResponse.json(
      { ok: true, data: mapAppUserRow(data as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/users]", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
