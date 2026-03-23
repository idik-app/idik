"use client";
import { useEffect, useState } from "react";

interface Tindakan {
  tanggal: string;
  dokter: string;
  tindakan: string;
}

export default function TindakanTerbaru() {
  const [data, setData] = useState<Tindakan[]>([]);

  useEffect(() => {
    // Mode lokal sementara
    setData([
      { tanggal: "13-11-2025", dokter: "dr. Deo", tindakan: "PCI RCA" },
      { tanggal: "13-11-2025", dokter: "dr. Faishal", tindakan: "CAG" },
      { tanggal: "12-11-2025", dokter: "dr. Rahma", tindakan: "Pacing" },
      { tanggal: "12-11-2025", dokter: "dr. Taufik", tindakan: "PTCA LAD" },
      { tanggal: "11-11-2025", dokter: "dr. Frans", tindakan: "CAG + PTCA" },
    ]);

    /**
     * Siapkan untuk Supabase:
     * const { data: tindakan } = await supabase.from("tindakan")
     *   .select("tanggal, dokter, tindakan")
     *   .order("tanggal", { ascending: false })
     *   .limit(5);
     */
  }, []);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-4 shadow-lg border border-cyan-700/30">
      <h3 className="text-lg font-semibold text-cyan-400 mb-3">
        Tindakan Terbaru
      </h3>
      <table className="w-full text-sm text-gray-300">
        <thead>
          <tr className="border-b border-cyan-700/30">
            <th className="py-2 text-left">Tanggal</th>
            <th className="py-2 text-left">Dokter</th>
            <th className="py-2 text-left">Tindakan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="hover:bg-cyan-900/20 transition">
              <td className="py-2">{item.tanggal}</td>
              <td className="py-2">{item.dokter}</td>
              <td className="py-2">{item.tindakan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
