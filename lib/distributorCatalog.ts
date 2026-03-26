/** Kategori alkes di level mapping distributor (bukan kategori master_barang). */
export const DISTRIBUTOR_PRODUK_KATEGORI = [
  "STENT",
  "BALLON",
  "WIRE",
  "GUIDING",
  "KATETER",
] as const;

export type DistributorProdukKategori =
  (typeof DISTRIBUTOR_PRODUK_KATEGORI)[number];

export type ParsedDistributorBarangExtra = {
  /** Barcode kemasan pada mapping distributor (tersimpan bersama produk). */
  barcode: string | null;
  kategori: string | null;
  lot: string | null;
  ukuran: string | null;
  /** Bulan–tahun kedaluwarsa (MM-YYYY), contoh 09-2028. */
  ed: string | null;
};

/** Hasil parse barcode kemasan → saran LOT / ukuran / ED untuk form tambah produk. Lot = teks utuh; ukuran dari 9 digit terakhir (AABBBCCC → Ø mm × panjang) bila masuk rentang alat; ED hanya jika ada pola MM-YYYY di string. */
export type DistributorKemasanBarcodeTemplate = {
  lot: string;
  ukuran: string | null;
  ed: string | null;
};

const PLAIN_EAN_LIKE = /^\d{8}$|^\d{12}$|^\d{13}$/;

