import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";

export const dynamic = "force-dynamic";

function newOrderId(): string {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${t}-${r}`;
}

type LineIn = {
  lineId?: string;
  barang?: string;
  distributor?: string;
  qtyRencana?: number;
  qtyDipakai?: number;
  tipe?: string;
  lot?: string;
  ukuran?: string;
  ed?: string;
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
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 }
    );
  }

  const pasien = String(body.pasien ?? "").trim();
  const dokter = String(body.dokter ?? "").trim();
  const depo = String(body.depo ?? "").trim();
  const tanggalRaw = String(body.tanggal ?? "").trim();
  const mode =
    body.mode === "RESEP" || body.mode === "PEMAKAIAN" ? body.mode : "PEMAKAIAN";
  const catatan =
    typeof body.catatan === "string" && body.catatan.trim()
      ? body.catatan.trim()
      : null;
  const ruangan =
    typeof body.ruangan === "string" ? body.ruangan.trim() : "";

  if (!pasien || !dokter || !depo) {
    return NextResponse.json(
      {
        ok: false,
        message: "Pasien, dokter, dan depo wajib diisi.",
      },
      { status: 400 }
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
      { status: 400 }
    );
  }

  const rawItems = body.items;
  const items: LineIn[] = Array.isArray(rawItems) ? (rawItems as LineIn[]) : [];
  const normalized = items
    .map((it, i) => {
      const barang = String(it.barang ?? "").trim();
      if (!barang) return null;
      return {
        lineId:
          typeof it.lineId === "string" && it.lineId.trim()
            ? it.lineId.trim()
            : `line-${i + 1}`,
        barang,
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
        tipe: it.tipe === "REUSE" ? "REUSE" : "BARU",
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
      { status: 400 }
    );
  }

  const id = newOrderId();
  const row = {
    id,
    mode,
    tanggal,
    pasien,
    dokter,
    ruangan,
    depo,
    status: "MENUNGGU_VALIDASI" as const,
    items: normalized,
    catatan,
    template_input_barang: normalizeTemplateInputBarang(
      body.templateInputBarang,
    ),
  };

  const { data, error } = await supabase
    .from("cathlab_pemakaian_order")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, order: data }, { status: 201 });
}

/** GET /api/pemakaian-orders — daftar order pemakaian/resep alkes (tabel cathlab_pemakaian_order). */
export async function GET() {
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
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("cathlab_pemakaian_order")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, orders: data ?? [] });
}
