"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/supabaseClient";

/** 💠 TindakanTable v7.1 — Spreadsheet Editor JARVIS Mode */

type Row = {
  id?: number;
  tanggal: string;
  nama: string;
  dokter: string;
  tindakan: string;
  status: string;
};

type EditableField = Exclude<keyof Row, "id">;

export default function TindakanTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<{ row: number; field: string } | null>(
    null
  );
  const [value, setValue] = useState<string>("");

  /** 🧩 Muat data awal */
  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("tindakan")
        .select("*")
        .order("id");
      if (error) console.error("Gagal memuat data:", error);
      if (data) setRows(data);
    }
    fetchData();
  }, []);

  /** 💾 Simpan perubahan ke Supabase */
  async function handleSave(
    rowIndex: number,
    field: EditableField,
    newValue: string
  ) {
    try {
      const updatedRows = [...rows];
      const row = updatedRows[rowIndex];
      row[field] = newValue;
      setRows(updatedRows);

      if (row.id) {
        await supabase
          .from("tindakan")
          .update({ [field]: newValue })
          .eq("id", row.id);
      }
    } catch (err) {
      console.error("Gagal menyimpan:", err);
    }
  }

  /** 🧠 Render sel editable */
  const renderCell = (row: Row, rowIndex: number, field: keyof Row) => {
    const isEditing = editing?.row === rowIndex && editing?.field === field;
    const cellValue = isEditing ? value : String(row[field] ?? "");

    return (
      <div
        onClick={() => {
          if (field === "id") return;
          setEditing({ row: rowIndex, field });
          setValue(String(row[field] ?? ""));
        }}
        className={`px-2 py-1 rounded-md transition-all duration-200 ${
          isEditing
            ? "bg-cyan-900/60 border border-cyan-400 text-cyan-200"
            : "hover:bg-cyan-950/40 cursor-pointer"
        }`}
      >
        {isEditing ? (
          <input
            autoFocus
            value={cellValue}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              handleSave(rowIndex, field as EditableField, value);
              setEditing(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSave(rowIndex, field as EditableField, value);
                setEditing(null);
              } else if (e.key === "Escape") {
                setEditing(null);
              }
            }}
            className="w-full bg-transparent outline-none text-cyan-100"
          />
        ) : (
          <span>{cellValue}</span>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative rounded-2xl border border-cyan-900/40 bg-black/30 backdrop-blur-md shadow-inner shadow-cyan-900/20 overflow-hidden"
    >
      {/* 🧾 Header Table */}
      <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-semibold text-cyan-300 border-b border-cyan-800/40 bg-black/40">
        <div>TANGGAL</div>
        <div>NAMA PASIEN</div>
        <div>DOKTER</div>
        <div>JENIS TINDAKAN</div>
        <div>STATUS</div>
      </div>

      {/* 📋 Isi Tabel */}
      <motion.div
        className="divide-y divide-cyan-950/60 text-gray-200 text-sm"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08 } },
        }}
      >
        {rows.map((row, i) => (
          <motion.div
            key={row.id ?? i}
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
            className={`grid grid-cols-5 gap-4 px-6 py-2 items-center transition-all duration-200 ${
              row.status === "Selesai"
                ? "text-cyan-300"
                : row.status === "Proses"
                ? "text-amber-300"
                : row.status === "Menunggu"
                ? "text-gray-400"
                : "text-white"
            }`}
          >
            {renderCell(row, i, "tanggal")}
            {renderCell(row, i, "nama")}
            {renderCell(row, i, "dokter")}
            {renderCell(row, i, "tindakan")}
            {renderCell(row, i, "status")}
          </motion.div>
        ))}

        {rows.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500 text-sm italic">
            Memuat data tindakan...
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