/** Pemisah Ø × panjang dengan spasi: "2.75x28" / "2.75 × 28" → "2.75 x 28". Hanya segmen angka–x–angka. */
export function normalizeDistributorUkuranSpacing(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return s;
  return s
    .replace(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+)/gi, "$1 x $2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Ekstrak template dari barcode/UID kemasan (mis. stent): LOT default = string penuh;
 * ukuran `X.XX x L` jika 9 digit terakhir memenuhi heuristik diameter × panjang (mm).
 */
export function parseDistributorKemasanBarcodeTemplate(
  raw: string,
): DistributorKemasanBarcodeTemplate {
  const lot = String(raw ?? "").trim();
  if (!lot) return { lot: "", ukuran: null, ed: null };

  let ukuran: string | null = null;
  if (!PLAIN_EAN_LIKE.test(lot)) {
    const m = lot.match(/(\d{3})(\d{3})(\d{3})$/);
    if (m) {
      const dHmm = Number.parseInt(m[1], 10);
      const lenMm = Number.parseInt(m[2], 10);
      const diameter = dHmm / 100;
      if (
        diameter >= 0.5 &&
        diameter <= 6.5 &&
        lenMm >= 5 &&
        lenMm <= 250
      ) {
        ukuran = normalizeDistributorUkuranSpacing(
          `${diameter.toFixed(2)} x ${lenMm}`,
        );
      }
    }
  }

  let ed: string | null = null;
  const y = lot.match(/\b(0[1-9]|1[0-2])-(20\d{2})\b/);
  if (y) ed = `${y[1]}-${y[2]}`;
  else {
    const slash = lot.match(/\b(0[1-9]|1[0-2])\/(20\d{2})\b/);
    if (slash) ed = `${slash[1]}-${slash[2]}`;
  }

  return { lot, ukuran, ed };
}

/**
 * Untuk master **SUPRAFLEX** (termasuk typo SUPRFAFLEX): LOT GS1 batch AI (10) =
 * `(10)` + 8 karakter setelah awalan `21` pada barcode UDI (indeks 2–9).
 * Contoh barcode `21S25TZAUZS…` → `(10)S25TZAUZ`.
 */
export function suggestSupraflexLotFromBarcode(
  namaBarang: string,
  barcode: string,
): string | null {
  const compact = String(namaBarang ?? "")
    .toUpperCase()
    .replace(/\s+/g, "");
  const isSupraflex =
    compact.includes("SUPRAFLEX") || compact.includes("SUPRFAFLEX");
  if (!isSupraflex) return null;

  const bc = String(barcode ?? "").trim();
  if (bc.length < 10 || !bc.startsWith("21")) return null;

  const batch = bc.slice(2, 10);
  if (!/^[A-Za-z0-9]{8}$/.test(batch)) return null;

  return `(10)${batch.toUpperCase()}`;
}

/** Panjang sufiks barcode UDI untuk LOT GENOSS (9 karakter terakhir, mis. `…1025H12-C18` → `25H12-C18`). */
export const GENOSS_LOT_BARCODE_SUFFIX_LEN = 9;

/**
 * Untuk **GENOSS**: LOT = **9 karakter terakhir** barcode UDI (format GS1).
 */
export function suggestGenossLotFromBarcode(
  namaBarang: string,
  barcode: string,
): string | null {
  const u = String(namaBarang ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!u.includes("GENOSS")) return null;

  const bc = String(barcode ?? "").trim();
  const n = GENOSS_LOT_BARCODE_SUFFIX_LEN;
  if (bc.length < n) return null;

  return bc.slice(-n).toUpperCase();
}

/** Prioritas: SupraFlex `(10)…` batch, lalu GENOSS (9 karakter akhir), lalu null. */
export function suggestDistributorLotFromBarcode(
  namaBarang: string,
  barcode: string,
): string | null {
  return (
    suggestSupraflexLotFromBarcode(namaBarang, barcode) ??
    suggestGenossLotFromBarcode(namaBarang, barcode) ??
    null
  );
}

/** Bandingkan string barcode UDI untuk isi otomatis LOT (huruf besar, dash unicode → ASCII). */
export function normalizeDistributorUdiBarcodeKey(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-");
}

/** Nilai LOT: trim + huruf besar (form distributor & penyimpanan). */
export function normalizeDistributorLotAutoValue(raw: string): string {
  return String(raw ?? "").trim().toUpperCase();
}

const ED_MM_YYYY = /^(0[1-9]|1[0-2])-\d{4}$/;
const ED_LEGACY_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Satukan pemisah: slash / unicode dash → ASCII `-` (hindari "salah" padahal sudah benar). */
function normalizeEdSeparators(raw: string): string {
  return raw
    .trim()
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
    .replace(/\//g, "-");
}

function normalizeDistributorEdFromRaw(raw: string):
  | { ok: true; value: string }
  | { ok: false; message: string } {
  const t = normalizeEdSeparators(raw);
  if (ED_MM_YYYY.test(t)) return { ok: true, value: t };

  const loose = t.match(/^(\d{1,2})-(\d{4})$/);
  if (loose) {
    const mo = Number(loose[1]);
    const yr = loose[2];
    if (mo < 1 || mo > 12)
      return { ok: false, message: "Bulan ED harus 01–12" };
    return {
      ok: true,
      value: `${String(mo).padStart(2, "0")}-${yr}`,
    };
  }

  if (ED_LEGACY_ISO.test(t.slice(0, 10))) {
    const [y, m] = t.slice(0, 10).split("-");
    return { ok: true, value: `${m}-${y}` };
  }

  return {
    ok: false,
    message: "ED hanya bulan–tahun (MM-YYYY), contoh 09-2028",
  };
}

/** Validasi ED untuk form (boleh kosong = null). Dipakai di klien sebelum kirim API. */
export function parseDistributorEdForSubmit(
  raw: string | null | undefined,
):
  | { ok: true; value: string | null }
  | { ok: false; message: string } {
  const s = String(raw ?? "");
  if (s.trim() === "") return { ok: true, value: null };
  const n = normalizeDistributorEdFromRaw(s);
  if (!n.ok) return n;
  return { ok: true, value: n.value };
}

const RUPIAH_ID = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const RUPIAH_ID_PLAIN = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Nilai angka untuk input (contoh 3.000.000), tanpa prefix Rp — placeholder bisa "Rp 3.000.000". */
export function distributorHargaToFormValue(
  harga: number | null | undefined,
): string {
  if (harga == null || !Number.isFinite(harga)) return "";
  return RUPIAH_ID_PLAIN.format(harga);
}

/** Parse harga: angka murni atau tempel "Rp 3.000.000" / "3.000.000". */
export function parseDistributorHargaForSubmit(
  raw: string | null | undefined,
): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") return null;
  const digits = s.replace(/\D/g, "");
  if (digits === "") return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

/**
 * Nilai tampilan field harga saat diketik/ditempel: angka saja → format ribuan id-ID (titik),
 * mis. mengetik 6000000 menjadi "6.000.000".
 */
export function formatDistributorHargaInputValue(raw: string): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits === "") return "";
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return "";
  return RUPIAH_ID_PLAIN.format(n);
}

