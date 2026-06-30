import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { mapFromSupabase } from "@/app/dashboard/pasien/data/pasienSchema";

export const dynamic = "force-dynamic";

/*───────────────────────────────────────────────
 📡 GET /api/pasien
 ───────────────────────────────────────────────*/
const POSTGREST_SAFE_CHUNK = 1000;

/** Cache pasien compact di memori server (2 menit) */
let pasienCompactCache: any[] | null = null;
let pasienCompactCacheExpires = 0;

async function fetchTableOrderedInChunks(
  supabase: any,
  columns: string,
  maxRows: number
): Promise<{ data: any[]; error: any | null }> {
  // 1. Cek validitas proyeksi pada chunk pertama (Fast Fail)
  const firstRes = await supabase
    .from("pasien")
    .select(columns)
    .order("created_at", { ascending: false })
    .range(0, POSTGREST_SAFE_CHUNK - 1);

  if (firstRes.error) {
    return { data: [], error: firstRes.error };
  }

  const firstBatch = Array.isArray(firstRes.data) ? firstRes.data : [];
  if (firstBatch.length === 0 || maxRows <= POSTGREST_SAFE_CHUNK) {
    return { data: firstBatch.slice(0, maxRows), error: null };
  }

  // 2. Jika valid dan data banyak, ambil sisanya secara paralel
  const numChunks = Math.ceil(maxRows / POSTGREST_SAFE_CHUNK);
  const ranges = Array.from({ length: numChunks - 1 }, (_, i) => {
    const from = (i + 1) * POSTGREST_SAFE_CHUNK;
    const to = from + POSTGREST_SAFE_CHUNK - 1;
    return { from, to };
  });

  const results = await Promise.all(
    ranges.map(({ from, to }) =>
      supabase
        .from("pasien")
        .select(columns)
        .order("created_at", { ascending: false })
        .range(from, to)
    )
  );

  const out: any[] = [...firstBatch];
  for (const res of results) {
    if (res.error) break;
    const batch = Array.isArray(res.data) ? res.data : [];
    if (batch.length === 0) break;
    out.push(...batch);
    if (out.length >= maxRows) break;
  }

  return { data: out.slice(0, maxRows), error: null };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const compact =
      searchParams.get("compact") === "1" ||
      searchParams.get("lite") === "1";
    const noRm =
      searchParams.get("noRm")?.trim() ??
      searchParams.get("no_rm")?.trim() ??
      "";
    const namaLookup = searchParams.get("nama")?.trim() ?? "";
    const limitRaw = Number(searchParams.get("limit") ?? "");
    const force = searchParams.get("force") === "1";

    const user = await requireUser();
    if (!user.ok) return user.response;

    // Jika compact dan tidak ada filter spesifik, gunakan cache (default limit 500)
    const now = Date.now();
    const effectiveLimit = limitRaw || (compact ? 500 : 0);
    if (!force && compact && !noRm && !namaLookup && effectiveLimit === 500 && pasienCompactCache && now < pasienCompactCacheExpires) {
      return NextResponse.json({ ok: true, data: pasienCompactCache, cached: true }, { status: 200 });
    }

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

    const defaultLimit = compact ? 500 : 0;
    const limit =
      Number.isFinite(limitRaw) && limitRaw > 0
        ? Math.min(Math.trunc(limitRaw), 5000)
        : defaultLimit > 0
          ? defaultLimit
          : 0;

    const isClinicalStaff = ["admin", "administrator", "superadmin", "perawat", "dokter"].includes(user.role);

    // List kolom aman untuk mencegah kebocoran data sensitif (PII) dari tabel pasien
    const SAFE_PASIEN_COLUMNS = new Set([
      "id", "nama", "no_rm", "jenis_kelamin", "jk", "created_at", "updated_at", 
      "jenis_pembiayaan", "kelas_perawatan", "tgl_lahir", "tanggal_lahir",
      "asuransi", "dokter", "pci_report_link", "diagnosa", "faktor_risiko", 
      "severity_level", "hasil_lab_ppm", "temuan_pembuluh", "kesimpulan_laporan", 
      "plan_medis", "total_kontras", "air_kerma", "dap_dose"
    ]);
    
    // Tambahkan alamat & kontak jika staf klinis
    if (isClinicalStaff) {
      SAFE_PASIEN_COLUMNS.add("alamat");
      SAFE_PASIEN_COLUMNS.add("no_telp");
      SAFE_PASIEN_COLUMNS.add("no_hp");
      SAFE_PASIEN_COLUMNS.add("kontak");
    }

    const { data: rawData, error } = await fetchTableOrderedInChunks(
      supabase,
      "*",
      limit || (compact ? 500 : 1500),
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? "Gagal mengambil data pasien" },
        { status: 500 }
      );
    }

    // Filter data di tingkat aplikasi (Application-level Security)
    const filteredData = (rawData ?? []).map((row: any) => {
      const filteredRow: Record<string, any> = {};
      for (const key in row) {
        if (SAFE_PASIEN_COLUMNS.has(key)) {
          filteredRow[key] = row[key];
        }
      }
      return filteredRow;
    });

    // Update cache jika ini adalah request compact default
    if (compact && !noRm && !namaLookup && !limitRaw) {
      pasienCompactCache = filteredData;
      pasienCompactCacheExpires = Date.now() + 180 * 1000; // 3 menit
    }

    return NextResponse.json({ ok: true, data: filteredData }, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ Gagal mengambil pasien:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan server saat mengambil pasien" },
      { status: 500 }
    );
  }
}

