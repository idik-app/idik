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

  return (
    <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
      {/* Input Search */}
      <div className="flex items-center gap-2 flex-grow md:w-64">
        <Search size={18} className="text-cyan-400" />
        <input
          type="text"
          placeholder="Cari: Nama / No.RM / Dokter / Pembiayaan ..."
          className="w-full bg-transparent border-b border-cyan-700 text-cyan-200
                     placeholder-cyan-600 outline-none px-2 pb-1 text-sm
                     focus:border-yellow-400 focus:text-yellow-300 transition-all"
          value={filters.search}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>

      {/* Filter Pembiayaan */}
      <select
        value={filters.pembiayaan}
        onChange={(e) =>
          dispatch({
            type: "APPLY_FILTER",
            payload: { ...filters, pembiayaan: e.target.value },
          })
        }
        className="bg-transparent border border-cyan-700 text-cyan-200 rounded-md
                   px-2 py-1 text-sm focus:border-yellow-400 transition"
      >
        <option value="">Semua Pembiayaan</option>
        <option value="BPJS">BPJS</option>
        <option value="BPJS PBI">BPJS PBI</option>
        <option value="Umum">Umum</option>
        <option value="Asuransi">Asuransi</option>
      </select>

      {/* Filter Kelas */}
      <select
        value={filters.kelas}
        onChange={(e) =>
          dispatch({
            type: "APPLY_FILTER",
            payload: { ...filters, kelas: e.target.value },
          })
        }
        className="bg-transparent border border-cyan-700 text-cyan-200 rounded-md
                   px-2 py-1 text-sm focus:border-yellow-400 transition"
      >
        <option value="">Semua Kelas</option>
        <option value="Kelas 1">Kelas 1</option>
        <option value="Kelas 2">Kelas 2</option>
        <option value="Kelas 3">Kelas 3</option>
      </select>

      {/* Tombol Reset */}
      <button
        onClick={handleReset}
        className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border
                   border-cyan-700 text-cyan-300 hover:text-yellow-400
                   hover:border-yellow-400 transition"
      >
        <RotateCcw size={14} />
        Reset
      </button>
    </div>
  );
}
