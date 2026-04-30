import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { requireUnitAccess } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

const querySchema = z.object({
  roomSlug: z.string().min(1),
  year: z.coerce.number().int().min(2000).max(2100),
});

/** GET json rekapitulasi ICCU per tahun — RPC `iccu_rekap_year_payload`. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      roomSlug: searchParams.get("roomSlug") ?? undefined,
      year: searchParams.get("year") ?? undefined,
    });
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const { roomSlug, year } = parsed.data;
    const auth = await requireUnitAccess(roomSlug.trim());
    if (!auth.ok) return auth.response;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Server tidak dikonfigurasi (Supabase service role)." },
        { status: 503 },
      );
    }

    const { data: row, error: ruErr } = await supabase
      .from("ruangan")
      .select("id")
      .eq("slug", roomSlug.trim().toLowerCase())
      .maybeSingle();

    if (ruErr || !row?.id) {
      return NextResponse.json({ ok: false, error: "Ruangan tidak ditemukan" }, { status: 404 });
    }

    const ruanganId = row.id as string;

    const { data: rpcData, error: rpcErr } = await supabase.rpc("iccu_rekap_year_payload", {
      p_ruangan_id: ruanganId,
      p_year: year,
    });

    if (rpcErr) {
      return NextResponse.json(
        { ok: false, error: rpcErr.message ?? "RPC iccu_rekap_year_payload gagal" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: rpcData });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
