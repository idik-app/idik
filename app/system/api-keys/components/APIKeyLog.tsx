"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAPIKeys } from "../hooks/useAPIKeys";

export function APIKeyLog() {
  const { fetchLogs } = useAPIKeys();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetchLogs();
      setLogs(res);
      setLoading(false);
    };
    load();
  }, [fetchLogs]);

  const handleExport = () => {
    const data = logs.map((l) => ({
      waktu: new Date(l.created_at).toLocaleString("id-ID"),
      aksi: l.action,
      pengguna: l.user_name,
      key: l.key_name,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api_key_logs_${Date.now()}.json`;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mt-8 rounded-xl border border-cyan-700/40 bg-black/40 p-4 backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gold">Activity Log</h2>
        <Button
          size="sm"
          onClick={handleExport}
          className="bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30"
        >
          Export Log
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full bg-cyan-500/10" />
          ))}
        </div>
      ) : (
        <ScrollArea className="h-48 pr-2">
          <ul className="space-y-1 text-sm text-cyan-200/80">
            {logs.length === 0 ? (
              <li className="text-cyan-400/50 italic">Belum ada aktivitas</li>
            ) : (
              logs.map((log, i) => (
                <li key={i} className="border-b border-cyan-700/20 pb-1">
                  <span className="text-cyan-400">
                    {new Date(log.created_at).toLocaleString("id-ID")}
                  </span>{" "}
                  — {log.user_name}{" "}
                  <span className="text-gold">{log.action}</span> key{" "}
                  <span className="text-cyan-300">{log.key_name}</span>
                </li>
              ))
            )}
          </ul>
        </ScrollArea>
      )}
    </motion.div>
  );
}
