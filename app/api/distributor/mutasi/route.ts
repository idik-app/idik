import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import {
  DISTRIBUTOR_MUTASI_INPUT_TIPE,
  type InventarisStokMutasiTipe,
} from "@/lib/inventarisMutasi";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

function parseDistributorScope(
  id: Awaited<ReturnType<typeof getDistributorIdentity>>,
  distributorIdParam: string
) {
  if (!id.ok) return null;
  if (id.isAdminView) return distributorIdParam || null;
  return id.distributorId ?? null;
}

/** GET: riwayat mutasi untuk inventaris milik distributor (filter master_barang atau satu inventaris). */
export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const masterBarangId = (searchParams.get("master_barang_id") ?? "").trim();
  const inventarisId = (searchParams.get("inventaris_id") ?? "").trim();
  const recentAll = searchParams.get("recent_all") === "1";
  const limit = Math.min(
    200,
    Math.max(1, Number(searchParams.get("limit") ?? "80") || 80)
  );

  const scope = parseDistributorScope(id, distributorIdParam);
  if (id.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: isi distributor_id untuk melihat mutasi." },
      { status: 400 }
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  /** Semua mutasi Cathlab untuk distributor (GET agregat; UI riwayat utama di /distributor/riwayat). */
  if (recentAll) {
    if (!scope) {
      return NextResponse.json(
        { ok: false, message: "Scope distributor tidak tersedia." },
        { status: 400 }
      );
    }

    const embedRes = await supabase
      .from("inventaris_stok_mutasi")
      .select(
        `
        id,
        created_at,
        inventaris_id,
        tipe,
        qty_delta,
        stok_setelah,
        ref_type,
        ref_id,
        keterangan,
        actor,
        inventaris!inner (
          nama,
          master_barang_id,
          distributor_id,
          lokasi
        )
      `
      )
      .eq("inventaris.lokasi", "Cathlab")
      .eq("inventaris.distributor_id", scope)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!embedRes.error) {
      return NextResponse.json(
        { ok: true, data: embedRes.data ?? [] },
        { status: 200 }
      );
    }

    // Fallback: tanpa embed (relasi / versi PostgREST beda) — dua query.
    const { data: invRows, error: invErr } = await supabase
      .from("inventaris")
      .select("id, nama, master_barang_id, distributor_id, lokasi")
      .eq("lokasi", "Cathlab")
      .eq("distributor_id", scope);

    if (invErr) {
      return NextResponse.json(
        { ok: false, message: invErr.message },
        { status: 500 }
      );
    }

    const invList = invRows ?? [];
    const ids = invList.map((r: { id: string }) => String(r.id));
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }

    const meta = new Map<
      string,
      {
        nama: string | null;
        master_barang_id: string | null;
        distributor_id: string | null;
        lokasi: string | null;
      }
    >();
    for (const r of invList as any[]) {
      meta.set(String(r.id), {
        nama: r.nama ?? null,
        master_barang_id: r.master_barang_id ?? null,
        distributor_id: r.distributor_id ?? null,
        lokasi: r.lokasi ?? null,
      });
    }

    const { data: mutRows, error: mutErr } = await supabase
      .from("inventaris_stok_mutasi")
      .select(
        "id, created_at, inventaris_id, tipe, qty_delta, stok_setelah, ref_type, ref_id, keterangan, actor"
      )
      .in("inventaris_id", ids)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (mutErr) {
      return NextResponse.json(
        { ok: false, message: mutErr.message },
        { status: 500 }
      );
    }

    const merged = (mutRows ?? []).map((m: any) => ({
      ...m,
      inventaris: meta.get(String(m.inventaris_id)) ?? {
        nama: null,
        master_barang_id: null,
        distributor_id: scope,
        lokasi: "Cathlab",
      },
    }));

    return NextResponse.json({ ok: true, data: merged }, { status: 200 });
  }

  let invIds: string[] = [];

  if (inventarisId) {
    const { data: row, error } = await supabase
      .from("inventaris")
      .select("id, distributor_id, lokasi")
      .eq("id", inventarisId)
      .maybeSingle();
    if (error)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    if (!row || String(row.lokasi) !== "Cathlab") {
      return NextResponse.json({ ok: true, data: [] }, { status: 200 });
    }
    if (!scope || String(row.distributor_id) !== scope) {
      return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
    }
    invIds = [inventarisId];
  } else if (masterBarangId) {
    let q = supabase
      .from("inventaris")
      .select("id")
      .eq("lokasi", "Cathlab")
      .eq("master_barang_id", masterBarangId);
    if (scope) q = q.eq("distributor_id", scope);
    const { data: rows, error } = await q;
    if (error)
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 }
      );
    invIds = (rows ?? []).map((r: { id: string }) => String(r.id));
  } else {
    return NextResponse.json(
      {
        ok: false,
        message: "Parameter wajib: inventaris_id atau master_barang_id",
      },
      { status: 400 }
    );
  }

  if (invIds.length === 0) {
    return NextResponse.json({ ok: true, data: [] }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("inventaris_stok_mutasi")
    .select(
      "id, created_at, inventaris_id, tipe, qty_delta, stok_setelah, ref_type, ref_id, keterangan, actor"
    )
    .in("inventaris_id", invIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}

/** POST: catat mutasi (distributor / admin dengan scope distributor). */
export async function POST(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) {
    const status = id.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "JSON tidak valid" },
      { status: 400 }
    );
  }

  const distributorIdBody = String(body.distributor_id ?? "").trim();
  const scope = id.isAdminView
    ? distributorIdParam || distributorIdBody || null
    : id.distributorId ?? null;

  if (id.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: set distributor_id (URL atau body)." },
      { status: 400 }
    );
  }

  const inventarisId = String(body.inventaris_id ?? "").trim();
  const tipe = String(body.tipe ?? "").trim() as InventarisStokMutasiTipe;
  const keterangan = body.keterangan != null ? String(body.keterangan).trim() : null;

  if (!inventarisId) {
    return NextResponse.json(
      { ok: false, message: "inventaris_id wajib" },
      { status: 400 }
    );
  }

  if (
    !DISTRIBUTOR_MUTASI_INPUT_TIPE.includes(
      tipe as (typeof DISTRIBUTOR_MUTASI_INPUT_TIPE)[number]
    )
  ) {
    return NextResponse.json(
      { ok: false, message: "Tipe mutasi tidak diizinkan untuk input manual." },
      { status: 400 }
    );
  }

  const jumlah = Number(body.jumlah);
  if (!Number.isFinite(jumlah) || jumlah <= 0) {
    return NextResponse.json(
      { ok: false, message: "jumlah harus angka > 0" },
      { status: 400 }
    );
  }

  let qtyDelta: number;
  if (tipe === "MASUK") {
    qtyDelta = jumlah;
  } else if (tipe === "KOREKSI") {
    const arah = String(body.koreksi_arah ?? "").toLowerCase();
    if (arah === "plus" || arah === "+") qtyDelta = jumlah;
    else if (arah === "minus" || arah === "-") qtyDelta = -jumlah;
    else {
      return NextResponse.json(
        {
          ok: false,
          message: "KOREKSI: set koreksi_arah ke 'plus' atau 'minus'",
        },
        { status: 400 }
      );
    }
  } else {
    qtyDelta = -jumlah;
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase admin env not configured" },
      { status: 503 }
    );
  }

  const { data: invRow, error: invErr } = await supabase
    .from("inventaris")
    .select("id, distributor_id, lokasi")
    .eq("id", inventarisId)
    .maybeSingle();

  if (invErr)
    return NextResponse.json(
      { ok: false, message: invErr.message },
      { status: 500 }
    );
  if (!invRow || String(invRow.lokasi) !== "Cathlab") {
    return NextResponse.json(
      { ok: false, message: "Inventaris tidak ditemukan atau bukan Cathlab" },
      { status: 404 }
    );
  }
  if (!scope || String(invRow.distributor_id) !== scope) {
    return NextResponse.json(
      { ok: false, message: "Bukan inventaris untuk distributor ini" },
      { status: 403 }
    );
  }

  const actor = id.username;

  const { data: rpcId, error: rpcErr } = await supabase.rpc(
    "apply_inventaris_stok_mutasi",
    {
      p_inventaris_id: inventarisId,
      p_tipe: tipe,
      p_qty_delta: qtyDelta,
      p_ref_type: "manual",
      p_ref_id: null,
      p_keterangan: keterangan || null,
      p_actor: actor,
    }
  );

  if (rpcErr) {
    return NextResponse.json(
      { ok: false, message: rpcErr.message },
      { status: 400 }
    );
  }

  void insertDistributorEvent(supabase, {
    distributorId: scope,
    eventType: "MUTASI_STOK",
    actor,
    payload: {
      inventaris_id: inventarisId,
      tipe,
      jumlah,
      qty_delta: qtyDelta,
      mutasi_id: rpcId ?? null,
      keterangan,
    },
  });

  return NextResponse.json(
    { ok: true, mutasi_id: rpcId ?? null },
    { status: 200 }
  );
}
