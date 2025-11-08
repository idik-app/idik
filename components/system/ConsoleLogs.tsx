"use client";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ConsoleLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error">(
    "all"
  );
  const [query, setQuery] = useState("");
  const [clock, setClock] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // 🔌 Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 🕒 Real-time clock
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // 🚀 Fetch awal + subscribe realtime Supabase
  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("logs")
        .select("timestamp, level, message")
        .order("id", { ascending: true })
        .limit(200);
      if (data) {
        const formatted = data.map(
          (r) =>
            `[${new Date(
              r.timestamp
            ).toLocaleTimeString()}] [${r.level.toUpperCase()}] ${r.message}`
        );
        setLogs(formatted);
      }
    };

    fetchLogs();

    const channel = supabase
      .channel("logs-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload) => {
          const r = payload.new as any;
          const line = `[${new Date(
            r.timestamp
          ).toLocaleTimeString()}] [${r.level.toUpperCase()}] ${r.message}`;
          setLogs((prev) => [...prev.slice(-199), line]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ⬇️ Auto-scroll
  useEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [logs]);

  // 🗑 Clear logs
  const clearLogs = async () => {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "🧹 Console cleared manually" }),
    });
    setLogs([]);
  };

  // 🧾 Export logs
  const exportLogs = (format: "json" | "csv") => {
    const data =
      format === "json"
        ? JSON.stringify(logs, null, 2)
        : logs.map((l) => `"${l.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([data], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `console-logs-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🎨 Filter dan pencarian
  const filtered = logs.filter((l) => {
    const matchLevel =
      filter === "all" ? true : l.toLowerCase().includes(`[${filter}]`);
    const matchQuery = l.toLowerCase().includes(query.toLowerCase());
    return matchLevel && matchQuery;
  });

  // 🧱 Render
  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-cyan-300">
            System Console & Logs
          </h2>
          <span className="text-sm text-amber-300 font-mono bg-amber-500/10 border border-amber-400/20 rounded-md px-2 py-0.5">
            {clock}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all", "info", "warn", "error"].map((lvl) => {
            const active = filter === lvl;
            const colors =
              lvl === "error"
                ? active
                  ? "border-red-400 text-red-300 bg-red-400/20"
                  : "border-red-700 text-red-500 hover:bg-red-700/30"
                : lvl === "warn"
                ? active
                  ? "border-amber-400 text-amber-300 bg-amber-400/20"
                  : "border-amber-700 text-amber-500 hover:bg-amber-700/30"
                : lvl === "info"
                ? active
                  ? "border-cyan-400 text-cyan-300 bg-cyan-400/20"
                  : "border-cyan-700 text-cyan-500 hover:bg-cyan-700/30"
                : active
                ? "border-cyan-400 text-cyan-300 bg-cyan-400/20"
                : "border-cyan-700 text-cyan-500 hover:bg-cyan-700/30";
            return (
              <button
                key={lvl}
                onClick={() => setFilter(lvl as any)}
                className={`px-3 py-1 text-sm rounded-md border transition ${colors}`}
              >
                {lvl[0].toUpperCase() + lvl.slice(1)}
              </button>
            );
          })}

          <button
            onClick={() => exportLogs("json")}
            className="px-3 py-1 text-sm rounded-md border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            title="Export JSON"
          >
            📜 JSON
          </button>
          <button
            onClick={() => exportLogs("csv")}
            className="px-3 py-1 text-sm rounded-md border border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            title="Export CSV"
          >
            📄 CSV
          </button>
          <button
            onClick={clearLogs}
            className="px-3 py-1 text-sm rounded-md border border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center mb-4">
        <input
          type="text"
          placeholder="Cari log..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm font-mono text-cyan-200 bg-black/40 border border-cyan-700/50 rounded-md placeholder-cyan-700 focus:outline-none focus:ring-1 focus:ring-cyan-400"
        />
      </div>

      {/* Console Panel */}
      <div
        ref={panelRef}
        className="rounded-2xl shadow-[0_0_15px_rgba(0,255,255,0.3)] bg-gradient-to-b from-[#0b0f18]/90 to-[#05070c]/90 backdrop-blur-sm border border-cyan-500/30 text-sm leading-relaxed h-[60vh] overflow-y-auto p-4 font-mono"
      >
        {filtered.length === 0 ? (
          <div className="text-gray-500 text-center">No logs recorded.</div>
        ) : (
          filtered.map((l, i) => {
            const level = l.includes("[ERROR]")
              ? "error"
              : l.includes("[WARN]")
              ? "warn"
              : "info";
            const color =
              level === "error"
                ? "text-red-400"
                : level === "warn"
                ? "text-amber-400"
                : "text-cyan-400";
            const icon =
              level === "error" ? "🔴" : level === "warn" ? "⚠️" : "🧠";
            return (
              <div key={i} className={`whitespace-pre-wrap ${color}`}>
                {icon} {l}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
