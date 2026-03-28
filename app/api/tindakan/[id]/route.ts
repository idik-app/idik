import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/guards";
import {
  finalizeTindakanPatchForSupabase,
  mapTindakanRowToApiDetail,
} from "@/lib/tindakan/tindakanDbMap";
import {
  enrichTindakanRowTarifFromMasterMap,
  fetchMasterTarifLookupMap,
  lookupMasterTarifRupiah,
} from "@/lib/tindakan/masterTarifTindakan";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Kolom skalar yang boleh di-patch dari UI daftar kasus (bukan FK mentah). */
const PATCHABLE_TINDAKAN_KEYS = new Set([
  "ruangan",
  "tindakan",
  "dokter",
  "tanggal",
  "waktu",
  "fluoro_time",
  "dose",
  "kv",
  "ma",
  "nama_pasien",
  "nama",
  "no_rm",
  "rm",
  "status",
  "kategori",
  "diagnosa",
  "severity_level",
  "hasil_lab_ppm",
  "pasien_id",
  "cath",
  "asisten",
  "sirkuler",
  "logger",
  "total",
  "krs",
  "consumable",
  "pemakaian",
]);

function sanitizeTindakanPatch(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (!PATCHABLE_TINDAKAN_KEYS.has(k)) continue;
    if (v === undefined) continue;
    out[k] = v === "" ? null : v;
  }
  return out;
}

/**
 * Satu baris `tindakan` — untuk deep link Pemakaian (`?tindakanId=`).
 */
export async function GET(_req: Request, ctx: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("tindakan")
    .select("*")
    .eq("id", tindakanId)
    .maybeSingle();

  if (error) {
    console.error("[api/tindakan/[id]]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Kasus tindakan tidak ditemukan." },
      { status: 404 },
    );
  }

  const tarifMap = await fetchMasterTarifLookupMap(supabase);
  const row = enrichTindakanRowTarifFromMasterMap(
    data as Record<string, unknown>,
    tarifMap,
  );

  return NextResponse.json({
    ok: true,
    data: mapTindakanRowToApiDetail(row),
  });
}

/**
 * Patch sebagian baris `tindakan` — service role (tahan RLS), dipakai UI inline edit.
 */
export async function PATCH(req: Request, ctx: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }

  const sanitized = sanitizeTindakanPatch(body);
  const patch = finalizeTindakanPatchForSupabase(sanitized);

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const tarifMap = await fetchMasterTarifLookupMap(supabase);
  if (Object.prototype.hasOwnProperty.call(patch, "tindakan")) {
    const hit = lookupMasterTarifRupiah(tarifMap, patch.tindakan);
    if (hit != null) patch.tarif_tindakan = hit;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, message: "Tidak ada field yang diizinkan untuk diubah." },
      { status: 400 },
    );
  }

  const { data: updated, error } = await supabase
    .from("tindakan")
    .update(patch)
    .eq("id", tindakanId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[PATCH api/tindakan/[id]]", error);
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "Kasus tindakan tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, data: updated }, { status: 200 });
}

function isMissingRelationOrTableError(err: { message?: string } | null): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("schema cache") ||
    msg.includes("pgrst204")
  );
}

/**
 * Hapus satu baris kasus — service role (sama seperti PATCH), supaya konsisten dengan GET daftar
 * dan tidak bergantung pada RLS klien anon.
 */
export async function DELETE(_req: Request, ctx: Params) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi" },
      { status: 503 },
    );
  }

  const primary = await supabase
    .from("tindakan")
    .delete()
    .eq("id", tindakanId)
    .select("id");
  if (primary.error && !isMissingRelationOrTableError(primary.error)) {
    console.error("[DELETE api/tindakan/[id]] tindakan", primary.error);
    return NextResponse.json(
      { ok: false, message: primary.error.message },
      { status: 500 },
    );
  }
  const nPrimary = Array.isArray(primary.data) ? primary.data.length : 0;
  if (nPrimary > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const legacy = await supabase
    .from("tindakan_medik")
    .delete()
    .eq("id", tindakanId)
    .select("id");
  if (legacy.error && !isMissingRelationOrTableError(legacy.error)) {
    console.error("[DELETE api/tindakan/[id]] tindakan_medik", legacy.error);
    return NextResponse.json(
      { ok: false, message: legacy.error.message },
      { status: 500 },
    );
  }
  const nLegacy = Array.isArray(legacy.data) ? legacy.data.length : 0;
  if (nLegacy > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json(
    { ok: false, message: "Kasus tindakan tidak ditemukan." },
    { status: 404 },
  );
}
