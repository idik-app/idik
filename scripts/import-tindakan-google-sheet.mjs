/**
 * Impor baris kasus Cathlab dari ekspor CSV Google Sheet ke tabel `public.tindakan`.
 *
 * Sumber default: sheet produksi (ID sama dengan modul).
 * Jalankan dari root proyek dengan service role di .env.local:
 *
 *   node scripts/import-tindakan-google-sheet.mjs --dry-run
 *   node scripts/import-tindakan-google-sheet.mjs --apply
 *
 * Opsi:
 *   --url=<csv_url>     Override URL ekspor CSV (format=csv)
 *   --file=<path>       Pakai file CSV lokal, tidak mengunduh
 *   --dry-run           Hanya parse & hitung (default jika tanpa --apply)
 *   --apply             Sisipkan ke Supabase
 *   --batch=<n>         Ukuran batch insert (default 150)
 *   --gid=<n>           ID tab Google Sheet (lihat URL &gid=…); dipakai bila data utama bukan tab pertama
 *
 * Catatan: Satu file CSV bisa berisi puluh ribu baris, tetapi biasanya hanya ~3–4 ribu baris yang
 * punya kolom TANGGAL + nama/RM terisi; sisanya baris kosong di ekspor. Itu batas isi sheet, bukan bug impor.
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import XLSX from "xlsx";

config({ path: ".env.local" });
config({ path: ".env" });

const DEFAULT_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/119LS4-5crPl54Rincgzhsd_B1aiqyHb3OFm-omR0_Tk/export?format=csv";

const ID_MONTHS = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

function argVal(name) {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function str(v) {
  return String(v ?? "").trim();
}

function numOrNull(v) {
  if (v === "" || v == null) return null;
  const t = String(v).replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Tanggal seperti "Jumat, 27 Maret 2026" → YYYY-MM-DD */
function parseTanggalId(s) {
  const t = str(s);
  if (!t) return null;
  const m = t.match(/,\s*(\d{1,2})\s+([a-zA-Z\u00C0-\u024F]+)\s+(\d{4})/);
  if (m) {
    const mo = ID_MONTHS[m[2].toLowerCase()];
    if (mo) {
      const y = m[3];
      const d = String(m[1]).padStart(2, "0");
      return `${y}-${String(mo).padStart(2, "0")}-${d}`;
    }
  }
  return null;
}

/** Fluoro: "0:10:45" atau "10:45" → detik (numeric di DB) */
function parseFluoroSeconds(v) {
  const s = str(v);
  if (!s) return null;
  if (s.includes(":")) {
    const parts = s.split(":").map((p) => parseInt(p, 10));
    if (parts.some((x) => Number.isNaN(x))) return null;
    if (parts.length === 3)
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return null;
  }
  return numOrNull(s);
}

function buildDiagnosa(diagnosa, statusSheet, kelasSheet) {
  let d = str(diagnosa);
  const bits = [];
  const st = str(statusSheet);
  const kl = str(kelasSheet);
  if (st) bits.push(st);
  if (kl) bits.push(/^kelas/i.test(kl) ? kl : `Kelas ${kl}`);
  if (bits.length) d = d ? `${d} · ${bits.join(" · ")}` : bits.join(" · ");
  return d || null;
}

function balloonSuffix(row) {
  const parts = [];
  const n = str(row["NAMA BALLON"]);
  const u = str(row["UKURAN BALLON"]);
  const lot = str(row["LOT BALON"]);
  const ed = str(row["ED BALON"]);
  if (n) parts.push(`Nama: ${n}`);
  if (u) parts.push(`Ukuran: ${u}`);
  if (lot) parts.push(`Lot: ${lot}`);
  if (ed) parts.push(`ED: ${ed}`);
  return parts.length ? `Ballon — ${parts.join("; ")}` : "";
}

