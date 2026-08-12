import { NextResponse } from "next/server";

import { isReadyForAutoStatusSelesai } from "@/lib/tindakan/autoStatusSelesai";

export const dynamic = "force-dynamic";

const MAX_IDS = 200;
const UPDATE_CHUNK = 50;

function parseIds(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const raw = (body as { ids?: unknown }).ids;
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_IDS) break;
  }
  return out;
}

/** Promote kandidat baris (dokter+tindakan+ruangan lengkap) → status Selesai. */
export async function POST(req: Request) {
  const { requireRole } = await import("@/lib/auth/guards");
  const auth = await requireRole([
    "perawat",
    "dokter",
    "admin",
    "administrator",
    "superadmin",
    "casemix",
  ]);
  if (!auth.ok) return auth.response;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const ids = parseIds(body);
  if (ids.length === 0) {
    return NextResponse.json(
      { ok: true, scanned: 0, updated: 0 },
      { status: 200 },
    );
  }

  const { createAdminClient } = await import("@/lib/supabase/admin");
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
    .select("id, dokter, operator, tindakan, ruangan, status")
    .in("id", ids);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const idsToUpdate: string[] = [];
  for (const row of Array.isArray(data) ? data : []) {
    const rec = row as Record<string, unknown>;
    if (!isReadyForAutoStatusSelesai(rec)) continue;
    const id = String(rec.id ?? "").trim();
    if (id) idsToUpdate.push(id);
  }

  let updated = 0;
  for (let i = 0; i < idsToUpdate.length; i += UPDATE_CHUNK) {
    const chunk = idsToUpdate.slice(i, i + UPDATE_CHUNK);
    const { error: updErr, count } = await supabase
      .from("tindakan")
      .update(
        { status: "Selesai", status_keterangan: null },
        { count: "exact" },
      )
      .in("id", chunk);
    if (!updErr) updated += count ?? chunk.length;
  }

  return NextResponse.json(
    { ok: true, scanned: idsToUpdate.length, updated },
    { status: 200 },
  );
}
