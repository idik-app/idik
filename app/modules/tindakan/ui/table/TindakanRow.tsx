"use client";

import { motion } from "framer-motion";
import EditableCell from "./EditableCell";
import { TindakanActions } from "./actions/TindakanActions";
import { useState, useEffect } from "react";

/**
 * 💠 TindakanRow v7.1 — Cathlab JARVIS Gold-Cyan Hybrid
 * ---------------------------------------------
 * - Menampilkan satu baris data tindakan
 * - Setiap kolom bisa diedit inline
 * - Highlight otomatis saat data disimpan
 */

export default function TindakanRow({ row }: { row: any }) {
  const [highlight, setHighlight] = useState(false);

  /** 💡 Efek highlight baris baru disimpan */
  useEffect(() => {
    if (row._recentlyUpdated) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [row._recentlyUpdated]);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`text-sm ${
        highlight
          ? "bg-cyan-900/40 shadow-[0_0_10px_#00ffff55]"
          : "hover:bg-cyan-950/40"
      } transition-all duration-500`}
    >
      <EditableCell
        id={row.id}
        field="tanggal"
        value={row.tanggal}
        type="date"
      />
      <EditableCell id={row.id} field="nama_pasien" value={row.nama_pasien} />
      <EditableCell id={row.id} field="dokter" value={row.dokter} />
      <EditableCell id={row.id} field="tindakan" value={row.tindakan} />
      <EditableCell id={row.id} field="status" value={row.status} />
      <td className="px-4 py-2 text-right">
        <TindakanActions row={row} />
      </td>
    </motion.tr>
  );
}