/** Tampilan tabel / ringkasan: Rp 3.000.000 */
export function formatDistributorHargaDisplay(
  harga: number | null | undefined,
): string {
  if (harga == null || !Number.isFinite(harga)) return "—";
  return RUPIAH_ID.format(harga);
}

/** Tampilan tabel: legacy ISO date ikut dinormalisasi ke MM-YYYY. */
export function formatDistributorEdDisplay(
  ed: string | null | undefined,
): string {
  if (ed == null || String(ed).trim() === "") return "—";
  const s = String(ed).trim();
  if (ED_MM_YYYY.test(s)) return s;
  if (ED_LEGACY_ISO.test(s.slice(0, 10))) {
    const [y, m] = s.slice(0, 10).split("-");
    return `${m}-${y}`;
  }
  return s;
}

/** Nilai untuk input form (string kosong jika tidak ada). */
export function distributorEdToFormValue(
  ed: string | null | undefined,
): string {
  if (ed == null || String(ed).trim() === "") return "";
  const s = String(ed).trim();
  if (ED_MM_YYYY.test(s)) return s;
  if (ED_LEGACY_ISO.test(s.slice(0, 10))) {
    const [y, m] = s.slice(0, 10).split("-");
    return `${m}-${y}`;
  }
  return s;
}

/**
 * @param partial — true: hanya kunci yang ada di `body` yang divalidasi/dikembalikan (untuk PATCH).
 *                  false: field yang tidak dikirim dianggap kosong (untuk POST form lengkap).
 */
export function parseDistributorBarangExtra(
  body: Record<string, unknown>,
  partial: boolean
):
  | { ok: true; value: Partial<ParsedDistributorBarangExtra> }
  | { ok: false; message: string } {
  const out: Partial<ParsedDistributorBarangExtra> = {};

  const want = (key: keyof ParsedDistributorBarangExtra) =>
    partial ? key in body : true;

  if (want("barcode")) {
    const raw = body.barcode;
    out.barcode =
      raw === undefined || raw === null || String(raw).trim() === ""
        ? null
        : String(raw).trim();
  }

  if (want("kategori")) {
    const raw = body.kategori;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      out.kategori = null;
    } else {
      const up = String(raw).trim().toUpperCase();
      if (!DISTRIBUTOR_PRODUK_KATEGORI.includes(up as DistributorProdukKategori)) {
        return {
          ok: false,
          message: `Kategori harus salah satu: ${DISTRIBUTOR_PRODUK_KATEGORI.join(", ")}`,
        };
      }
      out.kategori = up;
    }
  }

  if (want("lot")) {
    const raw = body.lot;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      out.lot = null;
    } else {
      const lot = normalizeDistributorLotAutoValue(String(raw));
      out.lot = lot === "" ? null : lot;
    }
  }

  if (want("ukuran")) {
    const raw = body.ukuran;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      out.ukuran = null;
    } else {
      out.ukuran = normalizeDistributorUkuranSpacing(String(raw).trim());
    }
  }

  if (want("ed")) {
    const raw = body.ed;
    if (raw === undefined || raw === null || String(raw).trim() === "") {
      out.ed = null;
    } else {
      const n = normalizeDistributorEdFromRaw(String(raw));
      if (!n.ok) return { ok: false, message: n.message };
      out.ed = n.value;
    }
  }

  return { ok: true, value: out };
}