/** Nama kolom persis seperti dihasilkan XLSX dari CSV Google (termasuk \n di header). */
const COL = {
  NO: "No",
  TANGGAL: "TANGGAL",
  WAKTU: "WAKTU",
  FLURO: "FLURO TIME",
  DAP: "DAP\n(Gray.cm2)",
  KV: "KV",
  MA: "MA",
  STATUS_DUP: "STATUS DUPLIKAT",
  NO_RM: "NO. RM",
  NAMA: "NAMA PASIEN",
  TGL_LAHIR: "TGL LAHIR",
  ALAMAT: "ALAMAT & RUJUKAN",
  NO_TELP: "NO. TELP",
  RUANGAN: "RUANGAN",
  CATH: "CATH",
  DOKTER: "DOKTER",
  TINDAKAN: "TINDAKAN",
  KATEGORI: "KATEGORI",
  HASIL: "HASIL LAB / \nPPM",
  DIAGNOSA: "DIAGNOSA",
  SEVERITY: "SEVERITY LEVEL",
  ASISTEN: "ASISTEN",
  SIRKULER: "SIRKULER",
  LOGGER: "LOGGER",
  STATUS: "STATUS",
  KELAS: "KELAS",
  LAMA: "LAMA\nPERAWATAN\n(HARI)",
  LEVEL: "LEVEL",
  PEROLEHAN: "PEROLEHAN\nBPJS",
  TARIF: "TARIF TINDAKAN",
  CONSUMABLE: "CONSUMABLE",
  TOTAL_KRS: "TOTAL\nKRS",
  SELISIH: "SELISIH",
  RESUME: "RESUME PEMAKAIAN",
};

function shouldImportRow(row) {
  const nama = str(row[COL.NAMA]);
  const rm = str(row[COL.NO_RM]);
  const tgl = str(row[COL.TANGGAL]);
  if (!nama && !rm) return false;
  if (!tgl && !rm) return false;
  if (!parseTanggalId(tgl)) return false;
  return true;
}

function mapRowToPayload(row) {
  const tanggal = parseTanggalId(row[COL.TANGGAL]);
  let nama = str(row[COL.NAMA]);
  const rm = str(row[COL.NO_RM]);
  if (!nama && rm) nama = `(No. RM ${rm})`;

  const flu = parseFluoroSeconds(row[COL.FLURO]);
  const dap = numOrNull(row[COL.DAP]);
  const kv = numOrNull(row[COL.KV]);
  const ma = numOrNull(row[COL.MA]);

  const diagnosa = buildDiagnosa(
    row[COL.DIAGNOSA],
    row[COL.STATUS],
    row[COL.KELAS],
  );

  const krsRaw = str(row[COL.TOTAL_KRS]);
  const krs = krsRaw || null;

  const resumeParts = [str(row[COL.RESUME])].filter(Boolean);
  const bal = balloonSuffix(row);
  if (bal) resumeParts.push(bal);
  const dup = str(row[COL.STATUS_DUP]);
  if (dup) resumeParts.push(`Duplikat: ${dup}`);
  const alamat = str(row[COL.ALAMAT]);
  const telp = str(row[COL.NO_TELP]);
  const ttl = str(row[COL.TGL_LAHIR]);
  const meta = [alamat && `Alamat: ${alamat}`, telp && `Telp: ${telp}`, ttl && `Lahir: ${ttl}`]
    .filter(Boolean)
    .join(" · ");
  if (meta) resumeParts.push(meta);

  const pemakaian = resumeParts.length ? resumeParts.join("\n") : null;

  const lama = numOrNull(row[COL.LAMA]);
  const level = str(row[COL.LEVEL]);
  let extraDiag = diagnosa;
  if (lama != null || level) {
    const bits = [];
    if (lama != null) bits.push(`Lama rawat: ${lama} hari`);
    if (level) bits.push(`Level: ${level}`);
    extraDiag = extraDiag
      ? `${extraDiag} · ${bits.join(" · ")}`
      : bits.join(" · ");
  }

  const dokter = str(row[COL.DOKTER]) || "—";
  const tindakan = str(row[COL.TINDAKAN]) || "Belum diisi";

  const out = {
    tanggal,
    waktu: str(row[COL.WAKTU]) || null,
    no_rm: rm || null,
    nama,
    nama_pasien: nama,
    dokter,
    tindakan,
    status: "Selesai",
    kategori: str(row[COL.KATEGORI]) || null,
    ruangan: str(row[COL.RUANGAN]) || null,
    cath: str(row[COL.CATH]) || null,
    diagnosa: extraDiag,
    fluoro_time: flu,
    dose: dap,
    kv,
    ma,
    hasil_lab_ppm: str(row[COL.HASIL]) || null,
    severity_level: str(row[COL.SEVERITY]) || null,
    asisten: str(row[COL.ASISTEN]) || null,
    sirkuler: str(row[COL.SIRKULER]) || null,
    logger: str(row[COL.LOGGER]) || null,
    tarif_tindakan: numOrNull(row[COL.TARIF]),
    total: numOrNull(row[COL.PEROLEHAN]),
    krs,
    consumable: numOrNull(row[COL.CONSUMABLE]),
    pemakaian,
  };

  const selisihSheet = numOrNull(row[COL.SELISIH]);
  if (selisihSheet != null) out.selisih = selisihSheet;

  for (const k of Object.keys(out)) {
    if (out[k] === null || out[k] === "") delete out[k];
  }

  return out;
}

