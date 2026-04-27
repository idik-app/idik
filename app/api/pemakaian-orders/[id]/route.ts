import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";
import { normalizeKategoriAlkesLine } from "@/lib/distributorCatalog";
import { ensureInventarisForPemakaianFifo } from "@/lib/inventaris/ensureStockForPemakaianFifo";
import { tindakanIdTextParamForAllocateFifo } from "@/lib/pemakaian/tindakanIdForAllocateRpc";
import {
  normalizeMasterBarangUuid,
  resolveMasterBarangUuidForFifo,
  type MasterBarangRowRef,
} from "@/lib/pemakaian/masterBarangUuidForFifo";
import { lineEligibleForPemakaianFifo } from "@/lib/pemakaian/fifoOrderLine";
import { rpcAllocatePemakaianFifo } from "@/lib/pemakaian/allocateFifoRpc";

export const dynamic = "force-dynamic";

const LOKASI_FIFO = "Cathlab";

type Params = { params: Promise<{ id: string }> };

const ALLOWED_STATUS = new Set([
  "DRAFT",
  "DIAJUKAN",
  "MENUNGGU_VALIDASI",
  "TERVERIFIKASI",
  "SELESAI",
]);

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
  status?: string;
  harga?: number;
  keterangan?: string;
};

type NormalizedLine = {
  lineId: string;
  barang: string;
  kategori?: string;
  distributor?: string;
  qtyRencana: number;
  qtyDipakai: number;
  tipe: "N" | "R" | "B";
  lot?: string;
  ukuran?: string;
  ed?: string;
  isKonsolidasi?: boolean;
  harga?: number;
  keterangan?: string;
};

function normalizeItems(
  rawItems: unknown,
): { ok: true; items: NormalizedLine[] } | { ok: false; message: string } {
  const items: LineIn[] = Array.isArray(rawItems) ? (rawItems as LineIn[]) : [];
  const normalized = items
    .map((it, i) => {
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
        tipe: (
          it.tipe === "R" || it.tipe === "REUSE"
            ? "R"
            : it.tipe === "B" || it.tipe === "RUSAK" || it.tipe === "BROKEN"
              ? "B"
              : "N"
        ) as "N" | "R" | "B",
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
    return {
      ok: false,
      message: "Minimal satu baris barang dengan nama terisi.",
    };
  }
  return { ok: true, items: normalized };
}

function normalizeTanggal(raw: string): string {
  const tanggalRaw = String(raw ?? "").trim();
  if (!tanggalRaw) return "";
  if (tanggalRaw.includes("T")) {
    try {
      return format(parseISO(tanggalRaw), "yyyy-MM-dd HH:mm");
    } catch {
      return tanggalRaw.replace("T", " ").slice(0, 16);
    }
  }
  return tanggalRaw;
}

/** GET /api/pemakaian-orders/[id] — satu order (modal edit dari modul Tindakan, dll.). */
export async function GET(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { id: raw } = await params;
  const id = decodeURIComponent(raw ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID order tidak valid." },
      { status: 400 },
    );
  }

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

  const { data, error } = await supabase
    .from("cathlab_pemakaian_order")
    .select("id, mode, tanggal, pasien, no_rm, dokter, ruangan, depo, status, items, catatan, template_input_barang, tindakan_id, created_at, updated_at")
    // asisten_cathlab, petugas_cssd, status_alkes_cssd
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, order: data });
}

