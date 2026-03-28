import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { mapFromSupabase } from "@/app/dashboard/pasien/data/pasienSchema";

export const dynamic = "force-dynamic";

/*───────────────────────────────────────────────
 📡 GET /api/pasien
 - Tanpa query: daftar pasien (array).
 - ?compact=1 atau ?lite=1: kolom ringkas + limit default 15000 (max 20000 via ?limit=).
 - ?noRm= / ?no_rm= : satu pasien by no_rm (object | null) — hydrate drawer tindakan.
 - ?nama= : satu pasien jika nama unik (ilike, case-insensitive exact).
───────────────────────────────────────────────*/
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const noRm =
      searchParams.get("noRm")?.trim() ??
      searchParams.get("no_rm")?.trim() ??
      "";
    const namaLookup = searchParams.get("nama")?.trim() ?? "";

    if (noRm) {
      const { data, error } = await supabase
        .from("pasien")
        .select("*")
        .eq("no_rm", noRm)
        .maybeSingle();

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message ?? "Gagal mencari pasien" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          ok: true,
          data: data ? mapFromSupabase(data) : null,
        },
        { status: 200 }
      );
    }

    if (namaLookup) {
      const { data, error } = await supabase
        .from("pasien")
        .select("*")
        .ilike("nama", namaLookup)
        .limit(2);

      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message ?? "Gagal mencari pasien" },
          { status: 500 }
        );
      }
      const rows = Array.isArray(data) ? data : [];
      const one = rows.length === 1 ? rows[0] : null;
      return NextResponse.json(
        {
          ok: true,
          data: one ? mapFromSupabase(one) : null,
        },
        { status: 200 }
      );
    }

    const compact =
      searchParams.get("compact") === "1" ||
      searchParams.get("lite") === "1";
    const limitRaw = Number(searchParams.get("limit") ?? "");
    const defaultLimit = compact ? 15000 : 0;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.trunc(limitRaw), 20000)
        : defaultLimit > 0
          ? defaultLimit
          : 0;

    const columns = compact
      ? "id,nama,no_rm,jenis_kelamin,jk,created_at"
      : "*";

    let listQuery = supabase
      .from("pasien")
      .select(columns)
      .order("created_at", { ascending: false });

    if (limit > 0) {
      listQuery = listQuery.limit(limit);
    }

    const { data, error } = await listQuery;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal mengambil data pasien" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ Gagal mengambil pasien:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server saat mengambil pasien" },
      { status: 500 }
    );
  }
}