/** Cabut kolom yang ditolak PostgREST; nilai teks/angka dipindah ke pemakaian agar tidak hilang. */
function stripUnknownColumns(row, banned) {
  const r = { ...row };
  for (const k of banned) {
    if (!(k in r)) continue;
    const v = r[k];
    delete r[k];
    if (v === null || v === undefined || v === "") continue;
    if (
      k === "nama_pasien" &&
      String(v) === String(r.nama ?? "")
    ) {
      continue;
    }
    const line =
      typeof v === "number" && Number.isFinite(v)
        ? `${k}: ${v}`
        : `${k}: ${String(v)}`;
    r.pemakaian = r.pemakaian ? `${line}\n${r.pemakaian}` : line;
  }
  return r;
}

function parseMissingColumnMessage(msg) {
  const m = String(msg).match(/Could not find the '(\w+)' column/);
  return m ? m[1] : null;
}

function applySheetGid(url, gid) {
  if (gid == null || gid === "") return url;
  try {
    const u = new URL(url);
    u.searchParams.set("gid", String(gid).replace(/\D/g, ""));
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}gid=${String(gid).replace(/\D/g, "")}`;
  }
}

async function loadBuffer(url, filePath) {
  if (filePath) {
    if (!existsSync(filePath)) {
      throw new Error(`File tidak ada: ${filePath}`);
    }
    return readFileSync(filePath);
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Gagal unduh CSV: HTTP ${res.status}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const dryRun = !hasFlag("--apply");
  const gid = argVal("--gid");
  const url = applySheetGid(argVal("--url") || DEFAULT_SHEET_CSV_URL, gid);
  const filePath = argVal("--file");
  const batchSize = Math.min(
    500,
    Math.max(1, parseInt(argVal("--batch") || "150", 10) || 150),
  );

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(
    dryRun
      ? "[dry-run] Tidak ada perubahan database. Tambah --apply untuk insert."
      : "[apply] Menyisipkan ke Supabase…",
  );

  const buf = await loadBuffer(url, filePath);
  const wb = XLSX.read(buf, { type: "buffer", raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("Sheet kosong.");

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  const payloads = [];
  for (const row of rows) {
    if (!shouldImportRow(row)) continue;
    payloads.push(mapRowToPayload(row));
  }

  console.log(`Baris di CSV: ${rows.length} → siap impor: ${payloads.length}`);

  if (dryRun) {
    console.log("Contoh 1 baris:", JSON.stringify(payloads[0], null, 2));
    return;
  }

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL (atau SUPABASE_URL) dan SUPABASE_SERVICE_ROLE_KEY di .env.local",
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let inserted = 0;
  let failed = 0;
  let lastErr = null;
  /** Kolom yang tidak ada di schema remote — di-drop dari insert, nilai dipindah ke pemakaian. */
  const bannedCols = new Set();

  for (let i = 0; i < payloads.length; i += batchSize) {
    const chunk = payloads.slice(i, i + batchSize);
    let attempt = 0;
    let chunkInserted = false;
    while (attempt < 40 && !chunkInserted) {
      const rows = chunk.map((p) => stripUnknownColumns(p, bannedCols));
      const { error } = await supabase.from("tindakan").insert(rows);
      if (!error) {
        inserted += chunk.length;
        chunkInserted = true;
        console.log(`OK ${inserted} / ${payloads.length}`);
        break;
      }
      lastErr = error;
      const missing = parseMissingColumnMessage(error.message);
      if (missing && !bannedCols.has(missing)) {
        bannedCols.add(missing);
        console.warn(
          `[impor] Kolom '${missing}' tidak ada di DB — nilai dipindah ke pemakaian & diulang batch.`,
        );
        attempt += 1;
        continue;
      }
      failed += chunk.length;
      console.error(`Batch ${i}-${i + chunk.length - 1}:`, error.message);
      break;
    }
  }

  if (bannedCols.size > 0) {
    console.warn(
      `[impor] Kolom yang di-skip (schema remote): ${[...bannedCols].sort().join(", ")}`,
    );
  }

  console.log(`Selesai. Berhasil: ${inserted}, gagal batch: ${failed}`);
  if (lastErr && inserted === 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
