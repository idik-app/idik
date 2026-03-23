import { Pasien } from "../types/pasien";

export function isDuplicate(patients: Pasien[], data: Omit<Pasien, "id">) {
  return patients.some(
    (p) =>
      p.noRM === data.noRM ||
      (p.nama?.trim().toLowerCase() === data.nama?.trim().toLowerCase() &&
        p.tanggalLahir === data.tanggalLahir)
  );
}

export function isIncomplete(data: Omit<Pasien, "id">) {
  return !data.noRM || !data.nama;
}
