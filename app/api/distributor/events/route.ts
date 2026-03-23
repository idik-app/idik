import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { parseDistributorEventPayload } from "@/lib/distributorReturSnapshot";

type RpcRow = {
  id: string;
  created_at: string;
  distributor_id: string;
  event_type: string;
  payload: Record<string, unknown> | null;
  actor: string | null;
  nota_nomor: string | null;
  penerima_petugas: string | null;
  nota_pengiriman: string | null;
  retur_fisik_status: string | null;
  total_count: string | number | null;
};

/** Baris dari `distributor_event_log` (select / RPC tanpa total_count). */
type DbEventLogRow = {
  id: string;
  created_at: string;
  distributor_id: string;
  event_type: string;
  payload: unknown;
  actor: string | null;
  nota_nomor: string | null;
  penerima_petugas: string | null;
  nota_pengiriman?: string | null;
  retur_fisik_status?: string | null;
};

/** Urutan kolom: skema baru → lama (jika migrasi belum di-push ke Supabase). */
const EVENT_LOG_SELECT_TIERS = [
  "id, created_at, distributor_id, event_type, payload, actor, nota_nomor, penerima_petugas, nota_pengiriman, retur_fisik_status",
  "id, created_at, distributor_id, event_type, payload, actor, nota_nomor, penerima_petugas",
  "id, created_at, distributor_id, event_type, payload, actor",
] as const;

function rpcMissingFromSchema(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("could not find the function") ||
    m.includes("schema cache") ||
    m.includes("pgrst202")
  );
}

/** GET: jejak peristiwa distributor — filter, pencarian, pagination (RPC). */
export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
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

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(5, Number(searchParams.get("page_size") ?? "20") || 20));
  const offset = (page - 1) * pageSize;

  const q = (searchParams.get("q") ?? "").trim();
  const eventType = (searchParams.get("event_type") ?? "").trim();
  const returFisikStatus = (searchParams.get("retur_fisik_status") ?? "").trim();
  const fromStr = (searchParams.get("from") ?? "").trim();
  const toStr = (searchParams.get("to") ?? "").trim();
  const p_from = fromStr ? `${fromStr}T00:00:00.000Z` : null;
  const p_to = toStr ? `${toStr}T23:59:59.999Z` : null;

  const legacyLimit = Math.min(
    200,
    Math.max(1, Number(searchParams.get("limit") ?? "0") || 0),
  );
  const useLegacy = legacyLimit > 0 && !searchParams.has("page");

  const scope = id.isAdminView
    ? distributorIdParam || null
    : id.distributorId ?? null;

  if (id.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: isi distributor_id untuk melihat peristiwa." },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  if (useLegacy) {
    const { data, error } = await selectDistributorEventLog(
      supabase,
      scope,
      legacyLimit,
      0,
      EVENT_LOG_SELECT_TIERS,
    );

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const rows = ((data ?? []) as DbEventLogRow[]).map(enrichEventRow);
    const master_labels = await buildMasterLabels(supabase, rows);
    return NextResponse.json(
      {
        ok: true,
        data: rows,
        master_labels,
        total: rows.length,
        page: 1,
        page_size: legacyLimit,
      },
      { status: 200 },
    );
  }

  const rpcArgs8 = {
    p_distributor_id: scope,
    p_q: q || null,
    p_event_type: eventType || null,
    p_from,
    p_to,
    p_retur_fisik_status: returFisikStatus || null,
    p_limit: pageSize,
    p_offset: offset,
  };

  let { data: rpcData, error: rpcErr } = await supabase.rpc(
    "distributor_events_list",
    rpcArgs8,
  );

  if (rpcErr && rpcMissingFromSchema(rpcErr) && !returFisikStatus) {
    const { p_retur_fisik_status: _drop, ...rpc7 } = rpcArgs8;
    const retry = await supabase.rpc("distributor_events_list", rpc7);
    rpcData = retry.data;
    rpcErr = retry.error;
  }

  if (rpcErr) {
    const fb = await eventLogTableFallback(supabase, scope, {
      pageSize,
      offset,
      q,
      eventType,
      returFisikStatus,
      p_from,
      p_to,
    });

    if (fb.error) {
      return NextResponse.json(
        { ok: false, message: rpcErr.message || fb.error.message },
        { status: 500 },
      );
    }

    const rows = ((fb.data ?? []) as DbEventLogRow[]).map(enrichEventRow);
    const master_labels = await buildMasterLabels(supabase, rows);

    return NextResponse.json(
      {
        ok: true,
        data: rows,
        master_labels,
        total: fb.total,
        page,
        page_size: pageSize,
        note: fb.note,
      },
      { status: 200 },
    );
  }

  const raw = (rpcData ?? []) as RpcRow[];
  const total =
    raw.length > 0
      ? Number(raw[0].total_count ?? 0)
      : 0;
  const rows = raw.map((r) =>
    enrichEventRow({
      id: r.id,
      created_at: r.created_at,
      distributor_id: r.distributor_id,
      event_type: r.event_type,
      payload: r.payload,
      actor: r.actor,
      nota_nomor: r.nota_nomor,
      penerima_petugas: r.penerima_petugas,
      nota_pengiriman: r.nota_pengiriman,
      retur_fisik_status: r.retur_fisik_status,
    }),
  );

  const master_labels = await buildMasterLabels(supabase, rows);

  return NextResponse.json(
    {
      ok: true,
      data: rows,
      master_labels,
      total,
      page,
      page_size: pageSize,
    },
    { status: 200 },
  );
}

