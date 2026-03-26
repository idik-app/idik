import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

function parseDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Normalisasi untuk cocokkan nama PT / barang; rapikan spasi & homoglyph (mis. А Kiril vs A Latin). */
function normKey(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\u0410/g, "A")
    .replace(/\u0430/g, "a")
    .replace(/\u0415/g, "E")
    .replace(/\u0435/g, "e")
    .replace(/\u041e/g, "O")
    .replace(/\u043e/g, "o")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Tanggal dari kolom teks order `tanggal` (mis. "2026-03-26 09:30"). */
function orderTanggalDateKey(tanggal: string): string | null {
  const t = tanggal.trim();
  if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return null;
}

function orderLineQtyUsed(line: Record<string, unknown>): number {
  const q = line.qtyDipakai ?? line.qty_dipakai;
  if (typeof q === "number" && Number.isFinite(q)) return Math.max(0, q);
  const n = Number(q);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function orderLineQtyRencana(line: Record<string, unknown>): number {
  const q = line.qtyRencana ?? line.qty_rencana;
  if (typeof q === "number" && Number.isFinite(q)) return Math.max(0, q);
  const n = Number(q);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * Depo sering set status SELESAI tanpa mengisi ulang qtyDipakai di JSON;
 * untuk laporan distributor gunakan qty rencana sebagai kuantitas pemakaian.
 */
function lineQtyForPemakaianReport(line: Record<string, unknown>, orderStatus: string): number {
  const u = orderLineQtyUsed(line);
  if (u > 0) return u;
  const st = String(orderStatus ?? "").trim().toUpperCase();
  if (st === "SELESAI" || st === "TERVERIFIKASI") {
    const p = orderLineQtyRencana(line);
    if (p > 0) return p;
  }
  return 0;
}

function parseOrderItemsJson(itemsRaw: unknown): Record<string, unknown>[] {
  if (Array.isArray(itemsRaw)) return itemsRaw as Record<string, unknown>[];
  if (typeof itemsRaw === "string") {
    try {
      const p = JSON.parse(itemsRaw) as unknown;
      return Array.isArray(p) ? (p as Record<string, unknown>[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function strFromLine(line: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = line[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuidParam(s: string): boolean {
  return UUID_RE.test(s.trim());
}

function barangMatchesTenantSet(barangKey: string, tenantBarangNames: Set<string>): boolean {
  if (!barangKey) return false;
  if (tenantBarangNames.has(barangKey)) return true;
  for (const tn of tenantBarangNames) {
    if (tn.length < 4 || barangKey.length < 4) continue;
    if (tn.includes(barangKey) || barangKey.includes(tn)) return true;
  }
  return false;
}

function masterBarangDistId(inv: {
  master_barang?: { distributor_id?: string | null } | { distributor_id?: string | null }[] | null;
}): string {
  const mb = inv?.master_barang;
  const row = Array.isArray(mb) ? mb[0] : mb;
  const d = row?.distributor_id;
  if (d == null || d === "") return "";
  return String(d);
}

/**
 * DB lama dengan kolom pemakaian tidak lengkap (inventaris_id, jumlah, dll.) —
 * pakai buku besar mutasi (KELUAR_PEMAKAIAN) sebagai sumber baris.
 */
function isPemakaianTableSchemaMismatch(err: { message?: string } | null): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return m.includes("pemakaian.") && m.includes("does not exist");
}

type PemakaianRowBase = {
  id: string;
  created_at: string | null;
  inventaris_id: string | null;
  jumlah: number;
  tanggal: string | null;
  keterangan: string | null;
  tindakan_id: string | null;
};

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  if (id.isAdminView && distributorIdParam && !isValidUuidParam(distributorIdParam)) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Parameter distributor_id harus UUID valid dari tabel master_distributor (bukan placeholder). Admin: buka GET /api/distributor/distributors, salin nilai id PT yang ingin dilihat, lalu ?distributor_id=<id tersebut>.",
      },
      { status: 400 },
    );
  }

  const scope = id.isAdminView ? (distributorIdParam || null) : (id.distributorId ?? null);
  const adminShowAll = Boolean(id.isAdminView && !scope);

  if (!id.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Akun distributor tidak terikat ke master PT." },
      { status: 403 },
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

  /** Master barang yang ada di katalog distributor (fallback jika inventaris.distributor_id kosong). */
  let catalogMasterIds = new Set<string>();
  if (!adminShowAll && scope) {
    const { data: dbRows, error: dbErr } = await supabase
      .from("distributor_barang")
      .select("master_barang_id")
      .eq("distributor_id", scope);
    if (dbErr) {
      return NextResponse.json({ ok: false, message: dbErr.message }, { status: 500 });
    }
    for (const r of dbRows ?? []) {
      const mb = String((r as { master_barang_id?: unknown }).master_barang_id ?? "").trim();
      if (mb) catalogMasterIds.add(mb);
    }
  }

  // Hindari embed `pemakaian -> inventaris` (PostgREST membutuhkan FK di schema cache).
  // Jika kolom pemakaian.inventaris_id belum ada di DB, baca dari inventaris_stok_mutasi (KELUAR_PEMAKAIAN).
  let pemRows: PemakaianRowBase[] = [];

  let pemQ = supabase
    .from("pemakaian")
    .select("id, created_at, inventaris_id, jumlah, tanggal, keterangan, tindakan_id")
    .order("tanggal", { ascending: false });

  if (from) pemQ = pemQ.gte("tanggal", from);
  if (to) pemQ = pemQ.lte("tanggal", to);

  const { data: pemFromTable, error: pemErr } = await pemQ;

  if (pemErr && isPemakaianTableSchemaMismatch(pemErr)) {
    let mutQ = supabase
      .from("inventaris_stok_mutasi")
      .select("id, created_at, inventaris_id, qty_delta, ref_id, keterangan, ref_type")
      .eq("tipe", "KELUAR_PEMAKAIAN")
      .eq("ref_type", "pemakaian")
      .order("created_at", { ascending: false });

    if (from) mutQ = mutQ.gte("created_at", `${from}T00:00:00.000Z`);
    if (to) mutQ = mutQ.lte("created_at", `${to}T23:59:59.999Z`);

    const { data: mutRows, error: mutErr } = await mutQ;
    if (mutErr) {
      return NextResponse.json({ ok: false, message: mutErr.message }, { status: 500 });
    }

    pemRows = (mutRows ?? []).map((r) => {
      const created = String((r as { created_at?: unknown }).created_at ?? "");
      const refId = (r as { ref_id?: unknown }).ref_id;
      const mutId = String((r as { id?: unknown }).id ?? "");
      const id = refId != null && refId !== "" ? String(refId) : mutId;
      const qty = Number((r as { qty_delta?: unknown }).qty_delta);
      const jumlah = Number.isFinite(qty) ? Math.abs(qty) : 0;
      const invId = String((r as { inventaris_id?: unknown }).inventaris_id ?? "").trim();
      const tanggalSlice = created.length >= 10 ? created.slice(0, 10) : null;
      return {
        id,
        created_at: created || null,
        inventaris_id: invId || null,
        jumlah,
        tanggal: tanggalSlice,
        keterangan: ((r as { keterangan?: unknown }).keterangan ?? null) as string | null,
        tindakan_id: null,
      };
    });
  } else if (pemErr) {
    return NextResponse.json({ ok: false, message: pemErr.message }, { status: 500 });
  } else {
    pemRows = (pemFromTable ?? []) as PemakaianRowBase[];
  }

  const invIdList = [
    ...new Set(
      pemRows.map((r) => String(r.inventaris_id ?? "").trim()).filter(Boolean),
    ),
  ];

  type InvRow = {
    id: string;
    nama?: string;
    satuan?: string | null;
    lokasi?: string | null;
    distributor_id?: string | null;
    master_barang_id?: string | null;
    master_barang?: { distributor_id?: string | null } | { distributor_id?: string | null }[] | null;
  };

  const invById = new Map<string, InvRow>();
  const chunkSize = 150;
  for (let i = 0; i < invIdList.length; i += chunkSize) {
    const slice = invIdList.slice(i, i + chunkSize);
    const { data: invChunk, error: invErr } = await supabase
      .from("inventaris")
      .select(
        `
        id,
        nama,
        satuan,
        lokasi,
        distributor_id,
        master_barang_id,
        master_barang (
          distributor_id
        )
      `,
      )
      .in("id", slice);
    if (invErr) {
      return NextResponse.json({ ok: false, message: invErr.message }, { status: 500 });
    }
    for (const row of invChunk ?? []) {
      const r = row as InvRow;
      if (r.id) invById.set(String(r.id), r);
    }
  }

  const data = pemRows.map((row) => {
    const invId = String(row.inventaris_id ?? "").trim();
    const inventaris = invId ? invById.get(invId) ?? null : null;
    return { ...row, inventaris };
  });

  const scopeStr = scope ? String(scope) : "";

  function rowForTenant(row: Record<string, unknown>): boolean {
    if (adminShowAll) return true;
    const inv = row.inventaris as InvRow | null | undefined;
    if (!inv) return false;

    const invDist =
      inv.distributor_id != null && inv.distributor_id !== ""
        ? String(inv.distributor_id)
        : "";
    if (invDist === scopeStr) return true;

    const mbId =
      inv.master_barang_id != null && inv.master_barang_id !== ""
        ? String(inv.master_barang_id)
        : "";
    const masterDist = masterBarangDistId(inv);

    if (!invDist && masterDist === scopeStr) return true;

    if (!invDist && !masterDist && mbId && catalogMasterIds.has(mbId)) return true;

    return false;
  }

  function rowCathlab(row: Record<string, unknown>): boolean {
    const inv = row.inventaris as { lokasi?: string | null } | null | undefined;
    if (!inv) return false;
    const loc = (inv.lokasi ?? "").trim().toLowerCase();
    // Legacy: stok Cathlab sering tanpa `lokasi` terisi; FIFO memakai lokasi=Cathlab.
    if (!loc) return true;
    return loc === "cathlab" || loc.includes("cathlab");
  }

  const filtered = (data ?? [])
    .filter((row) => rowCathlab(row as Record<string, unknown>))
    .filter((row) => rowForTenant(row as Record<string, unknown>));

  const enriched = filtered.map((row: any) => {
    const inv = row.inventaris as {
      nama?: string;
      satuan?: string | null;
    } | null;
    return {
      id: row.id,
      created_at: row.created_at,
      inventaris_id: row.inventaris_id,
      jumlah: row.jumlah,
      tanggal: row.tanggal,
      keterangan: row.keterangan,
      tindakan_id: row.tindakan_id,
      distributor_nama: null as string | null,
      inventaris: inv
        ? { nama: inv.nama ?? "-", satuan: (inv.satuan as string | null) ?? null }
        : null,
      order_id: null as string | null,
      pasien: null as string | null,
      dokter: null as string | null,
      status_order: null as string | null,
      catatan: null as string | null,
      tanggal_order_raw: null as string | null,
      lot: null as string | null,
      ukuran: null as string | null,
      ed: null as string | null,
    };
  });

  /**
   * Input pemakaian Cathlab (dashboard) menyimpan di cathlab_pemakaian_order.items,
   * terpisah dari FIFO pemakaian + mutasi. Tanpa ini, portal distributor kosong
   * jika staf belum / tidak memanggil allocate_pemakaian_fifo.
   */
  let fromOrders: typeof enriched = [];
  if (!adminShowAll && scope) {
    const fromKey = from ?? "";
    const toKey = to ?? "";

    const { data: distRow } = await supabase
      .from("master_distributor")
      .select("nama_pt")
      .eq("id", scope)
      .maybeSingle();
    const namaPtNorm = normKey(String(distRow?.nama_pt ?? ""));

    const tenantBarangNames = new Set<string>();
    const { data: mbDirect } = await supabase
      .from("master_barang")
      .select("nama")
      .eq("distributor_id", scope);
    for (const r of mbDirect ?? []) {
      const n = normKey(String((r as { nama?: unknown }).nama ?? ""));
      if (n) tenantBarangNames.add(n);
    }

    const { data: invNamed } = await supabase
      .from("inventaris")
      .select("nama")
      .eq("distributor_id", scope);
    for (const r of invNamed ?? []) {
      const n = normKey(String((r as { nama?: unknown }).nama ?? ""));
      if (n) tenantBarangNames.add(n);
    }
    if (catalogMasterIds.size > 0) {
      const ids = [...catalogMasterIds];
      const chunk = 150;
      for (let i = 0; i < ids.length; i += chunk) {
        const slice = ids.slice(i, i + chunk);
        const { data: mbCat } = await supabase.from("master_barang").select("nama").in("id", slice);
        for (const r of mbCat ?? []) {
          const n = normKey(String((r as { nama?: unknown }).nama ?? ""));
          if (n) tenantBarangNames.add(n);
        }
      }
    }

    function orderItemForTenant(line: Record<string, unknown>, orderStatus: string): boolean {
      const qty = lineQtyForPemakaianReport(line, orderStatus);
      if (qty <= 0) return false;
      const distLine = normKey(String(line.distributor ?? ""));
      if (distLine && namaPtNorm) {
        if (distLine === namaPtNorm) return true;
        if (distLine.length >= 4 && namaPtNorm.length >= 4) {
          if (distLine.includes(namaPtNorm) || namaPtNorm.includes(distLine)) return true;
        }
      }
      const barangKey = normKey(String(line.barang ?? ""));
      if (barangKey && barangMatchesTenantSet(barangKey, tenantBarangNames)) return true;
      return false;
    }

    // Selain DRAFT: pemakaian sudah diinput petugas; status alur depo tidak menghapus fakta kepakaian.
    const { data: orderRows, error: orderErr } = await supabase
      .from("cathlab_pemakaian_order")
      .select("id, tanggal, pasien, dokter, status, items, catatan, created_at")
      .neq("status", "DRAFT")
      .order("created_at", { ascending: false })
      .limit(1500);

    if (orderErr) {
      return NextResponse.json({ ok: false, message: orderErr.message }, { status: 500 });
    }

    if (orderRows?.length) {
      for (const orow of orderRows) {
        const oid = String((orow as { id?: unknown }).id ?? "");
        const ost = String((orow as { status?: unknown }).status ?? "").trim();
        const tanggalStr = String((orow as { tanggal?: unknown }).tanggal ?? "");
        const createdStr = String((orow as { created_at?: unknown }).created_at ?? "");
        let dateKey = orderTanggalDateKey(tanggalStr) ?? orderTanggalDateKey(createdStr);
        if (fromKey && dateKey && dateKey < fromKey) continue;
        if (toKey && dateKey && dateKey > toKey) continue;
        if ((fromKey || toKey) && !dateKey) continue;

        const pasien = String((orow as { pasien?: unknown }).pasien ?? "").trim();
        const dokter = String((orow as { dokter?: unknown }).dokter ?? "").trim();
        const catatan = String((orow as { catatan?: unknown }).catatan ?? "").trim();
        const itemsRaw = (orow as { items?: unknown }).items;
        const items = parseOrderItemsJson(itemsRaw);

        let idx = 0;
        for (const line of items) {
          idx += 1;
          if (!orderItemForTenant(line, ost)) continue;
          const lineId =
            typeof line.lineId === "string" && line.lineId.trim()
              ? line.lineId.trim()
              : `L${idx}`;
          const barang = String(line.barang ?? "").trim() || "-";
          const qty = Math.abs(lineQtyForPemakaianReport(line, ost));
          const parts = [
            pasien ? `Pasien: ${pasien}` : null,
            dokter ? `Dokter: ${dokter}` : null,
            ost ? `Status: ${ost}` : null,
            catatan ? `Cat: ${catatan}` : null,
            oid ? `Order: ${oid}` : null,
          ].filter(Boolean);
          fromOrders.push({
            id: `${oid}__${lineId}`,
            created_at: String((orow as { created_at?: unknown }).created_at ?? null),
            inventaris_id: null,
            jumlah: qty,
            tanggal:
              dateKey ??
              (tanggalStr.length >= 10 ? tanggalStr.slice(0, 10) : orderTanggalDateKey(createdStr)),
            keterangan: parts.length ? parts.join(" · ") : null,
            tindakan_id: null,
            distributor_nama: String(distRow?.nama_pt ?? "").trim() || null,
            inventaris: { nama: barang, satuan: null },
            order_id: oid || null,
            pasien: pasien || null,
            dokter: dokter || null,
            status_order: ost || null,
            catatan: catatan || null,
            tanggal_order_raw: tanggalStr.trim() || null,
            lot: strFromLine(line, "lot", "LOT"),
            ukuran: strFromLine(line, "ukuran", "Ukuran"),
            ed: strFromLine(line, "ed", "ED"),
          });
        }
      }
    }
  } else if (adminShowAll) {
    /** Admin “Semua Distributor”: tampilkan semua baris order (selain DRAFT) dengan qty dipakai > 0. */
    const fromKey = from ?? "";
    const toKey = to ?? "";

    const { data: distListRaw } = await supabase
      .from("master_distributor")
      .select("id, nama_pt")
      .order("nama_pt", { ascending: true });
    const distList = (distListRaw ?? []) as { id: string; nama_pt: string }[];

    function resolveDistributorLabel(raw: string): string {
      const d = normKey(raw);
      if (!d) return "";
      for (const row of distList) {
        const n = normKey(row.nama_pt);
        if (n === d) return row.nama_pt;
      }
      for (const row of distList) {
        const n = normKey(row.nama_pt);
        if (n.length >= 4 && d.length >= 4 && (n.includes(d) || d.includes(n))) return row.nama_pt;
      }
      return raw.trim();
    }

    const { data: orderRowsAdmin, error: orderErrAdmin } = await supabase
      .from("cathlab_pemakaian_order")
      .select("id, tanggal, pasien, dokter, status, items, catatan, created_at")
      .neq("status", "DRAFT")
      .order("created_at", { ascending: false })
      .limit(1500);

    if (orderErrAdmin) {
      return NextResponse.json({ ok: false, message: orderErrAdmin.message }, { status: 500 });
    }

    if (orderRowsAdmin?.length) {
      for (const orow of orderRowsAdmin) {
        const oid = String((orow as { id?: unknown }).id ?? "");
        const ost = String((orow as { status?: unknown }).status ?? "").trim();
        const tanggalStr = String((orow as { tanggal?: unknown }).tanggal ?? "");
        const createdStr = String((orow as { created_at?: unknown }).created_at ?? "");
        let dateKey = orderTanggalDateKey(tanggalStr) ?? orderTanggalDateKey(createdStr);
        if (fromKey && dateKey && dateKey < fromKey) continue;
        if (toKey && dateKey && dateKey > toKey) continue;
        if ((fromKey || toKey) && !dateKey) continue;

        const pasien = String((orow as { pasien?: unknown }).pasien ?? "").trim();
        const dokter = String((orow as { dokter?: unknown }).dokter ?? "").trim();
        const catatan = String((orow as { catatan?: unknown }).catatan ?? "").trim();
        const itemsRaw = (orow as { items?: unknown }).items;
        const items = parseOrderItemsJson(itemsRaw);

        let idx = 0;
        for (const line of items) {
          idx += 1;
          if (lineQtyForPemakaianReport(line, ost) <= 0) continue;
          const lineId =
            typeof line.lineId === "string" && line.lineId.trim()
              ? line.lineId.trim()
              : `L${idx}`;
          const barang = String(line.barang ?? "").trim() || "-";
          const qty = Math.abs(lineQtyForPemakaianReport(line, ost));
          const rawDist = String(line.distributor ?? "").trim();
          const labelPt = rawDist ? resolveDistributorLabel(rawDist) || rawDist : null;
          const st = ost;
          const parts = [
            pasien ? `Pasien: ${pasien}` : null,
            dokter ? `Dokter: ${dokter}` : null,
            st ? `Status: ${st}` : null,
            catatan ? `Cat: ${catatan}` : null,
            oid ? `Order: ${oid}` : null,
          ].filter(Boolean);
          fromOrders.push({
            id: `${oid}__${lineId}`,
            created_at: String((orow as { created_at?: unknown }).created_at ?? null),
            inventaris_id: null,
            jumlah: qty,
            tanggal:
              dateKey ??
              (tanggalStr.length >= 10 ? tanggalStr.slice(0, 10) : orderTanggalDateKey(createdStr)),
            keterangan: parts.length ? parts.join(" · ") : null,
            tindakan_id: null,
            distributor_nama: labelPt,
            inventaris: { nama: barang, satuan: null },
            order_id: oid || null,
            pasien: pasien || null,
            dokter: dokter || null,
            status_order: st || null,
            catatan: catatan || null,
            tanggal_order_raw: tanggalStr.trim() || null,
            lot: strFromLine(line, "lot", "LOT"),
            ukuran: strFromLine(line, "ukuran", "Ukuran"),
            ed: strFromLine(line, "ed", "ED"),
          });
        }
      }
    }
  }

  const merged = [...fromOrders, ...enriched].sort((a, b) => {
    const ta = String(a.tanggal ?? "");
    const tb = String(b.tanggal ?? "");
    return tb.localeCompare(ta);
  });

  const payload: Record<string, unknown> = { ok: true, data: merged };
  if (merged.length === 0) {
    payload.hint =
      "Periksa rentang tanggal (From/To) mencakup tanggal order Cathlab. Mode “Semua Distributor” memuat order Depo/Cathlab selain DRAFT; filter PT tertentu lewat dropdown header.";
  }

  return NextResponse.json(payload, { status: 200 });
}
