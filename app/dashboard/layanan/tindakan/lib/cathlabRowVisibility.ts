function txt(v: unknown): string {
  return String(v ?? "").trim();
}

function isPlaceholder(s: string): boolean {
  const l = s.toLowerCase();
  return (
    !l ||
    l === "pasien" ||
    l === "belum diisi" ||
    l === "belum ditentukan" ||
    l.includes("cari / pilih")
  );
}

export function isCathlabIdentity(row: {
  kategori?: unknown;
  ruangan?: unknown;
}): boolean {
  return `${row?.kategori ?? ""} ${row?.ruangan ?? ""}`
    .toLowerCase()
    .includes("cath");
}

export function cathlabRowHasMinIdentity(row: {
  tanggal?: unknown;
  no_rm?: unknown;
  rm?: unknown;
  nama_pasien?: unknown;
  nama?: unknown;
}): boolean {
  const hasTanggal = Boolean(txt(row?.tanggal));
  const rm = txt(row?.no_rm ?? row?.rm);
  const hasRm = Boolean(rm) && rm !== "—";
  const nama = txt(row?.nama_pasien ?? row?.nama);
  const hasNama = Boolean(nama) && !isPlaceholder(nama);
  return hasTanggal && hasRm && hasNama;
}

/** Tabel utama: tampilkan baris Cath Lab yang sudah punya tanggal + RM + nama. */
export function cathlabRowShouldShowInMainTable(row: {
  kategori?: unknown;
  ruangan?: unknown;
  tanggal?: unknown;
  no_rm?: unknown;
  rm?: unknown;
  nama_pasien?: unknown;
  nama?: unknown;
}): boolean {
  if (!isCathlabIdentity(row)) return true;
  return cathlabRowHasMinIdentity(row);
}

/** Badge “belum lengkap” — jangan disembunyikan dari tabel. */
export function cathlabRowNeedsCompletenessBadge(row: {
  kategori?: unknown;
  ruangan?: unknown;
  tanggal?: unknown;
  no_rm?: unknown;
  rm?: unknown;
  nama_pasien?: unknown;
  nama?: unknown;
  diagnosa?: unknown;
  hasil_lab_ppm?: unknown;
}): boolean {
  if (!isCathlabIdentity(row)) return false;
  if (!cathlabRowHasMinIdentity(row)) return false;
  const hasDiagnosa = Boolean(txt(row?.diagnosa));
  const hasHasilLab = Boolean(txt(row?.hasil_lab_ppm));
  return !hasDiagnosa || !hasHasilLab;
}