async function selectDistributorEventLog(
  supabase: ReturnType<typeof createAdminClient>,
  distributorId: string,
  limit: number,
  offset: number,
  tiers: readonly string[],
): Promise<{ data: unknown[] | null; error: { message: string } | null }> {
  let lastErr: { message: string } | null = null;
  for (const tier of tiers) {
    const { data, error } = await supabase
      .from("distributor_event_log")
      .select(tier)
      .eq("distributor_id", distributorId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (!error) return { data: data ?? [], error: null };
    lastErr = error;
  }
  return { data: null, error: lastErr ?? { message: "Gagal memuat distributor_event_log" } };
}

type EventLogFallbackOpts = {
  pageSize: number;
  offset: number;
  q: string;
  eventType: string;
  returFisikStatus: string;
  p_from: string | null;
  p_to: string | null;
};

/** Tanpa RPC: filter mendekati logika `distributor_events_list` (tier kolom jika migrasi belum lengkap). */
async function eventLogTableFallback(
  supabase: ReturnType<typeof createAdminClient>,
  scope: string,
  opts: EventLogFallbackOpts,
): Promise<{
  data: unknown[] | null;
  error: { message: string } | null;
  total: number;
  note: string;
}> {
  const noteBase = "fallback_tanpa_rpc";

  const ilikePattern = (s: string) =>
    `%${s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  let lastErr: { message: string } | null = null;

  for (const tier of EVENT_LOG_SELECT_TIERS) {
    const hasReturCol = tier.includes("retur_fisik_status");
    const hasNotaPeng = tier.includes("nota_pengiriman");

    if (opts.returFisikStatus && !hasReturCol) {
      lastErr = { message: "tier tanpa kolom retur_fisik_status" };
      continue;
    }

    let query = supabase
      .from("distributor_event_log")
      .select(tier, { count: "exact" })
      .eq("distributor_id", scope);

    if (opts.eventType) {
      query = query.eq("event_type", opts.eventType);
    }

    if (opts.p_from) query = query.gte("created_at", opts.p_from);
    if (opts.p_to) query = query.lte("created_at", opts.p_to);

    if (opts.returFisikStatus && hasReturCol) {
      const rs = opts.returFisikStatus.trim();
      if (opts.eventType && opts.eventType !== "KATALOG_RETUR") {
        return { data: [], error: null, total: 0, note: noteBase };
      }
      query = query.eq("event_type", "KATALOG_RETUR");
      if (rs === "MENUNGGU_AMBIL") {
        query = query.or(
          "retur_fisik_status.eq.MENUNGGU_AMBIL,retur_fisik_status.is.null",
        );
      } else {
        query = query.eq("retur_fisik_status", rs);
      }
    }

    if (opts.q) {
      const p = ilikePattern(opts.q);
      const parts = [
        `nota_nomor.ilike.${p}`,
        `actor.ilike.${p}`,
        `penerima_petugas.ilike.${p}`,
      ];
      if (hasNotaPeng) parts.push(`nota_pengiriman.ilike.${p}`);
      if (hasReturCol) parts.push(`retur_fisik_status.ilike.${p}`);
      query = query.or(parts.join(","));
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(opts.offset, opts.offset + opts.pageSize - 1);

    if (!error) {
      return {
        data: data ?? [],
        error: null,
        total: count ?? (data?.length ?? 0),
        note: noteBase,
      };
    }
    lastErr = error;
  }

  return {
    data: null,
    error: lastErr ?? { message: "Gagal query distributor_event_log" },
    total: 0,
    note: noteBase,
  };
}

function pickPayloadString(
  p: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const k of keys) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Payload ter-parse + isi kolom nota/petugas dari payload jika DB kosong. */
function enrichEventRow(row: DbEventLogRow) {
  const p = parseDistributorEventPayload(row.payload);
  const notaCol = row.nota_nomor?.trim();
  const petugasCol = row.penerima_petugas?.trim();
  const notaPengCol = row.nota_pengiriman?.trim();
  const returFisikCol = row.retur_fisik_status?.trim();
  return {
    id: row.id,
    created_at: row.created_at,
    distributor_id: row.distributor_id,
    event_type: row.event_type,
    payload: p,
    actor: row.actor,
    nota_nomor:
      notaCol ||
      pickPayloadString(p, ["nota_nomor", "notaNomor"]) ||
      null,
    penerima_petugas:
      petugasCol ||
      pickPayloadString(p, ["penerima_petugas", "penerimaPetugas"]) ||
      null,
    nota_pengiriman:
      notaPengCol ||
      pickPayloadString(p, ["nota_pengiriman", "notaPengiriman"]) ||
      null,
    retur_fisik_status:
      returFisikCol ||
      pickPayloadString(p, ["retur_fisik_status", "returFisikStatus"]) ||
      null,
  };
}

async function buildMasterLabels(
  supabase: ReturnType<typeof createAdminClient>,
  rows: { payload: unknown }[],
) {
  const masterIds = new Set<string>();
  for (const row of rows) {
    const p = parseDistributorEventPayload(row.payload);
    const m = p.master_barang_id;
    if (typeof m === "string" && m.length > 0) masterIds.add(m);
  }

  let master_labels: Record<string, { kode: string; nama: string }> = {};
  if (masterIds.size > 0) {
    const { data: masters, error: mErr } = await supabase
      .from("master_barang")
      .select("id, kode, nama")
      .in("id", Array.from(masterIds));
    if (!mErr && masters?.length) {
      master_labels = Object.fromEntries(
        masters.map((x) => [
          String(x.id),
          { kode: String(x.kode ?? ""), nama: String(x.nama ?? "") },
        ]),
      );
    }
  }
  return master_labels;
}
