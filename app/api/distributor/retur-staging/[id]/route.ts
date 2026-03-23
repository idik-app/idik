import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import {
  reverseReturAllocations,
  type ReturAllocation,
} from "@/lib/returStagingFifo";
import { insertDistributorEvent } from "@/lib/distributorEventLog";

function scopeDistributorId(
  id: Awaited<ReturnType<typeof getDistributorIdentity>>,
  param: string,
) {
  if (!id.ok) return null;
  if (id.isAdminView) return param || null;
  return id.distributorId ?? null;
}

/** PATCH: batal (kembalikan stok) atau ubah status DRAFT ↔ SIAP_RETUR. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: stagingId } = await params;
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  let body: {
    action?: string;
    distributor_id?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "JSON tidak valid" }, { status: 400 });
  }

  const distributorIdParam = String(body.distributor_id ?? "").trim();
  const scope = idAuth.isAdminView
    ? distributorIdParam || null
    : idAuth.distributorId ?? null;

  if (idAuth.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: set distributor_id di body." },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  const action = String(body.action ?? "").trim().toLowerCase();
  if (!["cancel", "set_draft", "set_siap"].includes(action)) {
    return NextResponse.json(
      { ok: false, message: "action: cancel | set_draft | set_siap" },
      { status: 400 },
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

  const { data: row, error: fetchErr } = await supabase
    .from("distributor_retur_staging")
    .select("*")
    .eq("id", stagingId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, message: fetchErr.message }, { status: 500 });
  }
  if (!row || String(row.distributor_id) !== scope) {
    return NextResponse.json({ ok: false, message: "Tidak ditemukan" }, { status: 404 });
  }

  const status = String((row as { status: string }).status);
  const actor = idAuth.username;

  if (action === "cancel") {
    if (status === "DIBATALKAN" || status === "SELESAI") {
      return NextResponse.json(
        { ok: false, message: "Baris ini sudah tidak bisa dibatalkan." },
        { status: 400 },
      );
    }
    const allocations = (row as { allocations: ReturAllocation[] }).allocations ?? [];
    try {
      await reverseReturAllocations(supabase, allocations, actor);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal mengembalikan stok";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }

    const { error: upErr } = await supabase
      .from("distributor_retur_staging")
      .update({
        status: "DIBATALKAN",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", stagingId);

    if (upErr) {
      return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    }

    void insertDistributorEvent(supabase, {
      distributorId: scope,
      eventType: "RETUR_DIBATALKAN",
      actor,
      payload: {
        retur_staging_id: stagingId,
        distributor_barang_id: (row as { distributor_barang_id: string }).distributor_barang_id,
        qty: (row as { qty: number }).qty,
        note: "retur_staging_batal",
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === "set_siap") {
    if (status !== "DRAFT") {
      return NextResponse.json(
        { ok: false, message: "Hanya baris DRAFT yang bisa ditandai siap." },
        { status: 400 },
      );
    }
    const { error: upErr } = await supabase
      .from("distributor_retur_staging")
      .update({
        status: "SIAP_RETUR",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", stagingId);

    if (upErr) {
      return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (action === "set_draft") {
    if (status !== "SIAP_RETUR") {
      return NextResponse.json(
        { ok: false, message: "Hanya baris SIAP_RETUR yang bisa dikembalikan ke draf." },
        { status: 400 },
      );
    }
    const { error: upErr } = await supabase
      .from("distributor_retur_staging")
      .update({
        status: "DRAFT",
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", stagingId);

    if (upErr) {
      return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  return NextResponse.json({ ok: false, message: "Aksi tidak dikenal" }, { status: 400 });
}
