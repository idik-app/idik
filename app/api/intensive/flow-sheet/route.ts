import { NextResponse } from "next/server";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import {
  sanitizeFlowSheetPayload,
  type IntensiveFlowSheetPayload,
} from "@/lib/intensive/flowSheetPayload";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tindakanId = searchParams.get("tindakanId")?.trim();
    const unitSlug = request.headers.get("x-unit-slug");

    if (!tindakanId) {
      return NextResponse.json(
        { ok: false, error: "tindakanId wajib" },
        { status: 400 },
      );
    }

    const { requireUnitAccess, requireRole } = await import("@/lib/auth/guards");
    
    // 1. Verifikasi Akses Unit jika x-unit-slug ada
    if (unitSlug) {
      const unitAuth = await requireUnitAccess(unitSlug);
      if (!unitAuth.ok) return unitAuth.response;
    } else {
      // Fallback ke role check standar jika tidak ada unit slug (backward compatibility)
      const auth = await requireRole(["perawat", "dokter", "admin", "administrator", "superadmin"]);
      if (!auth.ok) return auth.response;
    }

    const supabase = getServiceSupabaseAdmin();
    // ... rest of GET logic remains same, but we could add .eq('ruangan.slug', unitSlug) if schema supports it
    const { data: row, error } = await supabase
      .from("intensive_flow_sheet")
      .select("payload, updated_at")
      .eq("tindakan_id", tindakanId)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, payload: null },
        { status: 500 },
      );
    }

    const payload = row?.payload
      ? sanitizeFlowSheetPayload(row.payload)
      : sanitizeFlowSheetPayload(null);

    return NextResponse.json({
      ok: true,
      payload,
      updated_at: row?.updated_at ?? null,
    });
  } catch (err) {
    console.error("[api/intensive/flow-sheet GET]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const tindakanId = String(body?.tindakanId ?? "").trim();
    const unitSlug = request.headers.get("x-unit-slug");

    if (!tindakanId) {
      return NextResponse.json(
        { ok: false, error: "tindakanId wajib" },
        { status: 400 },
      );
    }

    const rawPayload = body?.payload as IntensiveFlowSheetPayload | undefined;
    const payload = sanitizeFlowSheetPayload(rawPayload ?? { data: {} });

    const { requireUnitAccess, requireRole } = await import("@/lib/auth/guards");
    
    if (unitSlug) {
      const unitAuth = await requireUnitAccess(unitSlug);
      if (!unitAuth.ok) return unitAuth.response;
    } else {
      const auth = await requireRole(["perawat", "dokter", "admin", "administrator", "superadmin"]);
      if (!auth.ok) return auth.response;
    }

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase not configured" },
        { status: 500 },
      );
    }

    const { error } = await supabase.from("intensive_flow_sheet").upsert(
      {
        tindakan_id: tindakanId,
        payload: payload as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
        // Note: unit_id could be added here if we want to store it explicitly
      },
      { onConflict: "tindakan_id" },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/intensive/flow-sheet PUT]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 },
    );
  }
}
