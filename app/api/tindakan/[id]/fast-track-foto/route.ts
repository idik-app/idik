import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Klien mengompresi ke ≤500 KB; sedikit slack di server. */
const MAX_BYTES = 550 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function parseFotosJson(s: string | null | undefined): string[] {
  if (!s?.trim()) return [];
  try {
    const j = JSON.parse(s) as unknown;
    if (!Array.isArray(j)) return [];
    return j.filter(
      (x): x is string =>
        typeof x === "string" && (x.startsWith("http://") || x.startsWith("https://")),
    );
  } catch {
    return [];
  }
}

/**
 * Unggah satu gambar Fast-Track ke bucket `uploads` dan tambahkan URL ke kolom JSON.
 */
export async function POST(req: Request, ctx: Params) {
  const auth = await requireRole(["perawat", "admin", "administrator", "superadmin"]);
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const tindakanId = typeof id === "string" ? id.trim() : "";
  if (!tindakanId) {
    return NextResponse.json(
      { ok: false, message: "ID tindakan tidak valid." },
      { status: 400 },
    );
  }

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Supabase service role tidak dikonfigurasi." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body form tidak valid." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { ok: false, message: "Field file wajib diisi." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, message: "File terlalu besar (maks. ±550 KB untuk Fast-Track)." },
      { status: 400 },
    );
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Format tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.",
      },
      { status: 400 },
    );
  }

  const rawExt = file.name.split(".").pop()?.replace(/[^\w]/g, "") || "jpg";
  const ext = rawExt.length > 8 ? "jpg" : rawExt;
  const objectPath = `fast_track/${tindakanId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from("uploads")
    .upload(objectPath, buf, {
      contentType: file.type,
      upsert: false,
    });

  if (upErr) {
    console.error("[POST fast-track-foto] storage", upErr);
    const raw = String(upErr.message ?? "");
    const bucketMissing = /bucket not found/i.test(raw);
    return NextResponse.json(
      {
        ok: false,
        message: bucketMissing
          ? "Bucket Storage «uploads» belum ada. Jalankan `npx supabase db push` (migrasi 20260402100000_storage_bucket_uploads.sql) atau buat bucket «uploads» publik di Supabase Dashboard → Storage."
          : raw,
      },
      { status: bucketMissing ? 503 : 500 },
    );
  }

  const { data: pub } = supabase.storage.from("uploads").getPublicUrl(objectPath);
  const publicUrl = pub.publicUrl;

  const { data: row, error: fetchErr } = await supabase
    .from("tindakan")
    .select("fast_track_fotos")
    .eq("id", tindakanId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[POST fast-track-foto] select", fetchErr);
    await supabase.storage.from("uploads").remove([objectPath]);
    return NextResponse.json(
      { ok: false, message: fetchErr.message },
      { status: 500 },
    );
  }
  if (!row) {
    await supabase.storage.from("uploads").remove([objectPath]);
    return NextResponse.json(
      { ok: false, message: "Kasus tindakan tidak ditemukan." },
      { status: 404 },
    );
  }

  const prev = parseFotosJson(
    (row as { fast_track_fotos?: string | null }).fast_track_fotos,
  );
  const next = [...prev, publicUrl];

  const { error: updErr } = await supabase
    .from("tindakan")
    .update({ fast_track_fotos: JSON.stringify(next) })
    .eq("id", tindakanId);

  if (updErr) {
    console.error("[POST fast-track-foto] update", updErr);
    await supabase.storage.from("uploads").remove([objectPath]);
    return NextResponse.json(
      { ok: false, message: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, url: publicUrl, fotos: next });
}
