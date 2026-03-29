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
  Activity,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

/* ============================================================
   CATHLAB JARVIS SYSTEM PAGE
   v5.0 — Build Meta + Git + Autonomous Diagnostics + Telemetry
   ============================================================ */

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

  const [issues, setIssues] = useState<any[]>([]);
  const [loadingDiag, setLoadingDiag] = useState(true);

  /* =====================================
     FETCH BUILD META + SYSTEM STATUS
  ===================================== */
  useEffect(() => {
    fetch("/.buildmeta.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMeta(data);
      })
      .catch(() => {
        setMeta((m) => ({
          ...m,
          branch: "unknown",
          commit: "fallback",
        }));
      });

    // Supabase check
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

  /* =====================================
     FETCH AUTONOMOUS DIAGNOSTICS
  ===================================== */
  useEffect(() => {
    fetch("/api/system/diagnostics")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        setIssues(res?.issues || []);
        setLoadingDiag(false);
      })
      .catch(() => {
        setLoadingDiag(false);
      });
  }, []);

  const buildTime = new Date(meta.buildDate).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <motion.div
      className="p-6 min-h-full min-w-0 text-cyan-100 
                 bg-gradient-to-b from-[#0a0f18] to-[#0d1c28]
                 backdrop-blur-lg border border-cyan-500/20 rounded-2xl 
                 shadow-[0_0_30px_rgba(0,255,255,0.1)] space-y-10"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* HEADER */}
      <h1 className="text-3xl font-bold tracking-widest text-cyan-300 mb-4 flex items-center gap-3">
        <Cpu className="text-yellow-400 drop-shadow-[0_0_6px_#FFD700]" />
        IDIK Autonomous System Dashboard
      </h1>

      {/* GRID 1 — Build & Connectivity */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card icon={<GitBranch />} title="Branch" value={meta.branch} />
        <Card icon={<GitCommit />} title="Commit" value={meta.commit} />
        <Card icon={<Clock />} title="Build Date" value={buildTime} />
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
        />
      </div>

      {/* LINK TO GITHUB */}
      {meta.repo && (
        <motion.div
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 150, damping: 12 }}
          className="mt-6 flex justify-center"
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

      {/* GRID 2 — Autonomous Diagnostics */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-2 mb-4">
          <Activity className="text-cyan-400" />
          Autonomous Diagnostics
        </h2>

        {loadingDiag ? (
          <p className="text-gray-400 italic">Analyzing modules…</p>
        ) : issues.length === 0 ? (
          <div className="flex items-center gap-3 text-green-400">
            <ShieldCheck />
            Sistem stabil dan tidak ditemukan masalah.
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3 border border-cyan-700/40 rounded bg-black/40 shadow-inner"
              >
                <p
                  className={`font-bold ${
                    issue.type === "error"
                      ? "text-red-400"
                      : issue.type === "warning"
                      ? "text-yellow-400"
                      : "text-cyan-300"
                  }`}
                >
                  {issue.type.toUpperCase()}
                </p>
                <p>{issue.message}</p>
                {issue.file && (
                  <p className="text-xs text-cyan-500 mt-1">{issue.file}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="text-center text-xs text-gray-500 mt-10">
        IDIK Autonomous Kernel — Monitoring Enabled
      </div>
    </motion.div>
  );
}

/* ==============================================================
   Reusable Card Component
   ============================================================== */

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
