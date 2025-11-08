"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

/*───────────────────────────────────────────────
 ⚙️ VersionPage – Cathlab JARVIS Mode v5.9.1
   🔹 Production-grade, ringan, dan stabil
   🔹 Auto-sort versi terbaru
   🔹 Modal hologram dengan Export JSON
───────────────────────────────────────────────*/

interface VersionData {
  versions: Record<string, string>;
  timestamp: string;
}

interface Changelog {
  version: string;
  codename: string;
  releaseDate: string;
  overview: string;
  coreUpdates: { title: string; summary: string }[];
}

export default function VersionPage() {
  const [active, setActive] = useState<VersionData | null>(null);
  const [changelogs, setChangelogs] = useState<Changelog[]>([]);
  const [selected, setSelected] = useState<Changelog | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [v, c] = await Promise.all([
          fetch("/api/version?ts=" + Date.now(), { cache: "no-store" }).then(
            (r) => (r.ok ? r.json() : null)
          ),
          fetch("/CHANGELOG.json", { cache: "no-store" }).then((r) =>
            r.ok ? r.json() : null
          ),
        ]);
        if (v) setActive(v);
        if (c) {
          const arr = Array.isArray(c) ? c : [c];
          // Sort versi terbaru di atas (jika pakai angka)
          arr.sort((a, b) => (b.version > a.version ? 1 : -1));
          setChangelogs(arr);
        }
      } catch {
        setError(true);
      }
    })();
  }, []);

  const handleExport = (data: Changelog) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CHANGELOG_v${data.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error)
    return (
      <div className="p-6 text-red-400 text-center">
        ⚠️ Gagal memuat data versi atau changelog.
      </div>
    );

  if (!active)
    return (
      <div className="p-6 text-center text-cyan-300 animate-pulse">
        Loading version data...
      </div>
    );

  return (
    <div className="relative p-6 text-cyan-200 overflow-y-auto max-h-screen rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-[#0a0f1a] via-[#081523] to-[#0b1a2a] shadow-[0_0_25px_rgba(0,255,255,0.1)]">
      {/* glowing edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-gradient-to-b from-transparent via-yellow-400/50 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />

      {/* header build info */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-yellow-400">
          Active Build Versions
        </h1>
        <ul className="mt-3 text-sm space-y-1">
          {Object.entries(active.versions).map(([name, ver]) => (
            <li key={name}>
              <span className="text-cyan-300 font-medium">{name}:</span> {ver}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Build checked at: {new Date(active.timestamp).toLocaleString()}
        </p>
      </header>

      {/* timeline changelog */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative border-l border-cyan-500/30 pl-6 space-y-10"
      >
        {changelogs.map((log) => (
          <motion.div
            key={log.version}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelected(log)}
            className="relative cursor-pointer group"
          >
            <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_#00FFFF] group-hover:scale-125 transition-transform" />
            <div className="bg-[#0d1b28]/60 border border-cyan-400/30 rounded-xl p-4 backdrop-blur-md group-hover:border-yellow-400/50 transition-all">
              <h2 className="text-lg font-semibold text-yellow-400">
                v{log.version} — {log.codename}
              </h2>
              <p className="text-xs text-gray-500 mb-2">{log.releaseDate}</p>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
                {log.overview}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* modal detail changelog */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-xl bg-gradient-to-b from-[#061019] to-[#0b1a2a] border border-cyan-400/30 rounded-2xl p-6 text-gray-200 shadow-[0_0_40px_rgba(0,255,255,0.25)]"
            >
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-yellow-400 transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>

              <h2 className="text-xl font-bold text-yellow-400 mb-1">
                v{selected.version} — {selected.codename}
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                {selected.releaseDate}
              </p>
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                {selected.overview}
              </p>

              <h3 className="text-cyan-300 font-semibold mb-2">Core Updates</h3>
              <ul className="list-disc list-inside text-sm text-gray-300 space-y-1 max-h-[40vh] overflow-y-auto pr-2">
                {selected.coreUpdates.map((u, i) => (
                  <li key={i}>
                    <span className="text-cyan-400">{u.title}:</span>{" "}
                    {u.summary}
                  </li>
                ))}
              </ul>

              {/* tombol export */}
              <div className="flex justify-end mt-5">
                <button
                  onClick={() => handleExport(selected)}
                  className="flex items-center gap-2 text-sm font-semibold text-cyan-200 border border-cyan-400/30 rounded-lg px-4 py-2 hover:bg-cyan-500/10 hover:border-cyan-400/60 transition-all"
                >
                  <Download size={16} /> Export JSON
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
