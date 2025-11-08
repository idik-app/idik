"use client";
import { Download } from "lucide-react";

interface Props {
  data: any[];
}

export default function ExportReportDokter({ data }: Props) {
  const handleExport = () => {
    if (!data || data.length === 0) return;

    const header = Object.keys(data[0]);
    const rows = data.map((obj) =>
      header.map((key) => JSON.stringify(obj[key] ?? "")).join(",")
    );

    const csvContent = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_dokter_${new Date()
      .toLocaleDateString("id-ID")
      .replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleExport}
      disabled={!data || data.length === 0}
      className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-900/40 to-cyan-700/30 
                 hover:from-cyan-800/60 hover:to-cyan-700/50 rounded-lg border border-cyan-500/40 
                 text-cyan-200 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      title="Ekspor data dokter ke CSV"
    >
      <Download size={16} />
      <span>Ekspor</span>
    </button>
  );
}
