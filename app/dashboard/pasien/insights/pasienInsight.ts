import { Pasien } from "../types/pasien";

export function generateInsight(patients: Pasien[]) {
  const tanpaDokter = patients.filter((p: any) => !p?.dokter && !p?.doctor);
  const duplikasi = new Set<string>();
  const namaSet = new Set<string>();

  patients.forEach((p) => {
    const key = `${p.nama?.trim().toLowerCase()}-${p.tanggalLahir}`;
    if (namaSet.has(key)) duplikasi.add(key);
    else namaSet.add(key);
  });

  const insight: string[] = [];
  if (tanpaDokter.length > 0)
    insight.push(`${tanpaDokter.length} pasien belum memiliki dokter.`);
  if (duplikasi.size > 0)
    insight.push(`Ditemukan ${duplikasi.size} potensi pasien ganda.`);
  return insight;
}
