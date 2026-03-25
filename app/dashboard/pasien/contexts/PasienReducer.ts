import type { Pasien } from "../types/pasien";
import { calculateSummary } from "./PasienSummary";

/** Bidang teks yang ikut dicocokkan ke query pencarian */
function patientSearchHaystack(p: Pasien): string {
  const parts = [
    p.nama,
    p.noRM,
    p.noHP,
    p.alamat,
    p.asuransi,
    p.jenisPembiayaan,
    p.kelasPerawatan,
    p.dokter,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function matchesSearch(p: Pasien, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return patientSearchHaystack(p).includes(q);
}

function filterPatientsByStateFilters(
  patients: Pasien[],
  filters: FiltersState
): Pasien[] {
  const search = (filters.search || "").trim();
  const pembiayaan = filters.pembiayaan || "";
  const kelas = filters.kelas || "";
  if (!search && !pembiayaan && !kelas) return patients;
  return patients.filter((p) => {
    const matchSearch = matchesSearch(p, search);
    const matchPembiayaan =
      !pembiayaan ||
      pembiayaan === "Semua" ||
      p.jenisPembiayaan === pembiayaan;
    const matchKelas =
      !kelas || kelas === "Semua" || p.kelasPerawatan === kelas;
    return matchSearch && matchPembiayaan && matchKelas;
  });
}

/*───────────────────────────────────────────────
🧩 PasienReducer v6.8 — Anti-Render-Loop Edition
- Hanya update jika data pasien benar-benar berubah
- Menjaga performa realtime tetap ringan
───────────────────────────────────────────────*/

export interface FiltersState {
  search: string;
  pembiayaan: string;
  kelas: string;
}

export interface State {
  patients: Pasien[];
  filteredPatients: Pasien[];
  filters: FiltersState;
  summary: any;
  modalMode: string | null;
  selectedPatient: Pasien | null;
  scanning: boolean;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  currentPage: number;
  perPage: number;
}

export type Summary = {
  total: number;
  male: number;
  female: number;
  growth: number;
  lastSync: string;
};

export type Action =
  | { type: "SET_PATIENTS"; payload: Pasien[] }
  | { type: "APPLY_FILTER"; payload: any }
  | { type: "SET_SUMMARY"; payload: any }
  | { type: "SET_MODAL_MODE"; payload: string | null }
  | { type: "SET_SELECTED_PATIENT"; payload: Pasien | null }
  | { type: "CLOSE_MODAL" }
  | { type: "SET_SCANNING"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_LIVE"; payload: boolean }
  | { type: "SET_PAGE"; payload: number }
  | { type: "SET_PER_PAGE"; payload: number }
  | { type: "REMOVE_PATIENT"; payload: { id: string } };

export const initialState: State = {
  patients: [],
  filteredPatients: [],
  filters: { search: "", pembiayaan: "", kelas: "" },
  summary: {},
  modalMode: null,
  selectedPatient: null,
  scanning: true,
  loading: false,
  error: null,
  isLive: false,
  currentPage: 1,
  perPage: 10,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    /*───────────────────────────────────────────────
     🔹 Pasien utama (dengan guard anti-loop)
    ───────────────────────────────────────────────*/
    case "SET_PATIENTS": {
      const newData = action.payload || [];

      if (JSON.stringify(state.patients) === JSON.stringify(newData)) {
        return state;
      }

      const filters = state.filters ?? { search: "", pembiayaan: "", kelas: "" };
      const filtered = filterPatientsByStateFilters(newData, filters);

      return {
        ...state,
        patients: newData,
        filteredPatients: filtered,
        filters,
        summary: calculateSummary(filtered),
        loading: false,
      };
    }

    case "REMOVE_PATIENT": {
      const { id } = action.payload;
      const patients = state.patients.filter((p) => p.id !== id);
      const filters = state.filters ?? { search: "", pembiayaan: "", kelas: "" };
      const filtered = filterPatientsByStateFilters(patients, filters);
      const clearedSelection = state.selectedPatient?.id === id;
      return {
        ...state,
        patients,
        filteredPatients: filtered,
        summary: calculateSummary(filtered),
        selectedPatient: clearedSelection ? null : state.selectedPatient,
        modalMode: clearedSelection ? null : state.modalMode,
      };
    }

    /*───────────────────────────────────────────────
     🔹 Filter pasien (simpan nilai filter + hasil filter)
    ───────────────────────────────────────────────*/
    case "APPLY_FILTER": {
      const payload = action.payload ?? {};
      const search = String(payload.search ?? "").trim();
      const pembiayaan = String(payload.pembiayaan ?? "");
      const kelas = String(payload.kelas ?? "");
      const filters: FiltersState = { search, pembiayaan, kelas };

      const filtered = filterPatientsByStateFilters(state.patients, filters);

      return {
        ...state,
        filters,
        filteredPatients: filtered,
        summary: calculateSummary(filtered),
        currentPage: 1,
      };
    }

    /*───────────────────────────────────────────────
     🔹 Summary dan status
    ───────────────────────────────────────────────*/
    case "SET_SUMMARY":
      return { ...state, summary: action.payload };

    case "SET_MODAL_MODE":
      return { ...state, modalMode: action.payload };

    case "SET_SELECTED_PATIENT":
      return { ...state, selectedPatient: action.payload };

    case "CLOSE_MODAL":
      return { ...state, modalMode: null, selectedPatient: null };

    case "SET_SCANNING":
      return { ...state, scanning: action.payload };

    case "SET_LOADING":
      return { ...state, loading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_LIVE":
      return { ...state, isLive: action.payload };

    /*───────────────────────────────────────────────
     🔹 Pagination
    ───────────────────────────────────────────────*/
    case "SET_PAGE":
      return { ...state, currentPage: action.payload };

    case "SET_PER_PAGE":
      return { ...state, perPage: action.payload, currentPage: 1 };

    default:
      return state;
  }
}
