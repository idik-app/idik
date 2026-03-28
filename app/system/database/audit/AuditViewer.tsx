"use client";

/**
 * 🧩 AuditViewer
 * Komponen penampil riwayat aktivitas database.
 * Menarik data dari endpoint /api/audit/log dan menampilkan 100 log terakhir.
 */

import { useEffect, useState, useCallback, memo } from "react";

const AuditLogRow = memo(function AuditLogRow({ log }: { log: Record<string, unknown> }) {
  const meta = log.metadata;
  const metaStr =
    meta && typeof meta === "object"
      ? JSON.stringify(meta, null, 2)
      : String(meta ?? "");

  return (
    <div className="border border-cyan-700/10 bg-gray-800/40 rounded-lg p-3 flex justify-between hover:bg-gray-800/60 transition">
      <div>
        <span
          className={`font-semibold ${
            log.status === "success" ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {typeof log.action === "string" && log.action
            ? log.action.toUpperCase()
            : String(log.event_type ?? "")}
        </span>
        <pre className="text-gray-400 text-xs mt-1 whitespace-pre-wrap break-words max-w-[min(100vw-8rem,42rem)]">
          {metaStr}
        </pre>
      </div>
      <span className="text-gray-500 text-xs whitespace-nowrap ml-4 shrink-0">
        {log.created_at
          ? new Date(String(log.created_at)).toLocaleString("id-ID")
          : ""}
      </span>
    </div>
  );
});

export default function AuditViewer() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit/log", { cache: "no-store" });
      const data = await res.json();
      if (data?.ok && Array.isArray(data.data)) {
        setLogs(data.data);
        setError(null);
      } else {
        setLogs([]);
        setError(
          typeof data?.message === "string"
            ? data.message
            : res.status === 401
              ? "Unauthorized"
              : res.status === 403
                ? "Forbidden"
                : "Gagal memuat audit log"
        );
      }
    } catch (err) {
      console.error("❌ fetchLogs error:", err);
      setLogs([]);
      setError("Gagal memuat audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  if (loading)
    return (
      <div className="text-center text-gray-400 py-6">Memuat audit log...</div>
    );

  if (!logs.length)
    return (
      <div className="text-center text-gray-500 py-6">
        {error ? error : "Tidak ada aktivitas yang tercatat."}
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

      <div className="max-h-[480px] overflow-y-auto text-sm space-y-2 overscroll-contain">
        {logs.map((log) => (
          <AuditLogRow key={log.id} log={log as Record<string, unknown>} />
        ))}
      </div>
    </section>
  );
}
