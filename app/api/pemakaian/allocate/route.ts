import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guards";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

type ResolveMasterBarangInput = {
  master_barang_id?: string;
  kode?: string;
  barcode?: string;
};

function normalizeNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const auth = await requireRole(["perawat", "admin", "administrator", "superadmin"]);
  if (!auth.ok) return auth.response;

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const tanggalRaw = body?.tanggal ? String(body.tanggal) : null;
  const tindakanId = body?.tindakan_id ? String(body.tindakan_id) : null;
  const keterangan = body?.keterangan ? String(body.keterangan) : null;
  const lokasi = body?.lokasi ? String(body.lokasi) : "Cathlab";

  const jumlah = normalizeNumber(body?.jumlah);
  if (!jumlah || jumlah <= 0) {
    return NextResponse.json({ ok: false, message: "jumlah harus > 0" }, { status: 400 });
  }

  const resolve: ResolveMasterBarangInput = {
    master_barang_id: body?.master_barang_id ? String(body.master_barang_id) : undefined,
    kode: body?.kode ? String(body.kode) : undefined,
    barcode: body?.barcode ? String(body.barcode) : undefined,
  };

  let masterBarangId = (resolve.master_barang_id ?? "").trim();
  if (!masterBarangId) {
    if (resolve.barcode) {
      const { data, error } = await supabase
        .from("master_barang")
        .select("id")
        .eq("barcode", resolve.barcode)
        .maybeSingle();
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      if (!data?.id) return NextResponse.json({ ok: false, message: "barcode tidak ditemukan" }, { status: 404 });
      masterBarangId = data.id;
    } else if (resolve.kode) {
      const { data, error } = await supabase
        .from("master_barang")
        .select("id")
        .eq("kode", resolve.kode)
        .maybeSingle();
      if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
      if (!data?.id) return NextResponse.json({ ok: false, message: "kode tidak ditemukan" }, { status: 404 });
      masterBarangId = data.id;
    } else {
      return NextResponse.json(
        { ok: false, message: "Perlu master_barang_id atau kode atau barcode" },
        { status: 400 }
      );
    }
  }

  let tanggal = undefined as string | undefined;
  if (tanggalRaw) {
    const d = new Date(tanggalRaw);
    if (!Number.isNaN(d.getTime())) tanggal = d.toISOString().slice(0, 10);
  }

  const { data, error } = await supabase.rpc("allocate_pemakaian_fifo", {
    p_master_barang_id: masterBarangId,
    p_jumlah: jumlah,
    p_lokasi: lokasi,
    p_tindakan_id: tindakanId,
    p_keterangan: keterangan,
    // Supabase RPC akan memakai default fungsi jika parameter tidak dikirim.
    p_tanggal: tanggal ?? undefined,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 400 }
    );
  }

  const { data: mbRow } = await supabase
    .from("master_barang")
    .select("distributor_id")
    .eq("id", masterBarangId)
    .maybeSingle();
  const distId = mbRow?.distributor_id;
  if (distId) {
    void insertDistributorEvent(supabase, {
      distributorId: String(distId),
      eventType: "PEMAKAIAN_FIFO",
      actor: auth.userId,
      payload: {
        master_barang_id: masterBarangId,
        jumlah,
        lokasi,
        tanggal: tanggal ?? null,
        tindakan_id: tindakanId,
        keterangan,
        rows: data ?? [],
      },
    });
  }

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}

