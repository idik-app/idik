"use client";

/**
 * 🧩 AuditViewer
 * Komponen penampil riwayat aktivitas database.
 * Menarik data dari endpoint /api/audit/log dan menampilkan 100 log terakhir.
 */

import { useEffect, useState } from "react";

export default function AuditViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/log", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) setLogs(data.data);
      else setLogs([]);
    } catch (err) {
      console.error("❌ fetchLogs error:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading)
    return (
      <div className="text-center text-gray-400 py-6">Memuat audit log...</div>
    );

  if (!logs.length)
    return (
      <div className="text-center text-gray-500 py-6">
        Tidak ada aktivitas yang tercatat.
      </div>
    );

  return (
    <section className="bg-gray-900/50 rounded-2xl border border-cyan-700/30 p-6 backdrop-blur-sm">
      <header className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-cyan-300">
          Audit Trail (100 terbaru)
        </h2>
        <button
          onClick={fetchLogs}
          className="text-xs text-cyan-400 hover:text-cyan-200 transition-colors"
        >
          🔄 Muat Ulang
        </button>
      </header>

      <div className="max-h-[480px] overflow-y-auto text-sm space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="border border-cyan-700/10 bg-gray-800/40 rounded-lg p-3 flex justify-between hover:bg-gray-800/60 transition"
          >
            <div>
              <span
                className={`font-semibold ${
                  log.status === "success" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {log.action?.toUpperCase() || log.event_type}
              </span>
              <pre className="text-gray-400 text-xs mt-1">
                {JSON.stringify(log.metadata || {}, null, 2)}
              </pre>
            </div>
            <span className="text-gray-500 text-xs whitespace-nowrap ml-4">
              {new Date(log.created_at).toLocaleString("id-ID")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
