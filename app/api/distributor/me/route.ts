import { NextResponse } from "next/server";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { createAdminClient } from "@/lib/supabase/admin";

/** Kolom yang boleh diubah tenant distributor/vendor (bukan is_active / id). */
function buildProfileUpdatePayload(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.nama_pt !== undefined) {
    const v = String(body.nama_pt ?? "").trim();
    if (!v) return { error: "Nama PT wajib diisi." as const };
    out.nama_pt = v;
  }

  const opt = (
    key: "nama_sales" | "kontak_wa" | "email" | "alamat" | "catatan"
  ) => {
    if (body[key] === undefined) return;
    const raw = body[key];
    if (raw === null || raw === "") {
      out[key] = null;
      return;
    }
    out[key] = String(raw).trim();
  };

  opt("nama_sales");
  opt("kontak_wa");
  opt("email");
  opt("alamat");
  opt("catatan");

  // Minimal satu field selain updated_at
  const keys = Object.keys(out).filter((k) => k !== "updated_at");
  if (keys.length === 0) {
    return { error: "Tidak ada perubahan untuk disimpan." as const };
  }

  const email = out.email;
  if (typeof email === "string" && email.length > 0) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "Format email tidak valid." as const };
    }
  }

  return { payload: out } as const;
}

export async function PATCH(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status }
    );
  }

  if (id.isAdminView) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Akun admin mengubah master distributor lewat menu Farmasi / Master Distributor.",
      },
      { status: 403 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 }
    );
  }

  const built = buildProfileUpdatePayload(body);
  if ("error" in built) {
    return NextResponse.json(
      { ok: false, message: built.error },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("master_distributor")
    .update(built.payload as never)
    .eq("id", id.distributorId!)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Distributor tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        username: id.username,
        role: id.role,
        distributor_id: id.distributorId,
      },
      distributor: data,
      ruangan: "Cathlab",
    },
    { status: 200 }
  );
}

export async function GET() {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status }
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  if (id.isAdminView) {
    return NextResponse.json(
      {
        ok: true,
        user: { username: id.username, role: id.role, distributor_id: null },
        distributor: null,
        ruangan: "Cathlab",
        mode: "admin_view",
      },
      { status: 200 }
    );
  }

  const { data, error } = await supabase
    .from("master_distributor")
    .select("*")
    .eq("id", id.distributorId!)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, message: "Distributor tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      user: {
        username: id.username,
        role: id.role,
        distributor_id: id.distributorId,
      },
      distributor: data,
      ruangan: "Cathlab",
    },
    { status: 200 }
  );
}

