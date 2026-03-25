/** Label UI untuk nama field payload (camelCase) — dipakai di pesan validasi */
export const PASIEN_FIELD_LABELS: Record<string, string> = {
  noRM: "No. RM",
  nama: "Nama",
  jenisKelamin: "Jenis kelamin",
  tanggalLahir: "Tanggal lahir",
  alamat: "Alamat",
  noHP: "No. HP",
  jenisPembiayaan: "Jenis pembiayaan",
  kelasPerawatan: "Kelas perawatan",
  asuransi: "Asuransi",
};

type FlattenLike = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

/**
 * Ubah respons API (validasi Zod flatten atau string) jadi teks yang jelas per field.
 */
export function formatPasienApiValidationError(resp: {
  error?: unknown;
  message?: string;
}): string {
  if (typeof resp?.error === "string" && resp.error.trim()) {
    return resp.error;
  }

  const e = resp?.error as FlattenLike | undefined;

  if (e?.fieldErrors && typeof e.fieldErrors === "object") {
    const lines: string[] = [];
    for (const [key, msgs] of Object.entries(e.fieldErrors)) {
      if (!msgs?.length) continue;
      const label = PASIEN_FIELD_LABELS[key] ?? key;
      lines.push(`• ${label}: ${msgs.join(" ")}`);
    }
    if (lines.length) {
      return ["Perbaiki isian berikut:", ...lines].join("\n");
    }
  }

  if (e?.formErrors?.length) {
    return e.formErrors.join("\n");
  }

  if (typeof resp?.message === "string" && resp.message.trim()) {
    return resp.message;
  }

  return "Terjadi kesalahan saat menyimpan data. Periksa kembali isian yang wajib.";
}
