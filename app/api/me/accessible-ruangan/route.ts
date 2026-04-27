import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { isLikelyUuid } from "@/lib/auth/resolveAppUser";

export const dynamic = "force-dynamic";

type RuanganRow = { id: string; slug: string; nama: string | null };

function jsonOk(data: RuanganRow[]) {
  return NextResponse.json({ ok: true, data });
}

/**
 * Daftar ruangan yang boleh diakses pengguna login:
 * - superadmin / admin JWT: semua ruangan aktif
 * - JWT app_users dengan ruangan_slug: satu unit (sesuai register app_users.ruangan_id)
 * - JWT peran unit (dokter, perawat, …) tanpa slug: semua unit (sama logika requireUnitAccess)
 * - Supabase Auth (UUID): user_unit_access → ruangan
 */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message: "Server tidak dikonfigurasi (service role).",
      },
      { status: 503 },
    );
  }

  const role = user.role;

  const listActiveRuangan = async (): Promise<RuanganRow[]> => {
    const { data, error } = await supabase
      .from("ruangan")
      .select("id, slug, nama, aktif")
      .order("nama", { ascending: true });
    if (error) {
      console.error("[accessible-ruangan]", error.message);
      return [];
    }
    return (data ?? [])
      .filter((r) => r.slug && (r.aktif === null || r.aktif === true))
      .map((r) => ({
        id: String(r.id),
        slug: String(r.slug),
        nama: r.nama != null ? String(r.nama) : null,
      }));
  };

  if (role === "superadmin") {
    return jsonOk(await listActiveRuangan());
  }

  if (!isLikelyUuid(user.userId)) {
    const adminRoles = new Set(["administrator", "admin"]);
    if (adminRoles.has(role)) {
      return jsonOk(await listActiveRuangan());
    }

    const slug =
      user.ruanganSlug != null && String(user.ruanganSlug).trim().length > 0
        ? String(user.ruanganSlug).trim().toLowerCase()
        : null;

    if (slug) {
      const { data, error } = await supabase
        .from("ruangan")
        .select("id, slug, nama, aktif")
        .eq("slug", slug)
        .maybeSingle();
      if (error || !data?.slug) {
        return jsonOk([]);
      }
      if (data.aktif === false) return jsonOk([]);
      return jsonOk([
        {
          id: String(data.id),
          slug: String(data.slug),
          nama: data.nama != null ? String(data.nama) : null,
        },
      ]);
    }

    const jwtUnitRoles = new Set([
      "dokter",
      "perawat",
      "it",
      "radiografer",
      "casemix",
      "staff",
    ]);
    if (jwtUnitRoles.has(role)) {
      return jsonOk(await listActiveRuangan());
    }

    return jsonOk([]);
  }

  const { data: accessRows, error: accessErr } = await supabase
    .from("user_unit_access")
    .select("ruangan (id, slug, nama, aktif)")
    .eq("user_id", user.userId);

  if (accessErr) {
    console.error("[accessible-ruangan] user_unit_access", accessErr.message);
    return NextResponse.json(
      { ok: false, error: accessErr.message },
      { status: 500 },
    );
  }

  const list: RuanganRow[] = [];
  const seen = new Set<string>();
  for (const row of accessRows ?? []) {
    const raw = (row as { ruangan?: unknown }).ruangan;
    const ru = Array.isArray(raw) ? raw[0] : raw;
    if (!ru || typeof ru !== "object") continue;
    const o = ru as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : "";
    const slug = o.slug != null ? String(o.slug).trim() : "";
    if (!id || !slug) continue;
    if (o.aktif === false) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    list.push({
      id,
      slug,
      nama: o.nama != null ? String(o.nama) : null,
    });
  }

  list.sort((a, b) =>
    (a.nama || a.slug).localeCompare(b.nama || b.slug, "id", {
      sensitivity: "base",
    }),
  );

  return jsonOk(list);
}
