import { NextResponse } from "next/server";
import { format, parseISO } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";

export const dynamic = "force-dynamic";

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
  distributor?: string;
  qtyRencana?: number;
  qtyDipakai?: number;
  tipe?: string;
  lot?: string;
  ukuran?: string;
  ed?: string;
  harga?: number;
};

type NormalizedLine = {
  lineId: string;
  barang: string;
  distributor?: string;
  qtyRencana: number;
  qtyDipakai: number;
  tipe: "BARU" | "REUSE";
  lot?: string;
  ukuran?: string;
  ed?: string;
  harga?: number;
};

function normalizeItems(rawItems: unknown):
  | { ok: true; items: NormalizedLine[] }
  | { ok: false; message: string } {
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
    return { ok: false, message: "Minimal satu baris barang dengan nama terisi." };
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

/** PATCH /api/pemakaian-orders/[id] — perbarui order (status, barang, header, dll.). */
export async function PATCH(req: Request, { params }: Params) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const { id: raw } = await params;
  const id = decodeURIComponent(raw ?? "").trim();
  if (!id) {
    return NextResponse.json(
      { ok: false, message: "ID order tidak valid." },
      { status: 400 }
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

  const { data: existing, error: fetchErr } = await supabase
    .from("cathlab_pemakaian_order")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json(
      { ok: false, message: fetchErr.message },
      { status: 500 }
    );
  }
  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 }
    );
  }

  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    const st = String(body.status ?? "").trim();
    if (!ALLOWED_STATUS.has(st)) {
      return NextResponse.json(
        { ok: false, message: "Status tidak valid." },
        { status: 400 }
      );
    }
    patch.status = st;
  }

  if (body.tanggal !== undefined) {
    const t = normalizeTanggal(String(body.tanggal ?? ""));
    if (!t) {
      return NextResponse.json(
        { ok: false, message: "Tanggal & jam tidak boleh kosong." },
        { status: 400 }
      );
    }
    patch.tanggal = t;
  }

  if (body.pasien !== undefined) {
    patch.pasien = String(body.pasien ?? "").trim();
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

  if (body.mode !== undefined) {
    const m = body.mode === "RESEP" || body.mode === "PEMAKAIAN" ? body.mode : null;
    if (!m) {
      return NextResponse.json(
        { ok: false, message: "Mode harus RESEP atau PEMAKAIAN." },
        { status: 400 }
      );
    }
    patch.mode = m;
  }

  if (body.catatan !== undefined) {
    const c = body.catatan;
    patch.catatan =
      typeof c === "string" && c.trim() ? c.trim() : null;
  }

  if (body.items !== undefined) {
    const n = normalizeItems(body.items);
    if (!n.ok) {
      return NextResponse.json({ ok: false, message: n.message }, { status: 400 });
    }
    patch.items = n.items;
  }

  if (body.templateInputBarang !== undefined) {
    patch.template_input_barang = normalizeTemplateInputBarang(
      body.templateInputBarang,
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, message: "Tidak ada field yang diperbarui." },
      { status: 400 }
    );
  }

  const { data: updated, error: upErr } = await supabase
    .from("cathlab_pemakaian_order")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json(
      { ok: false, message: upErr.message },
      { status: 500 }
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
      { status: 400 }
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
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("cathlab_pemakaian_order")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  const deleted = Array.isArray(data) ? data.length : 0;
  if (deleted === 0) {
    return NextResponse.json(
      { ok: false, message: "Order tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, id });
}
