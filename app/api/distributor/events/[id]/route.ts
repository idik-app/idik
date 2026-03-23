import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";
import { parseDistributorEventPayload } from "@/lib/distributorReturSnapshot";
import { isReturFisikStatus } from "@/lib/distributorReturFisik";

/** PATCH: perbarui status retur fisik dan/atau nota pengiriman untuk KATALOG_RETUR. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const idAuth = await getDistributorIdentity();
  if (!idAuth.ok) {
    const status = idAuth.reason === "forbidden" ? 403 : 401;
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status });
  }

  const { id: idParam } = await params;
  const eventId = String(idParam ?? "").trim();
  if (!eventId) {
    return NextResponse.json({ ok: false, message: "Invalid id" }, { status: 400 });
  }

  let body: {
    retur_fisik_status?: string | null;
    nota_pengiriman?: string | null;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const hasStatus = Object.prototype.hasOwnProperty.call(body, "retur_fisik_status");
  const hasNota = Object.prototype.hasOwnProperty.call(body, "nota_pengiriman");
  if (!hasStatus && !hasNota) {
    return NextResponse.json(
      { ok: false, message: "Sertakan retur_fisik_status dan/atau nota_pengiriman" },
      { status: 400 },
    );
  }

  let nextStatus: string | null | undefined;
  if (hasStatus) {
    const raw = body.retur_fisik_status;
    if (raw === null || raw === "") {
      nextStatus = null;
    } else if (typeof raw === "string" && isReturFisikStatus(raw.trim())) {
      nextStatus = raw.trim();
    } else {
      return NextResponse.json(
        { ok: false, message: "retur_fisik_status tidak valid" },
        { status: 400 },
      );
    }
  }

  let nextNota: string | null | undefined;
  if (hasNota) {
    const raw = body.nota_pengiriman;
    if (raw === null || raw === "") {
      nextNota = null;
    } else if (typeof raw === "string") {
      nextNota = raw.trim().slice(0, 120) || null;
    } else {
      return NextResponse.json(
        { ok: false, message: "nota_pengiriman tidak valid" },
        { status: 400 },
      );
    }
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

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const scope = idAuth.isAdminView
    ? distributorIdParam || null
    : idAuth.distributorId ?? null;

  if (idAuth.isAdminView && !scope) {
    return NextResponse.json(
      { ok: false, message: "Admin: set distributor_id (URL)" },
      { status: 400 },
    );
  }
  if (!scope) {
    return NextResponse.json(
      { ok: false, message: "distributor tidak dikenal" },
      { status: 400 },
    );
  }

  const { data: row, error: fetchErr } = await supabase
    .from("distributor_event_log")
    .select("id, distributor_id, event_type, payload")
    .eq("id", eventId)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ ok: false, message: fetchErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ ok: false, message: "Peristiwa tidak ditemukan" }, { status: 404 });
  }

  if (String(row.distributor_id) !== String(scope)) {
    return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
  }

  if (row.event_type !== "KATALOG_RETUR") {
    return NextResponse.json(
      { ok: false, message: "Hanya retur katalog yang dapat diperbarui" },
      { status: 400 },
    );
  }

  const payload = parseDistributorEventPayload(row.payload);
  const mergedPayload = {
    ...payload,
    ...(hasStatus && nextStatus !== undefined
      ? { retur_fisik_status: nextStatus }
      : {}),
    ...(hasNota && nextNota !== undefined ? { nota_pengiriman: nextNota } : {}),
  };

  const updateRow: Record<string, unknown> = {
    payload: mergedPayload as never,
  };
  if (hasStatus && nextStatus !== undefined) {
    updateRow.retur_fisik_status = nextStatus;
  }
  if (hasNota && nextNota !== undefined) {
    updateRow.nota_pengiriman = nextNota;
  }

  const { error: upErr } = await supabase
    .from("distributor_event_log")
    .update(updateRow as never)
    .eq("id", eventId);

  if (upErr) {
    return NextResponse.json({ ok: false, message: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
