"use client";
import { Search } from "react-bootstrap-icons";
import { RotateCcw } from "lucide-react";
import { usePasien, usePasienDispatch } from "../../contexts/PasienContext";
import { useNotification } from "@/contexts/NotificationContext";

/*───────────────────────────────────────────────
 🔍 ToolbarSearchFilter v2.0 — Default Export Fix
───────────────────────────────────────────────*/
export default function ToolbarSearchFilter() {
  const { filters } = usePasien();
  const dispatch = usePasienDispatch();
  const { show } = useNotification();

  const handleChange = (value: string) => {
    const newFilters = { ...filters, search: value };
    dispatch({ type: "APPLY_FILTER", payload: newFilters });
  };

  const handleReset = () => {
    const defaultFilters = {
      search: "",
      pembiayaan: "",
      kelas: "",
    };
    dispatch({ type: "APPLY_FILTER", payload: defaultFilters });
    show({ type: "info", message: "🔄 Filter dikembalikan ke default." });
  };

  const selectClass =
    "min-h-[38px] rounded-lg border border-cyan-600/50 bg-black/30 px-3 py-2 text-sm " +
    "text-cyan-100 focus:border-yellow-400/80 focus:outline-none focus:ring-1 " +
    "focus:ring-yellow-400/40 transition shrink-0";

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {/* Baris 1 — pencarian penuh */}
      <div className="flex w-full items-center gap-2 rounded-lg border border-cyan-600/40 bg-black/25 px-3 py-2.5 shadow-inner">
        <Search size={18} className="shrink-0 text-cyan-400" aria-hidden />
        <input
          type="text"
          placeholder="Cari: Nama / No.RM / Dokter / Pembiayaan …"
          className="min-w-0 flex-1 bg-transparent text-sm text-cyan-100 placeholder:text-cyan-600/80 outline-none"
          value={filters.search}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      {/* Baris 2 — filter + reset */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={filters.pembiayaan}
          onChange={(e) =>
            dispatch({
              type: "APPLY_FILTER",
              payload: { ...filters, pembiayaan: e.target.value },
            })
          }
          className={`${selectClass} w-full sm:min-w-[11rem] sm:w-auto`}
        >
          <option value="">Semua Pembiayaan</option>
          <option value="BPJS">BPJS</option>
          <option value="NPBI">NPBI</option>
          <option value="Umum">Umum</option>
          <option value="Asuransi">Asuransi</option>
        </select>

        <select
          value={filters.kelas}
          onChange={(e) =>
            dispatch({
              type: "APPLY_FILTER",
              payload: { ...filters, kelas: e.target.value },
            })
          }
          className={`${selectClass} w-full sm:min-w-[9.5rem] sm:w-auto`}
        >
          <option value="">Semua Kelas</option>
        <option value="Kelas 1">1</option>
        <option value="Kelas 2">2</option>
        <option value="Kelas 3">3</option>
        </select>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex min-h-[38px] shrink-0 items-center justify-center gap-2 rounded-lg border border-cyan-600/50 px-4 py-2 text-sm text-cyan-200 transition hover:border-yellow-400/60 hover:text-yellow-300 sm:ml-auto"
        >
          <RotateCcw size={16} className="shrink-0" />
          Reset
        </button>
      </div>
    </div>
  );
}
