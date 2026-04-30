import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { requireUnitAccess } from "@/lib/auth/guards";
import {
  ICCU_WIREFRAME_REKAP_DEMO_KETERANGAN,
} from "@/lib/iccu-register/constants";
import { iccuRegisterCreateSchema } from "@/lib/iccu-register/validation";
import { mapFromSupabase, toPgDateFromForm } from "@/app/dashboard/pasien/data/pasienSchema";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";

export const dynamic = "force-dynamic";

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

async function gateRoom(roomSlug: string | null) {
  const slug = roomSlug?.trim();
  if (!slug) {
    return { ok: false as const, response: badRequest("roomSlug wajib (query)") };
  }
  const auth = await requireUnitAccess(slug);
  if (!auth.ok) return { ok: false as const, response: auth.response };

  const supabase = getServiceSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "Server tidak dikonfigurasi (Supabase service role)." },
        { status: 503 },
      ),
    };
  }

  const { data: row, error } = await supabase
    .from("ruangan")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !row?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "Ruangan tidak ditemukan" }, { status: 404 }),
    };
  }

  return { ok: true as const, ruanganId: row.id as string, roomSlug: slug, supabase };
}

/**
 * Tindakan terbaru per `pasien_id` pada unit ini (ruangan memuat slug), agar UI intensif
 * (flow sheet) tetap memakai `tindakanId` selaras pendaftaran ICCU.
 */
async function withLatestTindakanIds(
  supabase: NonNullable<ReturnType<typeof getServiceSupabaseAdmin>>,
  roomSlug: string,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (rows.length === 0) return rows;

  const pasienIds: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const p = r.pasien_id;
    if (p == null || p === "") continue;
    const s = String(p);
    if (seen.has(s)) continue;
    seen.add(s);
    pasienIds.push(s);
  }
  if (pasienIds.length === 0) {
    return rows.map((r) => ({ ...r, latest_tindakan_id: null }));
  }

  const { data: trows, error } = await supabase
    .from("tindakan")
    .select("id, pasien_id, tanggal")
    .in("pasien_id", pasienIds)
    .ilike("ruangan", `%${roomSlug}%`)
    .order("tanggal", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (error || !trows?.length) {
    return rows.map((r) => ({ ...r, latest_tindakan_id: null }));
  }

  const firstByPasien = new Map<string, string>();
  for (const t of trows) {
    const o = t as { id?: unknown; pasien_id?: unknown };
    const pid = o.pasien_id != null ? String(o.pasien_id) : "";
    if (!pid || firstByPasien.has(pid)) continue;
    firstByPasien.set(pid, String(o.id ?? ""));
  }

  return rows.map((r) => {
    const pid = r.pasien_id != null ? String(r.pasien_id) : "";
    const tid = pid ? firstByPasien.get(pid) ?? null : null;
    return { ...r, latest_tindakan_id: tid };
  });
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(25),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  /** Cari nama, RM, telp, alamat, diagnosa (ilike) */
  q: z.string().max(200).optional(),
  /** active = REGISTER (default); archived = HISTORY PASIEN */
  listStatus: z.enum(["active", "archived"]).default("active"),
  /** Sertakan baris seed wireframe rekapitulasi di daftar (default: tidak). */
  includeWireframeSeed: z
    .string()
    .optional()
    .transform((v) => {
      const t = String(v ?? "")
        .trim()
        .toLowerCase();
      return t === "1" || t === "true" || t === "yes";
    }),
});

