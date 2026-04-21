import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { normalizeTemplateInputBarang } from "@/lib/pemakaian/templateInputBarang";

export const dynamic = "force-dynamic";

/** GET — baca katalog global (login wajib). */
export async function GET() {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("farmasi_komponen_katalog_global")
    .select("rows, updated_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  const rows =
    normalizeTemplateInputBarang({ komponenKatalog: data?.rows })
      .komponenKatalog ?? [];

  return NextResponse.json({
    ok: true,
    rows,
    updated_at: data?.updated_at ?? null,
  });
}

/** PUT — simpan seluruh daftar katalog (login wajib). */
export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user.ok) return user.response;

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Server tidak dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }

  const rawRows =
    body &&
    typeof body === "object" &&
    "rows" in (body as Record<string, unknown>)
      ? (body as { rows: unknown }).rows
      : undefined;

  const rows =
    normalizeTemplateInputBarang({ komponenKatalog: rawRows })
      .komponenKatalog ?? [];

  const { error } = await supabase.from("farmasi_komponen_katalog_global").upsert(
    {
      id: 1,
      rows,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, rows });
}
