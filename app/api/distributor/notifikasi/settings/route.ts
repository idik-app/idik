import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDistributorIdentity } from "@/lib/auth/distributor";

export async function GET(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();

  const targetDistributorId = id.isAdminView ? distributorIdParam : (id.distributorId ?? "");
  if (id.isAdminView && !targetDistributorId) {
    return NextResponse.json(
      { ok: false, message: "Admin view: parameter distributor_id wajib diisi." },
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

  const { data, error } = await supabase
    .from("distributor_notification_settings")
    .select("*")
    .eq("distributor_id", targetDistributorId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      data:
        data ??
        ({
          distributor_id: targetDistributorId,
          email_recipients: [],
          realtime_enabled: true,
          realtime_aggregate_minutes: 10,
          low_stock_enabled: true,
          daily_digest_enabled: true,
          daily_digest_time: "18:00",
          weekly_digest_enabled: true,
          weekly_digest_day: 1,
          weekly_digest_time: "08:00",
        } as any),
    },
    { status: 200 }
  );
}

export async function PUT(req: Request) {
  const id = await getDistributorIdentity();
  if (!id.ok) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const distributorIdParam = (searchParams.get("distributor_id") ?? "").trim();
  const targetDistributorId = id.isAdminView ? distributorIdParam : (id.distributorId ?? "");
  if (id.isAdminView && !targetDistributorId) {
    return NextResponse.json(
      { ok: false, message: "Admin view: parameter distributor_id wajib diisi." },
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const payload = {
    distributor_id: targetDistributorId,
    updated_at: new Date().toISOString(),
    email_recipients: Array.isArray(body.email_recipients) ? body.email_recipients : [],
    realtime_enabled: Boolean(body.realtime_enabled),
    realtime_aggregate_minutes: Number(body.realtime_aggregate_minutes ?? 10),
    low_stock_enabled: Boolean(body.low_stock_enabled),
    daily_digest_enabled: Boolean(body.daily_digest_enabled),
    daily_digest_time: String(body.daily_digest_time ?? "18:00"),
    weekly_digest_enabled: Boolean(body.weekly_digest_enabled),
    weekly_digest_day: Number(body.weekly_digest_day ?? 1),
    weekly_digest_time: String(body.weekly_digest_time ?? "08:00"),
  };

  const { error } = await supabase
    .from("distributor_notification_settings")
    .upsert(payload, { onConflict: "distributor_id" });

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true }, { status: 200 });
}

