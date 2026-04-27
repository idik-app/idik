import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

function parseDate(value: string | null) {
  if (!value) return null;
  const t = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
  if (!t) return null;
  if (t.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const idMonthMap: Record<string, string> = {
    jan: "01", januari: "01", feb: "02", februari: "02", mar: "03", maret: "03",
    apr: "04", april: "04", mei: "05", jun: "06", juni: "06", jul: "07", juli: "07",
    agu: "08", agustus: "08", sep: "09", september: "09", okt: "10", oktober: "10",
    nov: "11", november: "11", des: "12", desember: "12",
  };
  const m = t.match(
    /^(\d{1,2})\s+(Jan(?:uari)?|Feb(?:ruari)?|Mar(?:et)?|Apr(?:il)?|Mei|Jun(?:i)?|Jul(?:i)?|Agu(?:stus)?|Sep(?:tember)?|Okt(?:ober)?|Nov(?:ember)?|Des(?:ember)?)\s+(\d{4})/i,
  );
  if (m) {
    const day = String(Number(m[1])).padStart(2, "0");
    const mon = idMonthMap[m[2].toLowerCase()];
    const year = m[3];
    if (mon) return `${year}-${mon}-${day}`;
  }
  const ms = Date.parse(t);
  if (!Number.isNaN(ms)) return toYmdLocal(new Date(ms));
  return null;
}

/** Cocokkan teks distributor di baris order dengan nama_pt (abaikan varian "PT." / spasi). */
function distributorLineMatchesTenant(
  lineDistributorRaw: string,
  namaPtRaw: string,
): boolean {
  const stripPt = (s: string) => normKey(s).replace(/^pt\.?\s*/u, "").trim();
  const distLine = stripPt(lineDistributorRaw);
  const namaPt = stripPt(namaPtRaw);
  if (!distLine || !namaPt) return false;
  if (distLine === namaPt) return true;
  if (distLine.length >= 4 && namaPt.length >= 4) {
    if (distLine.includes(namaPt) || namaPt.includes(distLine)) return true;
  }
  return false;
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

function lineQtyForPemakaianReport(
  line: Record<string, unknown>,
  _orderStatus: string,
): number {
  const u = orderLineQtyUsed(line);
  if (u > 0) return u;
  const p = orderLineQtyRencana(line);
  if (p > 0) return p;
  return 0;
}

function parseOrderItemsJson(itemsRaw: unknown): Record<string, unknown>[] {
  if (Array.isArray(itemsRaw)) return itemsRaw as Record<string, unknown>[];
  if (typeof itemsRaw === "string") {
    try {
      const p = JSON.parse(itemsRaw) as unknown;
      return Array.isArray(p) ? (p as Record<string, unknown>[]) : [];
    } catch { return []; }
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuidParam(s: string): boolean { return UUID_RE.test(s.trim()); }

function barangMatchesTenantSet(barangKey: string, tenantBarangNames: Set<string>): boolean {
  return barangKey ? tenantBarangNames.has(barangKey) : false;
}

function masterBarangDistId(inv: any): string {
  const mb = inv?.master_barang;
  const row = Array.isArray(mb) ? mb[0] : mb;
  const d = row?.distributor_id;
  return (d == null || d === "") ? "" : String(d);
}

function masterBarangKategori(inv: any): string | null {
  const mb = inv?.master_barang;
  const row = Array.isArray(mb) ? mb[0] : mb;
  const k = row?.kategori;
  if (typeof k === "string" && k.trim()) return k.trim();
  return null;
}

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

type AdminAllMode = "raw" | "distributor-only";
function parseAdminAllMode(value: string | null): AdminAllMode {
  return (String(value ?? "").trim().toLowerCase() === "distributor-only") ? "distributor-only" : "raw";
}

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  const { searchParams } = new URL(req.url);
  const focusOrderRaw = searchParams.get("focus_order");
  const focusOrderIds = focusOrderRaw?.split("|").map(v => v.trim()).filter(Boolean) || [];

  if (!id.ok && focusOrderIds.length === 0) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const adminAllMode = parseAdminAllMode(searchParams.get("mode"));
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();

  if (id.ok && id.isAdminView && distributorIdParam && !isValidUuidParam(distributorIdParam)) {
    return NextResponse.json({ ok: false, message: "Invalid distributor_id" }, { status: 400 });
  }

  const scope = id.ok && id.isAdminView ? (distributorIdParam || null) : (id.ok ? (id.distributorId ?? null) : null);
  const adminShowAll = Boolean((id.ok && id.isAdminView && !scope) || !id.ok);

  if (id.ok && !id.isAdminView && !scope) {
    return NextResponse.json({ ok: false, message: "No tenant scope" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // 1. Ambil data katalog dan dasar secara paralel
  const [catalogRows, pemFromTableRes, mbDirectRes, invNamedRes, distRowRes] = await Promise.all([
    (!adminShowAll && scope) ? supabase.from("distributor_barang").select("master_barang_id").eq("distributor_id", scope) : Promise.resolve({ data: [], error: null }),
    (!id.ok && focusOrderIds.length > 0) ? Promise.resolve({ data: [], error: null }) : supabase.from("pemakaian").select("id, created_at, inventaris_id, jumlah, tanggal, keterangan, tindakan_id").order("tanggal", { ascending: false }).gte("tanggal", from || "1900-01-01").lte("tanggal", to || "2100-01-01"),
    (!adminShowAll && scope) ? supabase.from("master_barang").select("nama").eq("distributor_id", scope) : Promise.resolve({ data: [], error: null }),
    (!adminShowAll && scope) ? supabase.from("inventaris").select("nama").eq("distributor_id", scope) : Promise.resolve({ data: [], error: null }),
    (!adminShowAll && scope) ? supabase.from("master_distributor").select("nama_pt").eq("id", scope).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);

  let catalogMasterIds = new Set<string>();
  for (const r of (catalogRows.data ?? [])) {
    const mb = String((r as any).master_barang_id ?? "").trim();
    if (mb) catalogMasterIds.add(mb);
  }

  let pemRows: PemakaianRowBase[] = [];
  if (pemFromTableRes.error && isPemakaianTableSchemaMismatch(pemFromTableRes.error)) {
    // Fallback mutasi jika tabel pemakaian bermasalah
    const { data: mutRows } = await supabase.from("inventaris_stok_mutasi").select("id, created_at, inventaris_id, qty_delta, ref_id, keterangan, ref_type").eq("tipe", "KELUAR_PEMAKAIAN").eq("ref_type", "pemakaian").gte("created_at", `${from || "1900-01-01"}T00:00:00.000Z`).lte("created_at", `${to || "2100-01-01"}T23:59:59.999Z`).order("created_at", { ascending: false });
    pemRows = (mutRows ?? []).map((r: any) => ({
      id: r.ref_id || String(r.id),
      created_at: r.created_at,
      inventaris_id: r.inventaris_id,
      jumlah: Math.abs(Number(r.qty_delta)),
      tanggal: r.created_at?.slice(0, 10),
      keterangan: r.keterangan,
      tindakan_id: null,
    }));
  } else {
    pemRows = (pemFromTableRes.data ?? []) as PemakaianRowBase[];
  }

  // 2. Ambil detail inventaris secara paralel (chunked)
  const invIdList = [...new Set(pemRows.map(r => String(r.inventaris_id ?? "").trim()).filter(Boolean))];
  const invById = new Map<string, any>();
  const invChunks = [];
  for (let i = 0; i < invIdList.length; i += 200) invChunks.push(invIdList.slice(i, i + 200));
  const invResults = await Promise.all(
    invChunks.map((slice) =>
      supabase
        .from("inventaris")
        .select(
          "id, nama, satuan, lokasi, distributor_id, master_barang_id, master_barang(distributor_id, kategori)",
        )
        .in("id", slice),
    ),
  );
  for (const res of invResults) {
    for (const r of (res.data ?? [])) invById.set(String(r.id), r);
  }

  // 3. Fetch synchronized tindakan data for pemakaian rows
  const pemTids = [
    ...new Set(
      pemRows.map((r) => String(r.tindakan_id ?? "").trim()).filter(Boolean),
    ),
  ];
  const pemTindakanById = new Map<
    string,
    { dokter: string; ruangan: string; nama_pasien: string; no_rm: string }
  >();
  if (pemTids.length > 0) {
    const tChunks = [];
    for (let i = 0; i < pemTids.length; i += 200)
      tChunks.push(pemTids.slice(i, i + 200));
    const tResults = await Promise.all(
      tChunks.map((slice) =>
        supabase
          .from("tindakan")
          .select("id, dokter, ruangan, nama_pasien, no_rm")
          .in("id", slice),
      ),
    );
    for (const res of tResults) {
      for (const r of res.data ?? []) {
        pemTindakanById.set(String(r.id), {
          dokter: String(r.dokter ?? "").trim(),
          ruangan: String(r.ruangan ?? "").trim(),
          nama_pasien: String(r.nama_pasien ?? "").trim(),
          no_rm: String(r.no_rm ?? "").trim(),
        });
      }
    }
  }

  const enrichedPemakaian = pemRows
    .map((row) => {
      const inv = invById.get(String(row.inventaris_id));
      return { ...row, inventaris: inv };
    })
    .filter((row) => {
      const inv = row.inventaris;
      if (!inv) return false;
      const loc = (inv.lokasi ?? "").toLowerCase();
      if (loc && !loc.includes("cathlab")) return false; // Filter Cathlab
      if (adminShowAll) return true;
      const distId = String(inv.distributor_id || "");
      const mbDistId = masterBarangDistId(inv);
      return (
        distId === String(scope) ||
        mbDistId === String(scope) ||
        (inv.master_barang_id && catalogMasterIds.has(String(inv.master_barang_id)))
      );
    })
    .map((row) => {
      const tid = String(row.tindakan_id ?? "").trim();
      const synced = tid ? pemTindakanById.get(tid) : null;
      return {
        id: row.id,
        created_at: row.created_at,
        jumlah: row.jumlah,
        tanggal: row.tanggal,
        keterangan: row.keterangan,
        inventaris: {
          nama: row.inventaris.nama || "-",
          satuan: row.inventaris.satuan || null,
          kategori: masterBarangKategori(row.inventaris),
        },
        distributor_nama: null,
        order_id: null,
        pasien: synced?.nama_pasien || null,
        dokter: synced?.dokter || null,
        ruangan: synced?.ruangan || null,
        no_rm: synced?.no_rm || null,
        status_order: null,
        catatan: null,
        lot: null,
        ukuran: null,
        ed: null,
      };
    });

  // 4. Ambil data order realtime (jika bukan adminShowAll)
  let fromOrders: any[] = [];
  if (!adminShowAll && scope) {
    const stripPt = (s: string) => normKey(s).replace(/^pt\.?\s*/u, "").toUpperCase().trim();
    const namaPtStr = distRowRes.data?.nama_pt ? `PT. ${stripPt(distRowRes.data.nama_pt)}` : "";
    const tenantBarangNames = new Set<string>();
    [...(mbDirectRes.data ?? []), ...(invNamedRes.data ?? [])].forEach((r: any) => {
      const n = normKey(r.nama);
      if (n) tenantBarangNames.add(n);
    });

    const { data: orderRows } = await supabase
      .from("cathlab_pemakaian_order")
      .select(
        "id, tanggal, pasien, dokter, status, items, catatan, created_at, no_rm, tindakan_id, ruangan",
      )
      .in("status", [
        "DIAJUKAN",
        "MENUNGGU_VALIDASI",
        "TERVERIFIKASI",
        "SELESAI",
      ])
      .order("created_at", { ascending: false })
      .limit(focusOrderIds.length > 0 ? 100 : 8000);

    // Fetch synchronized tindakan data if tindakan_id exists
    const tids = [
      ...new Set(
        (orderRows ?? [])
          .map((r) => String(r.tindakan_id ?? "").trim())
          .filter(Boolean),
      ),
    ];
    const tindakanById = new Map<
      string,
      { dokter: string; ruangan: string; nama_pasien: string; no_rm: string }
    >();
    if (tids.length > 0) {
      const tChunks = [];
      for (let i = 0; i < tids.length; i += 200)
        tChunks.push(tids.slice(i, i + 200));
      const tResults = await Promise.all(
        tChunks.map((slice) =>
          supabase
            .from("tindakan")
            .select("id, dokter, ruangan, nama_pasien, no_rm")
            .in("id", slice),
        ),
      );
      for (const res of tResults) {
        for (const r of res.data ?? []) {
          tindakanById.set(String(r.id), {
            dokter: String(r.dokter ?? "").trim(),
            ruangan: String(r.ruangan ?? "").trim(),
            nama_pasien: String(r.nama_pasien ?? "").trim(),
            no_rm: String(r.no_rm ?? "").trim(),
          });
        }
      }
    }

    for (const orow of orderRows ?? []) {
      const dateKey =
        orderTanggalDateKey(orow.tanggal) ||
        orderTanggalDateKey(orow.created_at);
      if (focusOrderIds.length === 0) {
        if (from && dateKey && dateKey < from) continue;
        if (to && dateKey && dateKey > to) continue;
      }

      // Sync with latest tindakan data if available
      const tid = String(orow.tindakan_id ?? "").trim();
      const synced = tid ? tindakanById.get(tid) : null;
      const finalPasien = synced?.nama_pasien || orow.pasien;
      const finalDokter = synced?.dokter || orow.dokter;
      const finalRuangan = synced?.ruangan || orow.ruangan;
      const finalNoRm = synced?.no_rm || orow.no_rm;

      const items = parseOrderItemsJson(orow.items);
      items.forEach((line, idx) => {
        const qty = lineQtyForPemakaianReport(line, orow.status);
        if (qty <= 0) return;
        const rawDist = String(line.distributor || "").trim();
        if (
          rawDist &&
          namaPtStr &&
          !distributorLineMatchesTenant(rawDist, namaPtStr)
        )
          return;
        if (
          !rawDist &&
          !barangMatchesTenantSet(
            normKey(String(line.barang || "")),
            tenantBarangNames,
          )
        )
          return;

        const cleanDist = rawDist ? `PT. ${stripPt(rawDist)}` : null;
        fromOrders.push({
          id: `${orow.id}__${line.lineId || idx}`,
          created_at: orow.created_at,
          jumlah: qty,
          tanggal: dateKey || orow.tanggal?.slice(0, 10),
          inventaris: {
            nama: String(line.barang || "-"),
            satuan: null,
            kategori: strFromLine(line, "kategori", "Kategori"),
          },
          distributor_nama: cleanDist || namaPtStr || null,
          order_id: orow.id,
          pasien: finalPasien,
          dokter: finalDokter,
          ruangan: finalRuangan,
          no_rm: finalNoRm,
          status_order: orow.status,
          lot: strFromLine(line, "lot", "LOT"),
          ukuran: strFromLine(line, "ukuran", "Ukuran"),
          ed: strFromLine(line, "ed", "ED"),
        });
      });
    }
  }

  const merged = [...fromOrders, ...enrichedPemakaian].sort((a, b) => String(b.tanggal ?? "").localeCompare(String(a.tanggal ?? "")));
  return NextResponse.json({ ok: true, data: merged }, { status: 200 });
}