/** GET: daftar registrasi ICCU untuk satu unit */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("roomSlug");
    const gate = await gateRoom(roomSlug);
    if (!gate.ok) return gate.response;

    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      listStatus: searchParams.get("listStatus") ?? undefined,
      includeWireframeSeed: searchParams.get("includeWireframeSeed") ?? "",
    });
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const {
      page,
      pageSize,
      dateFrom,
      dateTo,
      q: searchQ,
      listStatus,
      includeWireframeSeed,
    } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = gate.supabase
      .from("iccu_register_entry")
      .select(
        `
        *,
        dpjp:doctor!iccu_register_entry_dokter_dpjp_id_fkey(nama_dokter)
      `,
        { count: "exact" },
      )
      .eq("ruangan_id", gate.ruanganId)
      .order("created_at", { ascending: false });

    if (listStatus === "active") {
      q = q.is("archived_at", null);
    } else {
      q = q.not("archived_at", "is", null);
    }

    if (!includeWireframeSeed) {
      const mark = ICCU_WIREFRAME_REKAP_DEMO_KETERANGAN;
      q = q.or(`keterangan.is.null,keterangan.neq.${mark}`);
    }

    if (dateFrom) {
      q = q.gte("created_at", `${dateFrom}T00:00:00.000Z`);
    }
    if (dateTo) {
      q = q.lte("created_at", `${dateTo}T23:59:59.999Z`);
    }

    const rawQ = searchQ?.trim();
    if (rawQ) {
      const safe = rawQ.replace(/%/g, "").replace(/,/g, " ").trim();
      if (safe) {
        const pattern = `%${safe}%`;
        q = q.or(
          `nama.ilike.${pattern},no_rm.ilike.${pattern},no_telp.ilike.${pattern},alamat.ilike.${pattern},diagnosa.ilike.${pattern},bed.ilike.${pattern}`,
        );
      }
    }

    const { data, error, count } = await q.range(from, to);

    if (error) {
      let fq = gate.supabase
        .from("iccu_register_entry")
        .select("*", { count: "exact" })
        .eq("ruangan_id", gate.ruanganId)
        .order("created_at", { ascending: false });
      if (listStatus === "active") {
        fq = fq.is("archived_at", null);
      } else {
        fq = fq.not("archived_at", "is", null);
      }
      if (!includeWireframeSeed) {
        const mark = ICCU_WIREFRAME_REKAP_DEMO_KETERANGAN;
        fq = fq.or(`keterangan.is.null,keterangan.neq.${mark}`);
      }
      const { data: fallback, error: err2, count: c2 } = await fq.range(
        from,
        to,
      );

      if (err2) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const fallbackRows = (fallback ?? []) as Record<string, unknown>[];
      const withTid = await withLatestTindakanIds(
        gate.supabase,
        gate.roomSlug,
        fallbackRows,
      );

      return NextResponse.json({
        ok: true,
        data: withTid,
        total: c2 ?? 0,
        page,
        pageSize,
      });
    }

    const rows = (data ?? []).map((r: Record<string, unknown>) => {
      const dpjp = r.dpjp as { nama_dokter?: string | null } | null;
      const { dpjp: _d, ...rest } = r;
      return {
        ...rest,
        dokter_dpjp_nama: dpjp?.nama_dokter ?? null,
      };
    });

    const rowsWithTid = await withLatestTindakanIds(
      gate.supabase,
      gate.roomSlug,
      rows,
    );

    return NextResponse.json({
      ok: true,
      data: rowsWithTid,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}

/** POST: buat baris registrasi dari master pasien (dual-write setelah Tambah Pasien) */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomSlug = searchParams.get("roomSlug");
    const gate = await gateRoom(roomSlug);
    if (!gate.ok) return gate.response;

    const body = await request.json();
    const parsed = iccuRegisterCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { pasien_id } = parsed.data;

    const { data: existingRow, error: exErr } = await gate.supabase
      .from("iccu_register_entry")
      .select("*")
      .eq("ruangan_id", gate.ruanganId)
      .eq("pasien_id", pasien_id)
      .is("archived_at", null)
      .maybeSingle();

    if (exErr) {
      return NextResponse.json({ ok: false, error: exErr.message }, { status: 500 });
    }
    if (existingRow) {
      return NextResponse.json({
        ok: true,
        data: existingRow,
        alreadyRegistered: true,
      });
    }

    const { data: p, error: pe } = await gate.supabase
      .from("pasien")
      .select("*")
      .eq("id", pasien_id)
      .maybeSingle();

    if (pe) {
      return NextResponse.json({ ok: false, error: pe.message }, { status: 500 });
    }
    if (!p) {
      return NextResponse.json({ ok: false, error: "Pasien tidak ditemukan" }, { status: 404 });
    }

    const mapped = mapFromSupabase(p);
    const umur = hitungUsia(mapped.tanggalLahir).teks;
    const tgl = toPgDateFromForm(mapped.tanggalLahir);

    const insertPayload = {
      ruangan_id: gate.ruanganId,
      pasien_id,
      nama: mapped.nama || null,
      no_rm: mapped.noRM || null,
      no_telp: mapped.noHP || null,
      jenis_kelamin: mapped.jenisKelamin === "P" ? "P" : "L",
      tanggal_lahir: tgl,
      alamat: mapped.alamat || null,
      umur_tampilan: umur,
      jenis_pembiayaan: mapped.jenisPembiayaan || null,
      invasive_procedures: [],
    };

    const { data: inserted, error: insErr } = await gate.supabase
      .from("iccu_register_entry")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: inserted });
  } catch {
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
