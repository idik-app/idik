/**
 * scripts/map-report-links.mjs
 * ---------------------------
 * Script untuk mencocokkan manifest Google Drive dengan database tindakan.
 * 
 * Penggunaan:
 * 1. Letakkan `google_drive_manifest.csv` di root proyek.
 * 2. Jalankan:
 *    node scripts/map-report-links.mjs --dry-run
 *    node scripts/map-report-links.mjs --apply
 *    node scripts/map-report-links.mjs --apply --force  (Overwrite existing links)
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import XLSX from "xlsx";

config({ path: ".env.local" });
config({ path: ".env" });

const MANIFEST_PATH = "google_drive_manifest.csv";

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function normalizeRM(rm) {
  if (!rm) return "";
  return String(rm).replace(/\D/g, "").padStart(6, "0");
}

function normalizeNama(nama) {
  if (!nama) return "";
  return nama.toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const apply = hasFlag("--apply");
  const force = hasFlag("--force");
  const dryRun = !apply;
  
  if (!existsSync(MANIFEST_PATH)) {
    console.error(`❌ File manifest tidak ditemukan: ${MANIFEST_PATH}`);
    console.log("Silakan jalankan script Google Apps Script terlebih dahulu dan simpan hasilnya sebagai google_drive_manifest.csv");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Environment variables Supabase tidak lengkap (.env.local)");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("⏳ Membaca manifest...");
  const workbook = XLSX.readFile(MANIFEST_PATH);
  const manifestRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  console.log(`✅ Manifest terbaca: ${manifestRows.length} file.`);

  console.log("⏳ Mengambil data tindakan dari database...");
  let tindakanList = [];
  let from = 0;
  let to = 999;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from("tindakan")
      .select("id, no_rm, nama_pasien, tanggal, pci_report_link");
    
    // Jika tidak force, hanya ambil yang pci_report_link-nya null
    if (!force) {
      query = query.is("pci_report_link", null);
    }
    
    const { data, error } = await query.range(from, to);

    if (error) {
      console.error("❌ Gagal mengambil data tindakan:", error.message);
      process.exit(1);
    }

    tindakanList = [...tindakanList, ...data];
    if (data.length < 1000) {
      hasMore = false;
    } else {
      from += 1000;
      to += 1000;
    }
  }

  const targetLabel = force ? "semua" : "tanpa link";
  console.log(`✅ Database: ${tindakanList.length} tindakan (${targetLabel}).`);

  const matches = [];
  const unmatched = [];

  // Indexing manifest by RM for faster lookup
  const manifestByRM = {};
  manifestRows.forEach(row => {
    const rm = normalizeRM(row.NoRM_Extracted);
    if (rm) {
      if (!manifestByRM[rm]) manifestByRM[rm] = [];
      manifestByRM[rm].push(row);
    }
  });

  console.log("⏳ Mencocokkan data...");

  let debugCount = 0;
  for (const t of tindakanList) {
    const rm = normalizeRM(t.no_rm);
    const nama = normalizeNama(t.nama_pasien);
    const tgl = t.tanggal ? new Date(t.tanggal) : null;
    const year = tgl ? tgl.getFullYear().toString() : null;

    let foundMatch = null;

    // 1. Coba match via RM
    if (rm && manifestByRM[rm]) {
      const candidates = manifestByRM[rm];
      
      // Jika ada multiple file untuk RM yang sama, filter berdasarkan tahun
      if (candidates.length > 1 && year) {
        const yearMatches = candidates.filter(c => String(c.Year) === year);
        if (yearMatches.length === 1) {
          foundMatch = yearMatches[0];
        } else if (yearMatches.length > 1) {
          // Pilih yang paling baru di Drive
          foundMatch = yearMatches.sort((a,b) => new Date(b.LastModified) - new Date(a.LastModified))[0];
        }
      } else {
        foundMatch = candidates[0];
      }
    }

    // 2. Coba match via Nama + Tahun (jika RM tidak ketemu)
    if (!foundMatch && nama && year) {
      // Split nama into tokens to handle variations (e.g. "T. NATHANIEL" vs "NATHANIEL")
      const tokens = nama.split(" ").filter(tk => tk.length > 2); // only long words
      
      const nameMatches = manifestRows.filter(c => {
        const cNama = normalizeNama(c.FileName);
        const yearMatch = String(c.Year) === year;
        if (!yearMatch) return false;
        
        // Exact match preferred
        if (cNama.includes(nama)) return true;
        
        // Token match (at least 2 tokens must match if multiple words)
        if (tokens.length >= 2) {
          const matchedTokens = tokens.filter(tk => cNama.includes(tk));
          return matchedTokens.length >= 2;
        }
        
        return false;
      });
      
      if (nameMatches.length >= 1) {
        foundMatch = nameMatches[0];
      }
    }

    if (debugCount < 10 && !foundMatch) {
      // console.log(`[DEBUG] No match for: ${t.nama_pasien} (${rm}) year ${year}`);
      debugCount++;
    }

    if (foundMatch) {
      // Jika data di DB sudah sama dengan di Manifest, lewati (hemat query)
      if (t.pci_report_link === foundMatch.URL) {
        continue;
      }

      matches.push({
        id: t.id,
        nama: t.nama_pasien,
        rm: t.no_rm,
        tanggal: t.tanggal,
        link: foundMatch.URL,
        fileName: foundMatch.FileName
      });
    } else {
      unmatched.push(t);
    }
  }

  console.log("\n--- HASIL PENCOCOKAN ---");
  console.log(`Total Berhasil Match Baru: ${matches.length}`);
  console.log(`Total Gagal Match        : ${unmatched.length}`);
  console.log("------------------------\n");

  if (dryRun) {
    console.log("Mode: DRY-RUN (Tidak ada perubahan di database)");
    if (matches.length > 0) {
      console.log("Contoh 3 hasil match baru:");
      console.table(matches.slice(0, 3));
    }
    console.log("\nJalankan dengan --apply untuk memperbarui database.");
  } else {
    if (matches.length === 0) {
      console.log("✅ Semua data sudah sesuai dengan manifest. Tidak ada yang perlu diperbarui.");
      return;
    }

    console.log(`⏳ Memperbarui ${matches.length} baris di Supabase...`);
    
    let updated = 0;
    for (const m of matches) {
      const { error: updateErr } = await supabase
        .from("tindakan")
        .update({ pci_report_link: m.link })
        .eq("id", m.id);
      
      if (updateErr) {
        console.error(`❌ Gagal update ID ${m.id}:`, updateErr.message);
      } else {
        updated++;
        if (updated % 50 === 0) console.log(`Processed ${updated}/${matches.length}...`);
      }
    }
    
    console.log(`✅ Selesai! ${updated} link berhasil diperbarui.`);
  }
}

main().catch(console.error);
