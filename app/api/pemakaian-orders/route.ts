import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";
import { normalizeKategoriAlkesLine } from "@/lib/distributorCatalog";
import { ensureInventarisForPemakaianFifo } from "@/lib/inventaris/ensureStockForPemakaianFifo";
import {
  tindakanIdTextForOrder,
  tindakanIdTextParamForAllocateFifo,
} from "@/lib/pemakaian/tindakanIdForAllocateRpc";
import {
  normalizeMasterBarangUuid,
  resolveMasterBarangUuidForFifo,
  type MasterBarangRowRef,
} from "@/lib/pemakaian/masterBarangUuidForFifo";
import { lineEligibleForPemakaianFifo } from "@/lib/pemakaian/fifoOrderLine";
import { rpcAllocatePemakaianFifo } from "@/lib/pemakaian/allocateFifoRpc";

export const dynamic = "force-dynamic";

const LOKASI_FIFO = "Cathlab";

function newOrderId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${t}-${r}`;
}

type LineIn = {
  lineId?: string;
  barang?: string;
  kategori?: string;
  distributor?: string;
  qtyRencana?: number;
  qtyDipakai?: number;
  tipe?: string;
  lot?: string;
  ukuran?: string;
  ed?: string;
  /** Eksplisit; jika hanya `status` yang dikirim, dinormalisasi di bawah. */
  isKonsolidasi?: boolean;
  status?: string;
  harga?: number;
  keterangan?: string;
};

/** POST /api/pemakaian-orders — simpan order baru (Input Pemakaian / Resep). */
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }

  const pasien = String(body.pasien ?? "").trim();
  const no_rm_raw = String(body.no_rm ?? "").trim();
  const dokter = String(body.dokter ?? "").trim();
  const depo = String(body.depo ?? "").trim();
  const petugas_cssd = String(body.petugas_cssd ?? "").trim() || null;
  const asisten_cathlab = String(body.asisten_cathlab ?? "").trim() || null;
  const status_alkes_cssd = String(body.status_alkes_cssd ?? "").trim() || null;
  const tanggalRaw = String(body.tanggal ?? "").trim();
  const mode =
    body.mode === "RESEP" || body.mode === "PEMAKAIAN"
      ? body.mode
      : "PEMAKAIAN";
  const catatan =
    typeof body.catatan === "string" && body.catatan.trim()
      ? body.catatan.trim()
      : null;
  const ruangan = typeof body.ruangan === "string" ? body.ruangan.trim() : "";
  const rawTindakan =
    (body as { tindakanId?: unknown }).tindakanId ??
    (body as { tindakan_id?: unknown }).tindakan_id;
  const tindakanIdText = tindakanIdTextForOrder(rawTindakan);
  const tindakanIdFifoText = tindakanIdTextParamForAllocateFifo(rawTindakan);

  if (!pasien || !dokter || !depo) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pasien, dokter, dan depo wajib diisi.",
      },
      { status: 400 },
    );
  }

  let tanggal = tanggalRaw;
  if (tanggalRaw.includes("T")) {
    try {
      tanggal = format(parseISO(tanggalRaw), "yyyy-MM-dd HH:mm");
    } catch {
      tanggal = tanggalRaw.replace("T", " ").slice(0, 16);
    }
  }
  if (!tanggal) {
    return NextResponse.json(
      { ok: false, message: "Tanggal & jam wajib diisi." },
      { status: 400 },
    );
  }

  const rawItems = body.items;
    const items: LineIn[] = Array.isArray(rawItems) ? (rawItems as LineIn[]) : [];
    const normalized = items
      .map((it: LineIn, i: number) => {
        const barang = String(it.barang ?? "").trim();
        if (!barang) return null;
      const kategori = normalizeKategoriAlkesLine(it.kategori);
      return {
        lineId:
          typeof it.lineId === "string" && it.lineId.trim()
            ? it.lineId.trim()
            : `line-${i + 1}`,
        barang,
        ...(kategori ? { kategori } : {}),
        distributor:
          typeof it.distributor === "string" && it.distributor.trim()
            ? it.distributor.trim()
            : undefined,
        qtyRencana:
          typeof it.qtyRencana === "number" && !Number.isNaN(it.qtyRencana)
            ? Math.max(0, it.qtyRencana)
            : 0,
        qtyDipakai:
          typeof it.qtyDipakai === "number" && !Number.isNaN(it.qtyDipakai)
            ? Math.max(0, it.qtyDipakai)
            : 0,
        tipe:
          it.tipe === "R" || it.tipe === "REUSE"
            ? "R"
            : it.tipe === "B" || it.tipe === "RUSAK" || it.tipe === "BROKEN"
              ? "B"
              : "N",
        lot:
          typeof it.lot === "string" && it.lot.trim()
            ? it.lot.trim()
            : undefined,
        ukuran:
          typeof it.ukuran === "string" && it.ukuran.trim()
            ? it.ukuran.trim()
            : undefined,
        ed:
          typeof it.ed === "string" && it.ed.trim() ? it.ed.trim() : undefined,
        isKonsolidasi:
          !!it.isKonsolidasi ||
          String(it.status ?? "")
            .trim()
            .toUpperCase() === "KONSOLIDASI",
        keterangan:
          typeof it.keterangan === "string" && it.keterangan.trim()
            ? it.keterangan.trim()
            : undefined,
        ...(typeof it.harga === "number" &&
        Number.isFinite(it.harga) &&
        it.harga >= 0
          ? { harga: it.harga }
          : {}),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (normalized.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Tambah minimal satu barang dengan nama barang terisi.",
      },
      { status: 400 },
    );
  }

  const id = newOrderId();

  /** Harus mutabel: insert baris baru harus langsung terlihat iterasi berikutnya
   *  agar tidak membuat dua `master_barang` untuk nama sama dalam satu request. */
  let mastersList: MasterBarangRowRef[] = [];
  let distsList: { id: string; nama_pt: string }[] = [];

  // --- AUTO-CREATE MASTER BARANG & DISTRIBUTOR (tanpa FIFO; order harus ada di DB dulu untuk FK pemakaian) ---
  try {
    const { data: mastersInitial } = await supabase
      .from("master_barang")
      .select("id, nama, created_at");
    const { data: distsInitial } = await supabase
      .from("master_distributor")
      .select("id, nama_pt");

    mastersList = [...(mastersInitial ?? [])];
    distsList = [...(distsInitial ?? [])];

    for (const item of normalized) {
      const namaBarang = item.barang.trim();
      const namaDist = item.distributor?.trim();

      // 1. Cari atau buat Master Barang (duplikat nama: utamakan baris id UUID)
      const existingMaster = resolveMasterBarangUuidForFifo(
        mastersList,
        namaBarang,
      );
      if (!existingMaster.ok && existingMaster.reason === "legacy_or_invalid_id") {
        return NextResponse.json(
          {
            ok: false,
            message: `Master "${namaBarang}" punya duplikat / ID non-UUID di database. Rapikan di Master Barang lalu coba lagi.`,
          },
          { status: 500 },
        );
      }
      let masterId: string | undefined =
        existingMaster.ok ? existingMaster.masterUuid : undefined;

      if (!masterId) {
        const { data: newMaster, error: errM } = await supabase
          .from("master_barang")
          .insert({
            nama: namaBarang,
            jenis: "ALKES",
            kategori: item.kategori || null,
            is_active: true,
          })
          .select("id, created_at")
          .single();
        if (!errM && newMaster?.id) {
          masterId = newMaster.id;
          mastersList.push({
            id: newMaster.id,
            nama: namaBarang,
            created_at: newMaster.created_at ?? null,
          });
        }
      }

      // 2. Cari atau buat Master Distributor (jika ada nama distributor)
      let distId = null;
      if (namaDist) {
        distId = distsList.find(
          (d) => d.nama_pt.toLowerCase() === namaDist.toLowerCase(),
        )?.id;

        if (!distId) {
          const { data: newDist, error: errD } = await supabase
            .from("master_distributor")
            .insert({
              nama_pt: namaDist,
              is_konsolidasi: item.isKonsolidasi,
            })
            .select("id")
            .single();
          if (!errD && newDist?.id) {
            distId = newDist.id;
            distsList.push({ id: newDist.id, nama_pt: namaDist });
          }
        }
      }

      // 3. Daftarkan Varian (distributor_barang) jika ada LOT/Ukuran/ED
      if (masterId && (item.lot || item.ukuran || item.ed)) {
        const { data: existingVar } = await supabase
          .from("distributor_barang")
          .select("id")
          .match({
            master_barang_id: masterId,
            lot: item.lot || null,
            ukuran: item.ukuran || null,
            ed: item.ed || null,
          })
          .maybeSingle();

        if (!existingVar) {
          await supabase.from("distributor_barang").insert({
            master_barang_id: masterId,
            distributor_id: distId,
            lot: item.lot || null,
            ukuran: item.ukuran || null,
            ed: item.ed || null,
            is_active: true,
          });
        }
      }
    }
  } catch (e) {
    console.error("[AutoCreateAndAllocate] Gagal:", e);
    // Master/distributor: lanjut simpan order; baris baru di loop di atas bisa belum ter-commit.
  }

  const row = {
    id,
    mode,
    tanggal,
    pasien,
    no_rm: no_rm_raw || null,
    dokter,
    ruangan,
    depo,
    // petugas_cssd,
    // asisten_cathlab,
    // status_alkes_cssd,
    status: "MENUNGGU_VALIDASI" as const,
    items: normalized,
    catatan,
    template_input_barang: normalizeTemplateInputBarang(
      body.templateInputBarang,
    ),
    ...(tindakanIdText ? { tindakan_id: tindakanIdText } : {}),
  };

  const { data, error } = await supabase
    .from("cathlab_pemakaian_order")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const rollbackCreatedOrder = async () => {
    const { error: revErr } = await supabase.rpc(
      "reverse_pemakaian_order_allocations",
      { p_order_id: id },
    );
    if (revErr) {
      console.error("[POST pemakaian-orders] rollback reverse allocations:", revErr);
    }
    const { error: delErr } = await supabase
      .from("cathlab_pemakaian_order")
      .delete()
      .eq("id", id);
    if (delErr) {
      console.error("[POST pemakaian-orders] rollback hapus order:", delErr);
    }
  };

  // FIFO memakai cathlab_pemakaian_order_id → baris order harus sudah ada (FK pemakaian).
  if (mode === "PEMAKAIAN") {
    const fifoTotals = new Map<string, number>();
    for (const item of normalized) {
      if (!lineEligibleForPemakaianFifo(item)) continue;
      const namaBarang = item.barang.trim();
      const resolved = resolveMasterBarangUuidForFifo(mastersList, namaBarang);
      if (!resolved.ok) {
        if (resolved.reason === "legacy_or_invalid_id") {
          await rollbackCreatedOrder();
          return NextResponse.json(
            {
              ok: false,
              message: `Master "${namaBarang}" punya duplikat / ID non-UUID di database. Rapikan di Master Barang lalu coba lagi.`,
            },
            { status: 500 },
          );
        }
        continue;
      }
      fifoTotals.set(
        resolved.masterUuid,
        (fifoTotals.get(resolved.masterUuid) ?? 0) + item.qtyDipakai,
      );
    }

    for (const [masterId, qty] of fifoTotals) {
      if (qty <= 0) continue;
      const namaLabel =
        mastersList.find(
          (m) => normalizeMasterBarangUuid(m.id) === masterId,
        )?.nama ?? masterId;

      const ensure = await ensureInventarisForPemakaianFifo(supabase, {
        masterBarangId: masterId,
        lokasi: LOKASI_FIFO,
        qtyNeeded: qty,
      });
      if (!ensure.ok) {
        console.error(
          "[POST pemakaian-orders] FIFO ensure dilewati (order tetap disimpan):",
          namaLabel,
          ensure.message,
        );
        continue;
      }
      if (ensure.toppedUp > 0) {
        console.warn(
          `[POST pemakaian-orders ${id}] Inventaris ${LOKASI_FIFO} +${ensure.toppedUp} otomatis untuk "${namaLabel}" (master ${masterId})`,
        );
      }

      const { error: allocErr } = await rpcAllocatePemakaianFifo(supabase, {
        p_master_barang_id: masterId,
        p_jumlah: qty,
        p_lokasi: LOKASI_FIFO,
        p_tindakan_id_text: tindakanIdFifoText,
        p_keterangan: `Otomatis dari order ${id} (${pasien})`,
        p_tanggal: tanggal.slice(0, 10),
        p_order_id: id,
      });

      if (allocErr) {
        const supHost = (() => {
          const u = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (!u) return "(missing NEXT_PUBLIC_SUPABASE_URL)";
          try {
            return new URL(u).hostname;
          } catch {
            return "(invalid NEXT_PUBLIC_SUPABASE_URL)";
          }
        })();
        console.error(
          "[AllocateFIFO] Gagal untuk",
          namaLabel,
          "| supabase host:",
          supHost,
          "| tindakanIdFifoText:",
          tindakanIdFifoText ?? "(null)",
          "| masterId:",
          masterId,
          "| error:",
          allocErr,
        );
        continue;
      }
    }
  }

  return NextResponse.json({ ok: true, order: data }, { status: 201 });
}

/** Kolom daftar order — hindari select(*) penuh (items JSON tetap diambil). */
const PEMEMAKAIAN_ORDER_LIST_COLUMNS =
  "id, mode, tanggal, pasien, no_rm, dokter, ruangan, depo, status, items, catatan, template_input_barang, tindakan_id, created_at, updated_at";

/** Default & batas daftar order di dashboard pemakaian. */
const DEFAULT_ORDERS_LIST_LIMIT = 300;
const MAX_ORDERS_LIST_LIMIT = 2000;

/** Cache orders (2 menit) untuk dashboard */
let ordersCache: { data: any[]; expires: number; key: string } | null = null;

/** GET /api/pemakaian-orders — daftar order; `?tindakanId=` = filter per kasus tindakan. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tindakanFilter = searchParams.get("tindakanId")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? DEFAULT_ORDERS_LIST_LIMIT);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_ORDERS_LIST_LIMIT)
    : DEFAULT_ORDERS_LIST_LIMIT;

  const cacheKey = `${tindakanFilter}|${limit}`;
  const now = Date.now();
  if (ordersCache && now < ordersCache.expires && ordersCache.key === cacheKey) {
    return NextResponse.json({ ok: true, orders: ordersCache.data, cached: true });
  }

  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 },
    );
  }

  let query = supabase
    .from("cathlab_pemakaian_order")
    .select(PEMEMAKAIAN_ORDER_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tindakanFilter) {
    query = query.eq("tindakan_id", tindakanFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const finalData = data ?? [];
  
  // Cache for 1 minute
  ordersCache = {
    data: finalData,
    expires: now + 120 * 1000,
    key: cacheKey
  };

  return NextResponse.json({ ok: true, orders: finalData });
}
