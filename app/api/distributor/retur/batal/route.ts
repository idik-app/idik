import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { insertDistributorEvent } from "@/lib/distributorEventLog";
import {
  getReturSnapshotFromPayload,
  parseDistributorEventPayload,
} from "@/lib/distributorReturSnapshot";
import type { InventarisStokMutasiTipe } from "@/lib/inventarisMutasi";

type StokMutasiLine = { inventaris_id: string; qty_delta: number };

function isCancelledRetur(
  cancelledIds: Set<string>,
  eventId: string,
): boolean {
  return cancelledIds.has(eventId);
}

/** POST — batalkan retur katalog: pulihkan mapping + balikkan stok (jika ada di payload stok_mutasi). */
export async function POST(req: Request) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  let body: { event_ids?: string[] };
  try {
    body = (await req.json()) as { event_ids?: string[] };
  } catch {
    return NextResponse.json({ ok: false, message: "JSON tidak valid" }, { status: 400 });
  }

  const eventIds = Array.isArray(body.event_ids)
    ? body.event_ids.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (eventIds.length === 0) {
    return NextResponse.json(
      { ok: false, message: "event_ids wajib (array)" },
      { status: 400 },
    );
  }
  if (eventIds.length > 25) {
    return NextResponse.json(
      { ok: false, message: "Maksimal 25 event per permintaan" },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const scope = idAuth.isAdminView
    ? distributorIdParam || null
    : idAuth.distributorId ?? null;

  if (idAuth.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: set distributor_id (URL)" },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  const { data: batalRows } = await supabase
    .from("distributor_event_log")
    .select("id, payload")
    .eq("distributor_id", scope)
    .eq("event_type", "RETUR_DIBATALKAN");

  const cancelledIds = new Set<string>();
  for (const r of batalRows ?? []) {
    const p = r.payload as Record<string, unknown> | null;
    const oid = p?.original_event_id;
    if (typeof oid === "string" && oid) cancelledIds.add(oid);
  }

  const actor = idAuth.username;
  const restored: string[] = [];
  const errors: string[] = [];

  for (const eid of eventIds) {
    const { data: ev, error: evErr } = await supabase
      .from("distributor_event_log")
      .select("id, distributor_id, event_type, payload, nota_nomor, penerima_petugas")
      .eq("id", eid)
      .maybeSingle();

    if (evErr || !ev) {
      errors.push(`${eid}: tidak ditemukan`);
      continue;
    }
    if (String(ev.distributor_id) !== scope) {
      errors.push(`${eid}: bukan distributor ini`);
      continue;
    }
    if (ev.event_type !== "KATALOG_RETUR") {
      errors.push(`${eid}: bukan retur katalog`);
      continue;
    }
    if (isCancelledRetur(cancelledIds, eid)) {
      errors.push(`${eid}: sudah dibatalkan`);
      continue;
    }

    const payload = parseDistributorEventPayload(ev.payload);
    const notaAsal =
      (ev as { nota_nomor?: string | null }).nota_nomor ??
      (payload.nota_nomor as string | undefined) ??
      null;
    const snapshot = getReturSnapshotFromPayload(payload);

    let insertRow: Record<string, unknown>;
    let distId: string;
    let masterId: string;

    if (snapshot) {
      distId = String(snapshot.distributor_id ?? "").trim();
      masterId = String(snapshot.master_barang_id ?? "").trim();
      if (!distId || !masterId) {
        errors.push(`${eid}: snapshot tidak valid`);
        continue;
      }
      if (String(distId) !== String(scope)) {
        errors.push(`${eid}: distributor tidak konsisten`);
        continue;
      }
      insertRow = {
        ...snapshot,
        id: snapshot.id ?? undefined,
        updated_at: new Date().toISOString(),
      };
    } else {
      const raw = payload.master_barang_id;
      masterId =
        typeof raw === "string"
          ? raw.trim()
          : typeof raw === "number" && Number.isFinite(raw)
            ? String(raw)
            : "";
      if (!masterId) {
        errors.push(
          `${eid}: tidak ada snapshot atau master_barang_id — tidak bisa dipulihkan`,
        );
        continue;
      }
      distId = scope;
      const { data: mb } = await supabase
        .from("master_barang")
        .select("kode")
        .eq("id", masterId)
        .maybeSingle();
      const kodeHint =
        typeof payload.master_kode === "string" && payload.master_kode.trim()
          ? payload.master_kode.trim()
          : mb?.kode ?? null;
      insertRow = {
        distributor_id: distId,
        master_barang_id: masterId,
        kode_distributor: kodeHint,
        harga_jual: null,
        min_stok: 0,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
    }

    const { data: exists } = await supabase
      .from("distributor_barang")
      .select("id")
      .eq("distributor_id", distId)
      .eq("master_barang_id", masterId)
      .maybeSingle();

    if (exists?.id) {
      errors.push(`${eid}: mapping sudah ada`);
      continue;
    }

    const { data: ins, error: insErr } = await supabase
      .from("distributor_barang")
      .insert(insertRow as never)
      .select("id")
      .maybeSingle();

    if (insErr || !ins?.id) {
      errors.push(`${eid}: ${insErr?.message ?? "gagal insert"}`);
      continue;
    }

    const newMappingId = String(ins.id);
    const stokMutasi = (Array.isArray(payload.stok_mutasi)
      ? payload.stok_mutasi
      : []) as StokMutasiLine[];

    const stokReversals: { inventaris_id: string; mutasi_id: string | null }[] =
      [];

    for (const line of stokMutasi) {
      const invId = String(line.inventaris_id ?? "").trim();
      const qd = Number(line.qty_delta);
      if (!invId || !Number.isFinite(qd) || qd === 0) continue;

      const rev = -qd;
      const tipe: InventarisStokMutasiTipe =
        rev >= 0 ? "MASUK" : "KELUAR_RETUR";

      const { data: rpcId, error: rpcErr } = await supabase.rpc(
        "apply_inventaris_stok_mutasi",
        {
          p_inventaris_id: invId,
          p_tipe: tipe,
          p_qty_delta: rev,
          p_ref_type: "batal_retur",
          p_ref_id: eid,
          p_keterangan: `Batal retur ${String(notaAsal ?? eid)}`,
          p_actor: actor,
        },
      );

      if (rpcErr) {
        errors.push(`${eid} stok ${invId}: ${rpcErr.message}`);
        continue;
      }
      stokReversals.push({
        inventaris_id: invId,
        mutasi_id: rpcId != null ? String(rpcId) : null,
      });
    }

    void insertDistributorEvent(supabase, {
      distributorId: scope,
      eventType: "RETUR_DIBATALKAN",
      actor,
      payload: {
        original_event_id: eid,
        restored_distributor_barang_id: newMappingId,
        stok_reversals: stokReversals,
        nota_asal: notaAsal,
      },
    });

    cancelledIds.add(eid);
    restored.push(eid);
  }

  return NextResponse.json(
    {
      ok: errors.length === 0 || restored.length > 0,
      restored_count: restored.length,
      restored_ids: restored,
      errors: errors.length ? errors : undefined,
    },
    { status: 200 },
  );
}
