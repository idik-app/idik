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
    out.lot =
      raw === undefined || raw === null || String(raw).trim() === ""
        ? null
        : String(raw).trim();
  }

  if (want("ukuran")) {
    const raw = body.ukuran;
    out.ukuran =
      raw === undefined || raw === null || String(raw).trim() === ""
        ? null
        : String(raw).trim();
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
