import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth/guards";
import { getServiceSupabaseAdmin } from "@/lib/auth/serviceSupabase";
import { enrichTindakanRowForApi } from "@/lib/tindakan/tindakanDbMap";
import {
  displayRm,
  displayNamaPasien,
} from "@/app/dashboard/layanan/tindakan/lib/displayTindakanRow";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => {
      const n = v == null || v === "" ? 20000 : Number(v);
      if (!Number.isFinite(n)) return 20000;
      return Math.min(Math.max(Math.trunc(n), 1), 20000);
    }),
});

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

// Sinkron minimal: buat master pasien dari baris tindakan yang belum punya `pasien_id`.
// Default/null boleh (jenis kelamin = "L", pembiayaan = "Umum", kelas = "Kelas 2", dll.).
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    if (!user.ok) return user.response;

    const supabase = getServiceSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Supabase service role tidak dikonfigurasi." },
        { status: 503 },
      );
    }

    const { searchParams } = new URL(req.url);
    const parsedQ = querySchema.safeParse({
      limit: searchParams.get("limit") ?? undefined,
    });

    const limit = parsedQ.success ? parsedQ.data.limit : 20000;

    type QueryShape = { select: string; rmKey: string; nameKey: string };

    // Beberapa installasi DB punya kolom berbeda (legacy).
    // Kita coba berbagai kombinasi RM/name yang mungkin ada.
    const rmKeys = ["no_rm", "nomor_rm", "no_rekam_medis", "rm", "no_rm_pasien"];
    const nameKeys = ["nama_pasien", "nama", "pasien_nama"];

    const queryShapes: QueryShape[] = [];
    for (const rmKey of rmKeys) {
      for (const nameKey of nameKeys) {
        queryShapes.push({
          select: `id,${rmKey},${nameKey}`,
          rmKey,
          nameKey,
        });
      }
    }

    // Tambah prioritas: versi yang biasanya sudah dipakai di app.
    const prioritized = [
      { rmKey: "no_rm", nameKey: "nama_pasien" },
      { rmKey: "no_rm", nameKey: "nama" },
      { rmKey: "rm", nameKey: "nama_pasien" },
      { rmKey: "rm", nameKey: "nama" },
    ];
    const uniq = new Set<string>();
    const ordered: QueryShape[] = [];
    for (const x of prioritized) {
      const k = `${x.rmKey}|${x.nameKey}`;
      if (uniq.has(k)) continue;
      uniq.add(k);
      ordered.push({
        rmKey: x.rmKey,
        nameKey: x.nameKey,
        select: `id,${x.rmKey},${x.nameKey}`,
      });
    }
    for (const s of queryShapes) {
      const k = `${s.rmKey}|${s.nameKey}`;
      if (uniq.has(k)) continue;
      uniq.add(k);
      ordered.push(s);
    }

    let rows: Record<string, unknown>[] = [];
    let usedShape: QueryShape | null = null;

    // Coba beberapa skema sampai query sukses (missing column = coba alternatif).
    // Catatan: Supabase mengembalikan error (bukan throw) bila kolom tidak ada.
    const shapeErrors: Array<{ select: string; message: string }> = [];
    for (const shape of ordered) {
      const { data, error } = await supabase
        .from("tindakan")
        .select(shape.select)
        .limit(limit);

      if (!error && Array.isArray(data)) {
        rows = data;
        usedShape = shape;
        break;
      }

      const msg = error?.message ?? "";
      shapeErrors.push({ select: shape.select, message: msg });
      const looksLikeMissingColumn =
        /column .* does not exist/i.test(msg) ||
        msg.toLowerCase().includes("does not exist") ||
        msg.toLowerCase().includes("undefined column");

      if (!looksLikeMissingColumn) {
        return NextResponse.json(
          { ok: false, error: error?.message ?? "Gagal membaca data tindakan." },
          { status: 500 },
        );
      }
      // else: missing column, coba shape berikutnya
    }

    let tindakanMeta: Array<{ id: string; no_rm: string; nama_pasien: string }> =
      [];

    if (usedShape) {
      tindakanMeta = rows
        .map((r) => {
          const id = String((r as any).id ?? "").trim();
          const no_rm = String((r as any)[usedShape.rmKey] ?? "").trim();
          const nama_pasien = String(
            (r as any)[usedShape.nameKey] ?? "",
          ).trim();
          return { id, no_rm, nama_pasien };
        })
        .filter(
          (x) => x.id && !isBlank(x.no_rm) && !isBlank(x.nama_pasien),
        );
    } else {
      // Fallback: select("*") lalu normalisasi in-memory.
      // Ini menghindari error bila kolom berbeda antar instalasi.
      const tablesToTry: Array<"tindakan" | "tindakan_medik"> = [
        "tindakan",
        "tindakan_medik",
      ];

      let fallbackOk = false;
      const fallbackSummary: string[] = [];
      for (const table of tablesToTry) {
        const { data, error } = await supabase
          .from(table)
          .select("*")
        .limit(limit);

        const rowCount = Array.isArray(data) ? data.length : 0;
        fallbackSummary.push(
          `${table}: rows=${rowCount}${error?.message ? ` err=${error.message}` : ""}`,
        );

        if (error || !Array.isArray(data) || data.length === 0) continue;

        const normalized = data.map((r) =>
          enrichTindakanRowForApi(r as any),
        );

        tindakanMeta = normalized
          .map((r) => {
            const id = String((r as any).id ?? "").trim();
            const no_rm = displayRm(r as any);
            const nama_pasien = displayNamaPasien(r as any);
            return { id, no_rm, nama_pasien };
          })
          .filter(
            (x) =>
              Boolean(x.id) &&
              !isBlank(x.no_rm) &&
              x.no_rm !== "—" &&
              !isBlank(x.nama_pasien) &&
              x.nama_pasien !== "—",
          );

        fallbackOk = true;
        break;
      }

      if (!fallbackOk) {
        const shortFallback = fallbackSummary.slice(0, 2).join(" | ");
        return NextResponse.json(
          {
            ok: false,
            error:
              `Sync gagal membaca data dari tabel \`tindakan\`/\`tindakan_medik\` (fallback select '*' kosong/gagal). ${shortFallback}`,
            attempted: shapeErrors.slice(0, 8),
            fallbackAttempt: fallbackSummary.slice(0, 6),
          },
          { status: 500 },
        );
      }
    }

    if (tindakanMeta.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          stats: {
            candidates: 0,
            uniqueNoRm: 0,
            insertedPatients: 0,
            updatedActions: 0,
            skippedActions: 0,
            message: "Tidak ada baris tindakan yang memenuhi kriteria sync.",
          },
        },
        { status: 200 },
      );
    }

    // Dedup pasien berdasarkan `no_rm` (ambil nama dari kemunculan pertama).
    const candidateByNoRm = new Map<string, { no_rm: string; nama: string }>();
    for (const r of tindakanMeta) {
      if (!candidateByNoRm.has(r.no_rm)) {
        candidateByNoRm.set(r.no_rm, { no_rm: r.no_rm, nama: r.nama_pasien });
      }
    }
    const uniqueNoRm = Array.from(candidateByNoRm.keys());

    // Ambil pasien yang sudah ada untuk no_rm terkait.
    const pasienByNoRm = new Map<string, { id: string; nama: string }>();
    for (const chunk of chunkArray(uniqueNoRm, 500)) {
      const { data: existingRows, error: exErr } = await supabase
        .from("pasien")
        .select("id,no_rm,nama")
        .in("no_rm", chunk);

      if (exErr) {
        return NextResponse.json(
          {
            ok: false,
            error: exErr.message ?? "Gagal membaca master pasien.",
          },
          { status: 500 },
        );
      }

      for (const er of Array.isArray(existingRows) ? existingRows : []) {
        const id = String((er as any).id ?? "").trim();
        const no_rm = String((er as any).no_rm ?? "").trim();
        const nama = String((er as any).nama ?? "").trim();
        if (id && no_rm) pasienByNoRm.set(no_rm, { id, nama });
      }
    }

    // Insert pasien yang belum ada.
    const missingNoRm = uniqueNoRm.filter((no_rm) => !pasienByNoRm.has(no_rm));
    let insertedPatients = 0;

    for (const chunk of chunkArray(missingNoRm, 500)) {
      const payload = chunk.map((no_rm) => {
        const candidate = candidateByNoRm.get(no_rm)!;
        return {
          no_rm,
          nama: candidate.nama,
          jenis_kelamin: "L",
          tgl_lahir: null,
          alamat: null,
          no_telp: null,
          jenis_pembiayaan: "Umum",
          kelas_perawatan: "Kelas 2",
          asuransi: null,
        };
      });

      const { data: insertedRows, error: insErr } = await supabase
        .from("pasien")
        .insert(payload)
        .select("id,no_rm,nama");

      if (insErr) {
        return NextResponse.json(
          {
            ok: false,
            error: insErr.message ?? "Gagal insert master pasien.",
          },
          { status: 500 },
        );
      }

      const inserted = Array.isArray(insertedRows) ? insertedRows : [];
      insertedPatients += inserted.length;
      for (const ir of inserted) {
        const id = String((ir as any).id ?? "").trim();
        const no_rm = String((ir as any).no_rm ?? "").trim();
        const nama = String((ir as any).nama ?? "").trim();
        if (id && no_rm) pasienByNoRm.set(no_rm, { id, nama });
      }
    }

    // Update `tindakan.pasien_id` per kelompok pasien.
    const groupByPasienId = new Map<string, string[]>(); // pasien_id -> tindakan ids
    let skippedActions = 0;

    for (const r of tindakanMeta) {
      const pid = pasienByNoRm.get(r.no_rm)?.id ?? "";
      if (!pid) {
        skippedActions += 1;
        continue;
      }
      const bucket = groupByPasienId.get(pid) ?? [];
      bucket.push(r.id);
      groupByPasienId.set(pid, bucket);
    }

    let updatedActions = 0;
    for (const [pasienId, ids] of groupByPasienId.entries()) {
      for (const idsChunk of chunkArray(ids, 500)) {
        const updateTargets: Array<"tindakan" | "tindakan_medik"> = [
          "tindakan",
          "tindakan_medik",
        ];

        let chunkUpdated = false;
        let lastErrMessage: string | null = null;
        let shouldSkipUpdate = false;

        for (const target of updateTargets) {
          const { data: updRows, error: updErr } = await supabase
            .from(target)
            .update({ pasien_id: pasienId })
            .in("id", idsChunk)
            .select("id");

          if (updErr) {
            lastErrMessage = updErr.message ?? lastErrMessage;
            const msg = (updErr.message ?? "").toLowerCase();
            const looksMissingPasienIdCol =
              msg.includes("could not find the 'pasien_id'") ||
              msg.includes("pasien_id") && msg.includes("column");
            const looksMissing =
              msg.includes("does not exist") ||
              msg.includes("relation") ||
              msg.includes("unknown table");

            // Jika kolom/pemetaan relasi tidak ada, anggap sync tetap sukses
            // (minimal: master pasien sudah terisi).
            if (looksMissingPasienIdCol || looksMissing) {
              shouldSkipUpdate = true;
              break;
            }

            // Error lain dianggap fatal.
            return NextResponse.json(
              {
                ok: false,
                error: updErr.message ?? "Gagal update tindakan.",
              },
              { status: 500 },
            );
          }

          updatedActions += Array.isArray(updRows) ? updRows.length : 0;
          chunkUpdated = true;
          break;
        }

        if (!chunkUpdated && !shouldSkipUpdate && lastErrMessage) {
          return NextResponse.json(
            {
              ok: false,
              error: lastErrMessage ?? "Gagal update tindakan.",
            },
            { status: 500 },
          );
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        stats: {
          candidates: tindakanMeta.length,
          uniqueNoRm: uniqueNoRm.length,
          insertedPatients,
          updatedActions,
          skippedActions,
          message: `Sinkron selesai: ${insertedPatients} master pasien dibuat, ${updatedActions} kasus tindakan dihubungkan.`,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    console.error("❌ [sync-from-tindakan] error:", err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

