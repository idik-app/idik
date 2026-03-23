import { Pasien } from "../types/pasien";

export function saveCache(patients: Pasien[]) {
  localStorage.setItem("patients_cache", JSON.stringify(patients));
}

export function loadCache(): Pasien[] {
  try {
    const raw = localStorage.getItem("patients_cache");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
