"use client";

import { motion } from "framer-motion";
import {
  GitBranch,
  GitCommit,
  Clock,
  ExternalLink,
  Cpu,
  Database,
  Wifi,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ⚙️ Cathlab JARVIS Developer Dashboard v3.4.7
   🔹 Build Meta & Git Integration
   - Membaca data build dari /public/.buildmeta.json atau environment
   - Menampilkan branch, commit, tanggal build, link GitHub, dan status Supabase
*/

type BuildMeta = {
  branch: string;
  commit: string;
  buildDate: string;
  repo: string;
};

type StatusMeta = {
  supabase: "connected" | "disconnected";
  database: "online" | "offline";
  latency: number | null;
};

export default function SystemPage() {
  const [meta, setMeta] = useState<BuildMeta>({
    branch: process.env.NEXT_PUBLIC_GIT_BRANCH || "unknown",
    commit: process.env.NEXT_PUBLIC_GIT_COMMIT || "local-dev",
    buildDate: new Date().toISOString(),
    repo: process.env.NEXT_PUBLIC_REPO_URL || "",
  });

  const [status, setStatus] = useState<StatusMeta>({
    supabase: "disconnected",
    database: "offline",
    latency: null,
  });

  useEffect(() => {
    // Ambil data buildmeta.json jika ada
    fetch("/.buildmeta.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMeta(data);
      })
      .catch(() => {
        console.log("ℹ️ No .buildmeta.json found, using fallback env");
        setMeta((m) => ({
          ...m,
          branch: "unknown",
          commit: "fallback",
        }));
      });

    // Tes koneksi Supabase & Database latency
    const start = performance.now();
    fetch("/api/database/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const latency = Math.floor(performance.now() - start);
        setStatus({
          supabase: res ? "connected" : "disconnected",
          database: res ? "online" : "offline",
          latency,
        });
      })
      .catch(() => {
        setStatus({
          supabase: "disconnected",
          database: "offline",
          latency: null,
        });
      });
  }, []);

  const buildTime = new Date(meta.buildDate).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <motion.div
      className="p-6 min-h-screen text-cyan-100 bg-gradient-to-b from-[#0a0f18] to-[#0d1c28]
                 backdrop-blur-lg border border-cyan-500/20 rounded-2xl shadow-[0_0_30px_rgba(0,255,255,0.1)]"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <h1 className="text-2xl font-bold tracking-widest text-cyan-300 mb-6 flex items-center gap-2">
        <Cpu
          size={24}
          className="text-yellow-400 drop-shadow-[0_0_6px_#FFD700]"
        />
        BUILD META & GIT INTEGRATION
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          icon={<GitBranch />}
          title="Branch"
          value={meta.branch}
          sub="Active Git branch"
        />
        <Card
          icon={<GitCommit />}
          title="Commit"
          value={meta.commit}
          sub="Last build commit hash"
        />
        <Card
          icon={<Clock />}
          title="Build Date"
          value={buildTime}
          sub="Generated at deployment"
        />
        <Card
          icon={<Database />}
          title="Database"
          value={status.database === "online" ? "Online ✅" : "Offline ❌"}
          sub={status.latency ? `${status.latency} ms` : "No response"}
        />
        <Card
          icon={<Wifi />}
          title="Supabase"
          value={
            status.supabase === "connected" ? "Connected 🟢" : "Disconnected 🔴"
          }
          sub="API connectivity status"
        />
      </div>

      {meta.repo && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
          className="mt-8 flex justify-center"
        >
          <a
            href={`${meta.repo}/commit/${meta.commit}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-xl border border-cyan-400/40 
                       bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 text-sm font-semibold 
                       shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all"
          >
            <ExternalLink size={16} />
            View Commit on GitHub
          </a>
        </motion.div>
      )}

      {/* Footer Info */}
      <div className="text-center text-xs text-gray-500 mt-10">
        Cathlab JARVIS v3.4.7 —{" "}
        {meta.repo ? (
          <a href={meta.repo} className="underline text-cyan-400">
            GitHub Repo
          </a>
        ) : (
          "Repository unavailable"
        )}
      </div>
    </motion.div>
  );
}

/* 🧱 Komponen Card */
function Card({
  icon,
  title,
  value,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 120, damping: 12 }}
      className="flex items-start gap-4 bg-[#0e1b28]/80 border border-cyan-500/30 
                 rounded-xl p-4 shadow-[0_0_15px_rgba(0,255,255,0.15)]"
    >
      <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/30">
        {icon}
      </div>
      <div>
        <h2 className="text-sm text-cyan-400 font-semibold">{title}</h2>
        <p className="text-lg font-bold text-yellow-400">{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </motion.div>
  );
}
