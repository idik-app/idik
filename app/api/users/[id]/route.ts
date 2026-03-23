import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { logAudit } from "@/app/api/audit/log";
import { mapAppUserRow, ROLES_REQUIRE_DISTRIBUTOR } from "@/lib/api/app-user-distributor";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_users")
      .select(
        "id,username,role,distributor_id,created_at,updated_at,master_distributor(nama_pt)"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, data: mapAppUserRow(data as Record<string, unknown>) },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[GET /api/users/:id]", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { role, distributor_id, distributor_nama_pt, password } = body ?? {};
    const roleNormalized =
      typeof role === "string" ? role.trim().toLowerCase() : role;

    if (role !== undefined && !isRole(roleNormalized)) {
      return NextResponse.json({ ok: false, message: "role tidak valid" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: existing, error: existingErr } = await supabase
      .from("app_users")
      .select("id,role,distributor_id")
      .eq("id", id)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (!existing) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    const newRole = role !== undefined ? roleNormalized : existing.role;
    const needsDist = ROLES_REQUIRE_DISTRIBUTOR.has(newRole);

    const updatePayload: Record<string, unknown> = {};

    if (role !== undefined) updatePayload.role = roleNormalized;

    if (role !== undefined && !ROLES_REQUIRE_DISTRIBUTOR.has(roleNormalized)) {
      updatePayload.distributor_id = null;
    } else if (needsDist) {
      const namaPt =
        typeof distributor_nama_pt === "string" ? distributor_nama_pt.trim() : "";
      if (namaPt) {
        const { data: inserted, error: insErr } = await supabase
          .from("master_distributor")
          .insert({ nama_pt: namaPt, is_active: true })
          .select("id")
          .single();
        if (insErr) {
          return NextResponse.json(
            { ok: false, message: insErr.message || "Gagal membuat distributor" },
            { status: 400 }
          );
        }
        if (!inserted?.id) {
          return NextResponse.json(
            { ok: false, message: "Gagal membuat distributor" },
            { status: 400 }
          );
        }
        updatePayload.distributor_id = inserted.id;
      } else if (distributor_id !== undefined) {
        if (distributor_id === null || distributor_id === "") {
          return NextResponse.json(
            { ok: false, message: "distributor wajib untuk role ini" },
            { status: 400 }
          );
        }
        updatePayload.distributor_id = String(distributor_id).trim();
      }
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { ok: false, message: "password wajib (min 6 karakter)" },
          { status: 400 }
        );
      }
      updatePayload.password_hash = await bcrypt.hash(password, 10);
    }

    const mergedDistId =
      updatePayload.distributor_id !== undefined
        ? (updatePayload.distributor_id as string | null)
        : existing.distributor_id;
    if (needsDist && !mergedDistId) {
      return NextResponse.json(
        { ok: false, message: "distributor wajib untuk role ini" },
        { status: 400 }
      );
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ ok: false, message: "Nothing to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("app_users")
      .update(updatePayload)
      .eq("id", id)
      .select(
        "id,username,role,distributor_id,created_at,updated_at,master_distributor(nama_pt)"
      )
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    // Jangan blok response hanya karena audit log (buat UI lebih responsif)
    void logAudit(
      "USER_UPDATE",
      {
        target_user_id: data.id,
        target_username: data.username,
        role: data.role,
      },
      admin.userId
    );

    return NextResponse.json(
      { ok: true, data: mapAppUserRow(data as Record<string, unknown>) },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[PATCH /api/users/:id]", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, message: "Missing id" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Ambil username untuk audit sebelum delete
    const { data: existing, error: findError } = await supabase
      .from("app_users")
      .select("id,username")
      .eq("id", id)
      .maybeSingle();
    if (findError) throw findError;
    if (!existing) {
      return NextResponse.json({ ok: false, message: "User not found" }, { status: 404 });
    }

    const { error } = await supabase.from("app_users").delete().eq("id", id);
    if (error) throw error;

    // Jangan blok response hanya karena audit log (buat UI lebih responsif)
    void logAudit(
      "USER_DELETE",
      {
        target_user_id: existing.id,
        target_username: existing.username,
      },
      admin.userId
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("[DELETE /api/users/:id]", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