/** PATCH /api/pemakaian-orders/[id] — perbarui order (status, barang, header, dll.). */
export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { id: raw } = await params;
  const id = decodeURIComponent(raw ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID order tidak valid." },
      { status: 400 },
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

  const { data: existing, error: fetchErr } = await supabase
    .from("cathlab_pemakaian_order")
    .select("id, status, items, mode, tanggal, pasien, tindakan_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, message: fetchErr.message },
      { status: 500 },
    );
  }
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const st = String(body.status ?? "").trim();
    if (!ALLOWED_STATUS.has(st)) {
      return NextResponse.json(
        { ok: false, message: "Status tidak valid." },
        { status: 400 },
      );
    }
    patch.status = st;
  }

  if (body.tanggal !== undefined) {
    const t = normalizeTanggal(String(body.tanggal ?? ""));
    if (!t) {
      return NextResponse.json(
        { ok: false, message: "Tanggal & jam tidak boleh kosong." },
        { status: 400 },
      );
    }
    patch.tanggal = t;
  }

  if (body.pasien !== undefined) {
    patch.pasien = String(body.pasien ?? "").trim();
  }
  if (body.no_rm !== undefined) {
    const n = String(body.no_rm ?? "").trim();
    patch.no_rm = n || null;
  }
  if (body.ruangan !== undefined) {
    patch.ruangan = String(body.ruangan ?? "").trim();
  }
  if (body.dokter !== undefined) {
    patch.dokter = String(body.dokter ?? "").trim();
  }
  if (body.depo !== undefined) {
    patch.depo = String(body.depo ?? "").trim();
  }
  /*
  if (body.petugas_cssd !== undefined) {
    patch.petugas_cssd = String(body.petugas_cssd ?? "").trim() || null;
  }
  if (body.asisten_cathlab !== undefined) {
    patch.asisten_cathlab = String(body.asisten_cathlab ?? "").trim() || null;
  }
  */

  if (body.mode !== undefined) {
    const m =
      body.mode === "RESEP" || body.mode === "PEMAKAIAN" ? body.mode : null;
    if (!m) {
      return NextResponse.json(
        { ok: false, message: "Mode harus RESEP atau PEMAKAIAN." },
        { status: 400 },
      );
    }
    patch.mode = m;
  }

  if (body.catatan !== undefined) {
    const c = body.catatan;
    patch.catatan = typeof c === "string" && c.trim() ? c.trim() : null;
  }

  if (body.items !== undefined) {
    const n = normalizeItems(body.items);
    if (!n.ok) {
      return NextResponse.json(
        { ok: false, message: n.message },
        { status: 400 },
      );
    }
    patch.items = n.items;
  }

  if (body.templateInputBarang !== undefined) {
    patch.template_input_barang = normalizeTemplateInputBarang(
      body.templateInputBarang,
    );
  }

  /*
  if (body.status_alkes_cssd !== undefined) {
    const s = String(body.status_alkes_cssd ?? "").trim();
    patch.status_alkes_cssd = s || null;
  }
  */

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, message: "Tidak ada field yang diperbarui." },
      { status: 400 },
    );
  }

  // --- AUTO-REALLOCATE STOCK ---
  // Jika items atau status berubah, kita hitung ulang stok FIFO.
  const isPemakaian = (body.mode || existing.mode) === "PEMAKAIAN";
  if (isPemakaian && (body.items !== undefined || body.status !== undefined)) {
    const newStatus = (patch.status as string) || (existing.status as string);
    const itemsToAllocate =
      (patch.items as NormalizedLine[]) ||
      (existing.items as NormalizedLine[]);

    let allMastersForFifo: MasterBarangRowRef[] = [];
    if (newStatus !== "DRAFT") {
      const { data: am } = await supabase
        .from("master_barang")
        .select("id, nama, created_at");
      allMastersForFifo = (am ?? []).map((m) => ({
        id: m.id,
        nama: m.nama ?? "",
        created_at: m.created_at,
      }));
      for (const item of itemsToAllocate) {
        if (!lineEligibleForPemakaianFifo(item)) continue;
        const resolved = resolveMasterBarangUuidForFifo(
          allMastersForFifo,
          item.barang,
        );
        if (!resolved.ok && resolved.reason === "legacy_or_invalid_id") {
          return NextResponse.json(
            {
              ok: false,
              message: `Master "${item.barang}" punya duplikat / ID non-UUID di database. Rapikan di Master Barang (satu baris UUID per nama) lalu coba lagi.`,
            },
            { status: 500 },
          );
        }
      }
    }

    try {
      // 1. Kembalikan stok lama (reverse)
      const { error: revErr } = await supabase.rpc(
        "reverse_pemakaian_order_allocations",
        {
          p_order_id: id,
        },
      );
      if (revErr) {
        console.error("[PatchOrder] reverse_pemakaian_order_allocations:", revErr);
        return NextResponse.json(
          {
            ok: false,
            message: `Gagal mengembalikan stok order sebelumnya: ${revErr.message}. Simpan dibatalkan agar stok tidak dobel.`,
          },
          { status: 409 },
        );
      }

      // 2. Alokasikan stok baru (kecuali jika status baru adalah DRAFT)
      if (newStatus !== "DRAFT") {
        const fifoTotals = new Map<string, number>();
        for (const item of itemsToAllocate) {
          if (!lineEligibleForPemakaianFifo(item)) continue;
          const resolved = resolveMasterBarangUuidForFifo(
            allMastersForFifo,
            item.barang,
          );
          if (!resolved.ok) {
            continue;
          }
          fifoTotals.set(
            resolved.masterUuid,
            (fifoTotals.get(resolved.masterUuid) ?? 0) + item.qtyDipakai,
          );
        }

        const tanggalAlloc = (
          (patch.tanggal as string) ||
          (existing.tanggal as string) ||
          ""
        ).slice(0, 10);

        for (const [masterId, qty] of fifoTotals) {
          if (qty <= 0) continue;
          const namaLabel =
            allMastersForFifo.find(
              (m) => normalizeMasterBarangUuid(m.id) === masterId,
            )?.nama ?? masterId;

          const ensure = await ensureInventarisForPemakaianFifo(supabase, {
            masterBarangId: masterId,
            lokasi: LOKASI_FIFO,
            qtyNeeded: qty,
          });
          if (!ensure.ok) {
            console.error(
              "[PATCH pemakaian-orders] FIFO ensure dilewati:",
              id,
              namaLabel,
              ensure.message,
            );
            continue;
          }
          if (ensure.toppedUp > 0) {
            console.warn(
              `[PATCH pemakaian-orders ${id}] Inventaris ${LOKASI_FIFO} +${ensure.toppedUp} otomatis untuk "${namaLabel}" (master ${masterId})`,
            );
          }

          const { error: allocErr } = await rpcAllocatePemakaianFifo(supabase, {
            p_master_barang_id: masterId,
            p_jumlah: qty,
            p_lokasi: LOKASI_FIFO,
            p_tindakan_id_text: tindakanIdTextParamForAllocateFifo(
              existing.tindakan_id,
            ),
            p_order_id: id,
            p_tanggal: tanggalAlloc || undefined,
            p_keterangan: `Update dari order ${id} (${body.pasien || existing.pasien})`,
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
              "[PATCH pemakaian-orders] FIFO gagal (simpan tetap dilanjutkan)",
              id,
              "| supabase host:",
              supHost,
              "| tindakan_id order:",
              existing.tindakan_id ?? "(null)",
              "| barang:",
              namaLabel,
              "| error:",
              allocErr,
            );
            continue;
          }
        }
      }
    } catch (e) {
      console.error("[PatchOrder] Gagal re-allocate stock:", e);
    }
  }

  const { data: updated, error: upErr } = await supabase
    .from("cathlab_pemakaian_order")
    .update(patch)
    .eq("id", id)
    .select("id, status, items")
    .single();

  if (upErr) {
    return NextResponse.json(
      { ok: false, message: upErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, order: updated });
}

/** DELETE /api/pemakaian-orders/[id] — hapus order (id teks, mis. ORD-001). */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { id: raw } = await params;
  const id = decodeURIComponent(raw ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID order tidak valid." },
      { status: 400 },
    );
  }

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

  // REVERSE ALLOCATIONS before deleting the order
  try {
    await supabase.rpc("reverse_pemakaian_order_allocations", {
      p_order_id: id,
    });
  } catch (e) {
    console.warn("[DeleteOrder] Gagal reverse allocations (mungkin sudah kosong):", e);
  }

  const { data, error } = await supabase
    .from("cathlab_pemakaian_order")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const deleted = Array.isArray(data) ? data.length : 0;
  if (deleted === 0) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, id });
}
