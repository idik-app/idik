import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";
import { normalizeKategoriAlkesLine } from "@/lib/distributorCatalog";

export const dynamic = "force-dynamic";

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
  isKonsolidasi?: boolean;
  harga?: number;
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
  const tindakanIdRaw =
    typeof body.tindakanId === "string"
      ? body.tindakanId
      : typeof (body as { tindakan_id?: unknown }).tindakan_id === "string"
        ? String((body as { tindakan_id?: string }).tindakan_id)
        : "";
  const tindakanId = tindakanIdRaw.trim() || null;

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
        isKonsolidasi: !!it.isKonsolidasi,
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

  // --- AUTO-CREATE MASTER BARANG & DISTRIBUTOR ---
  // Kita proses pendaftaran barang baru ke Master jika belum ada.
  try {
    const { data: allMasters } = await supabase
      .from("master_barang")
      .select("id, nama");
    const { data: allDists } = await supabase
      .from("master_distributor")
      .select("id, nama_pt");

    for (const item of normalized) {
      const namaBarang = item.barang.trim();
      const namaDist = item.distributor?.trim();

      // 1. Cari atau buat Master Barang
      let masterId = allMasters?.find(
        (m) => m.nama.toLowerCase() === namaBarang.toLowerCase(),
      )?.id;

      if (!masterId) {
        const { data: newMaster, error: errM } = await supabase
          .from("master_barang")
          .insert({
            nama: namaBarang,
            jenis: "ALKES",
            kategori: item.kategori || null,
            is_active: true,
          })
          .select("id")
          .single();
        if (!errM && newMaster) masterId = newMaster.id;
      }

      // 2. Cari atau buat Master Distributor (jika ada nama distributor)
      let distId = null;
      if (namaDist) {
        distId = allDists?.find(
          (d) => d.nama_pt.toLowerCase() === namaDist.toLowerCase(),
        )?.id;

        if (!distId) {
          const { data: newDist, error: errD } = await supabase
            .from("master_distributor")
            .insert({
              nama_pt: namaDist,
              is_konsolidasi: item.status === "KONSOLIDASI",
            })
            .select("id")
            .single();
          if (!errD && newDist) distId = newDist.id;
        }
      }

      // 3. Daftarkan Varian (distributor_barang) jika ada LOT/Ukuran/ED
      if (masterId && (item.lot || item.ukuran || item.ed)) {
        // Cek apakah varian ini sudah ada
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
    console.error("[AutoCreateMaster] Gagal:", e);
    // Kita biarkan lanjut simpan order meskipun auto-create master gagal
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
    petugas_cssd,
    asisten_cathlab,
    status_alkes_cssd,
    status: "MENUNGGU_VALIDASI" as const,
    items: normalized,
    catatan,
    template_input_barang: normalizeTemplateInputBarang(
      body.templateInputBarang,
    ),
    ...(tindakanId ? { tindakan_id: tindakanId } : {}),
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

  return NextResponse.json({ ok: true, order: data }, { status: 201 });
}

/** Cache orders (1 menit) untuk dashboard */
let ordersCache: { data: any[]; expires: number; key: string } | null = null;

/** GET /api/pemakaian-orders — daftar order; `?tindakanId=` = filter per kasus tindakan. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tindakanFilter = searchParams.get("tindakanId")?.trim() ?? "";
  const limitRaw = Number(searchParams.get("limit") ?? 1000);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 5000) : 1000;

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
    .select("*")
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
    expires: now + 60 * 1000,
    key: cacheKey
  };

  return NextResponse.json({ ok: true, orders: finalData });
}
