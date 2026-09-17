import { NextResponse } from "next/server";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get("bulan") ? parseInt(searchParams.get("bulan")!, 10) : null;
    const tahun = searchParams.get("tahun") ? parseInt(searchParams.get("tahun")!, 10) : null;
    const lokasi = searchParams.get("lokasi")?.trim();
    const status = searchParams.get("status")?.trim();
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Supabase Service Admin Not Configured" }, { status: 500 });
    }

    let query = supabase
      .from("stok_opname_sesi")
      .select("*, stok_opname_item(*)", { count: "exact" });

    if (lokasi && lokasi !== "Semua") {
      query = query.eq("lokasi", lokasi);
    }
    if (status && status !== "Semua") {
      query = query.eq("status", status);
    }

    if (bulan && tahun) {
      // Create date range for specified month and year
      const startDate = new Date(Date.UTC(tahun, bulan - 1, 1)).toISOString();
      const endDate = new Date(Date.UTC(tahun, bulan, 0, 23, 59, 59)).toISOString();
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    } else if (tahun) {
      const startDate = new Date(Date.UTC(tahun, 0, 1)).toISOString();
      const endDate = new Date(Date.UTC(tahun, 11, 31, 23, 59, 59)).toISOString();
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }

    if (search) {
      query = query.or(`nomor_sesi.ilike.%${search}%,catatan.ilike.%${search}%,created_by.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/stok-opname]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nomor_sesi, lokasi, jenis_kategori, catatan, items, status, created_by } = body;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: "Supabase Service Admin Not Configured" }, { status: 500 });
    }

    // Auto-generate nomor_sesi jika tidak ada
    const sessionNo =
      nomor_sesi ||
      `SO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const total_sku = Array.isArray(items) ? items.length : 0;
    const total_fisik = Array.isArray(items)
      ? items.reduce((acc: number, it: any) => acc + (Number(it.stok_fisik) || 0), 0)
      : 0;
    const total_selisih = Array.isArray(items)
      ? items.reduce((acc: number, it: any) => acc + (Number(it.selisih) || 0), 0)
      : 0;

    // 1. Insert/Upsert Sesi Opname
    const { data: sesiData, error: sesiErr } = await supabase
      .from("stok_opname_sesi")
      .upsert(
        {
          nomor_sesi: sessionNo,
          lokasi: lokasi || "Cathlab",
          jenis_kategori: jenis_kategori || "Semua",
          status: status || "Draft",
          catatan: catatan || "",
          total_sku,
          total_fisik,
          total_selisih,
          created_by: created_by || "Petugas Gudang",
        },
        { onConflict: "nomor_sesi" }
      )
      .select("id, nomor_sesi")
      .single();

    if (sesiErr || !sesiData) {
      return NextResponse.json({ ok: false, error: sesiErr?.message || "Gagal menyimpan sesi opname" }, { status: 500 });
    }

    const sesiId = sesiData.id;

    // 2. Insert/Replace Items
    if (Array.isArray(items) && items.length > 0) {
      // Hapus item lama dalam sesi ini untuk ganti dengan payload terbaru
      await supabase.from("stok_opname_item").delete().eq("sesi_id", sesiId);

      const itemsPayload = items.map((it: any) => ({
        sesi_id: sesiId,
        barang_id: it.barang_id || null,
        kode_barcode: it.kode_barcode,
        nama_barang: it.nama_barang,
        kategori: it.kategori || "Medis",
        satuan: it.satuan || "Pcs",
        lot_number: it.lot_number || null,
        expired_date: it.expired_date || null,
        stok_sistem: Number(it.stok_sistem) || 0,
        stok_fisik: Number(it.stok_fisik) || 0,
        selisih: (Number(it.stok_fisik) || 0) - (Number(it.stok_sistem) || 0),
        status_ed: it.status_ed || "Aman",
        catatan: it.catatan || "",
        scanned_by_user: created_by || "Petugas Gudang",
      }));

      const { error: itemsErr } = await supabase.from("stok_opname_item").insert(itemsPayload);

      if (itemsErr) {
        return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });
      }
    }

    return NextResponse.json(
      { ok: true, data: { id: sesiId, nomor_sesi: sessionNo }, message: "Sesi stok opname berhasil disimpan ke database" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/stok-opname]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
