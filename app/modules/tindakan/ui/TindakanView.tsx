"use client";

import { useState, useEffect } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Filter,
  Undo,
  Redo,
  Download,
  RefreshCcw,
  PlusCircle,
} from "lucide-react";
import DiagnosticsHUD from "@/components/DiagnosticsHUD";

/*───────────────────────────────────────────────
 🧠 Cathlab JARVIS Mode v7.0 – TindakanView
    - Full interactive grid (editable)
    - Toolbar filter + Topbar + HUD integrated
───────────────────────────────────────────────*/

type TindakanRow = {
  id: number;
  tanggal: string;
  rm: string;
  pasien: string;
  dokter: string;
  perawat: string;
};

export default function TindakanView() {
  const [rows, setRows] = useState<TindakanRow[]>([]);

  const columns: GridColDef[] = [
    { field: "tanggal", headerName: "Tanggal", width: 110, editable: true },
    { field: "rm", headerName: "No. RM", width: 100, editable: true },
    { field: "pasien", headerName: "Nama Pasien", width: 180, editable: true },
    { field: "dokter", headerName: "Dokter", width: 160, editable: true },
    { field: "perawat", headerName: "Perawat", width: 160, editable: true },
  ];

  const addRow = () => {
    const id =
      rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.id)) + 1;
    setRows([
      ...rows,
      { id, tanggal: "", rm: "", pasien: "", dokter: "", perawat: "" },
    ]);
  };

  /*───────────────────────────────
    RENDER
  ───────────────────────────────*/
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-black via-gray-900 to-cyan-950 text-white overflow-hidden">
      {/* 🔹 Topbar */}
      <header className="sticky top-0 z-20 flex justify-between items-center bg-black/40 border-b border-cyan-800/30 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-lg font-semibold tracking-wide">
            ☰ TINDAKAN MEDIS
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <input
            type="text"
            placeholder="🔍 Cari pasien..."
            className="bg-gray-900/60 border border-cyan-700/40 rounded-md px-3 py-1 text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-700 to-gray-700 border border-cyan-400/50" />
        </div>
      </header>

      {/* 🧩 Toolbar Filter */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-cyan-800/20 bg-gray-900/30 backdrop-blur-sm">
        <input
          className="px-2 py-1 rounded bg-gray-800/60 border border-cyan-700/30 text-sm"
          placeholder="📅 Tanggal"
        />
        <input
          className="px-2 py-1 rounded bg-gray-800/60 border border-cyan-700/30 text-sm"
          placeholder="👨‍⚕️ Dokter"
        />
        <input
          className="px-2 py-1 rounded bg-gray-800/60 border border-cyan-700/30 text-sm"
          placeholder="👩‍⚕️ Perawat"
        />
        <input
          className="px-2 py-1 rounded bg-gray-800/60 border border-cyan-700/30 text-sm"
          placeholder="⚙️ Tindakan"
        />

        <div className="flex gap-2 ml-auto">
          <Button
            className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm flex items-center gap-1"
            onClick={addRow}
          >
            <PlusCircle size={16} /> Tambah
          </Button>
          <Button
            variant="outline"
            className="text-gray-200 border-cyan-700/40 text-sm"
          >
            <Undo size={16} /> Undo
          </Button>
          <Button
            variant="outline"
            className="text-gray-200 border-cyan-700/40 text-sm"
          >
            <Redo size={16} /> Redo
          </Button>
          <Button
            variant="outline"
            className="text-gray-200 border-cyan-700/40 text-sm"
          >
            <Download size={16} /> Export
          </Button>
          <Button
            variant="outline"
            className="text-gray-200 border-cyan-700/40 text-sm"
          >
            <RefreshCcw size={16} /> Refresh
          </Button>
        </div>
      </div>

      {/* 📋 DataGrid */}
      <div className="p-6">
        <div
          className="rounded-2xl border border-cyan-800/40 bg-gray-900/40 backdrop-blur-sm overflow-hidden shadow-lg"
          style={{ height: "60vh" }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            disableSelectionOnClick={false}
            sx={{
              color: "#e0f2fe",
              border: "none",
              backgroundColor: "transparent",
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: "rgba(6,182,212,0.08)",
                borderBottom: "1px solid rgba(6,182,212,0.25)",
                color: "#22d3ee",
                fontWeight: 600,
                fontSize: 13,
              },
              "& .MuiDataGrid-cell": {
                borderBottom: "1px solid rgba(6,182,212,0.12)",
              },
              "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell--editing":
                {
                  backgroundColor: "rgba(4,80,100,0.4)",
                },
              "& .MuiDataGrid-row:hover": {
                backgroundColor: "rgba(6,182,212,0.05)",
              },
              "& .MuiDataGrid-row.Mui-selected": {
                backgroundColor: "rgba(255,215,0,0.15) !important",
                color: "#fff8dc",
              },
              "& .MuiDataGrid-footerContainer": {
                backgroundColor: "rgba(6,182,212,0.05)",
                borderTop: "1px solid rgba(6,182,212,0.2)",
              },
            }}
          />
        </div>
      </div>

      {/* 📈 Panel Ringkas */}
      <motion.div
        className="absolute bottom-24 right-6 bg-black/50 border border-cyan-700/40 rounded-xl px-4 py-3 text-xs text-cyan-300 space-y-1 shadow-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>▸ Total baris: {rows.length}</div>
        <div>▸ Hubungkan ke API/DB untuk sinkronisasi otomatis.</div>
      </motion.div>

      {/* 🧭 Bottom DiagnosticsHUD */}
      <DiagnosticsHUD />
    </div>
  );
}
