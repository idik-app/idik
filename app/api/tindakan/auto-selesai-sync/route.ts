import { NextResponse } from "next/server";

import { isReadyForAutoStatusSelesai } from "@/lib/tindakan/autoStatusSelesai";

export const dynamic = "force-dynamic";

const CHUNK = 500;

/** Promosikan semua baris tindakan yang dokter+tindakan+ruangan lengkap → status Selesai. */
export async function POST() {
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

  const idsToUpdate: string[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from("tindakan")
      .select("id, dokter, operator, tindakan, ruangan, status")
      .order("id", { ascending: true })
      .range(from, from + CHUNK - 1);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const batch = Array.isArray(data) ? data : [];
    for (const row of batch) {
      const rec = row as Record<string, unknown>;
      if (!isReadyForAutoStatusSelesai(rec)) continue;
      const id = String(rec.id ?? "").trim();
      if (id) idsToUpdate.push(id);
    }

    if (batch.length < CHUNK) break;
    from += CHUNK;
  }

  let updated = 0;
  for (const id of idsToUpdate) {
    const { error } = await supabase
      .from("tindakan")
      .update({ status: "Selesai", status_keterangan: null })
      .eq("id", id);
    if (!error) updated += 1;
  }

  return NextResponse.json(
    { ok: true, scanned: idsToUpdate.length, updated },
    { status: 200 },
  );
}
