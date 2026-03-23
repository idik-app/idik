"use client";
import { FileDown, Plus, RefreshCcw, Search } from "lucide-react";
import { usePasienDispatch } from "../../contexts/PasienContext";

/*───────────────────────────────────────────────
🧬 ToolbarActions v4.0 — Smart Biodata Toolbar
───────────────────────────────────────────────*/
export function ToolbarActions({
  summary,
  filterState,
  handleFilter,
  handleReset,
  handleExport,
}: any) {
  const dispatch = usePasienDispatch();

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between
                 gap-3 border-t border-cyan-700/30 pt-3 mt-2 text-xs"
    >
      {/* ── Kolom Search dan Dropdown ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-cyan-400"
          />
          <input
            type="text"
            placeholder="Cari Nama / No.RM / Dokter / Pembiayaan..."
            value={filterState.search}
            onChange={(e) =>
              handleFilter({ key: "search", value: e.target.value })
            }
            className="pl-7 pr-3 py-1.5 rounded-md bg-cyan-950/40
                       border border-cyan-700/40 text-cyan-200
                       placeholder-cyan-600 focus:outline-none
                       focus:border-yellow-400 transition-colors duration-200
                       w-64 sm:w-72"
          />
        </div>

        {/* Pembiayaan */}
        <select
          value={filterState.pembiayaan}
          onChange={(e) =>
            handleFilter({ key: "pembiayaan", value: e.target.value })
          }
          className="bg-cyan-950/40 border border-cyan-700/40 text-cyan-300
                     rounded-md px-2 py-1.5 focus:border-yellow-400"
        >
          <option>Semua</option>
          <option>BPJS</option>
          <option>Umum</option>
          <option>Asuransi</option>
        </select>

        {/* Kelas */}
        <select
          value={filterState.kelas}
          onChange={(e) =>
            handleFilter({ key: "kelas", value: e.target.value })
          }
          className="bg-cyan-950/40 border border-cyan-700/40 text-cyan-300
                     rounded-md px-2 py-1.5 focus:border-yellow-400"
        >
          <option>Semua</option>
          <option>Kelas 1</option>
          <option>Kelas 2</option>
          <option>Kelas 3</option>
        </select>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1 rounded-md
                     border border-cyan-600/40 text-cyan-300 hover:text-yellow-300
                     hover:border-yellow-400 transition-colors duration-300"
        >
          <RefreshCcw size={13} /> Reset
        </button>
      </div>

      {/* ── Aksi Utama ── */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-3 py-1 rounded-md
                     border border-green-600/40 text-green-300 hover:text-green-400
                     hover:border-green-400 transition-colors duration-300"
        >
          <FileDown size={13} /> Export
        </button>

        {/* Tambah Pasien */}
        <button
          onClick={() =>
            dispatch({
              type: "SET_MODAL_MODE",
              payload: "add",
            })
          }
          className="flex items-center gap-1 px-3 py-1 rounded-md
                     bg-gradient-to-r from-yellow-500/20 to-yellow-400/10
                     border border-yellow-400/50 text-yellow-300 font-semibold
                     hover:from-yellow-500/40 hover:to-yellow-400/20
                     transition-all duration-300 shadow-[0_0_8px_rgba(255,255,0,0.15)]"
        >
          <Plus size={13} /> Tambah Pasien
        </button>
      </div>
    </div>
  );
}
