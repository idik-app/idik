"use client";
import { motion, useSpring, useTransform } from "framer-motion";
import {
  PeopleFill,
  PersonFill,
  PersonFillAdd,
  ArrowUpRight,
  ArrowDownRight,
} from "react-bootstrap-icons";
import { usePasien } from "../../contexts/PasienContext";
import { calculateSummary } from "../../contexts/PasienSummary";

/*───────────────────────────────────────────────
📊 ToolbarStatsCard v2.0 — JARVIS Summary Sync
───────────────────────────────────────────────*/
export default function ToolbarStatsCard() {
  const { summary, patients } = usePasien();

  // Gunakan summary dari context; jika belum terisi tapi data pasien sudah ada,
  // hitung ulang secara lokal agar tidak terkunci di 0.
  const safeSummary =
    summary && typeof summary.total === "number"
      ? summary
      : calculateSummary(patients || []);

  const total = safeSummary.total ?? 0;
  const male = safeSummary.male ?? 0;
  const female = safeSummary.female ?? 0;
  const growth = safeSummary.growth ?? 0;
  const trendUp = growth >= 0;

  // Animasi angka
  const totalSpring = useSpring(total, { stiffness: 100, damping: 14 });
  const maleSpring = useSpring(male, { stiffness: 100, damping: 14 });
  const femaleSpring = useSpring(female, { stiffness: 100, damping: 14 });

  const totalDisplay = useTransform(totalSpring, (v) => Math.floor(v));
  const maleDisplay = useTransform(maleSpring, (v) => Math.floor(v));
  const femaleDisplay = useTransform(femaleSpring, (v) => Math.floor(v));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex w-full flex-col gap-2 rounded-lg border border-cyan-600/40 bg-black/30 px-4 py-3 text-sm shadow-inner lg:w-auto lg:min-w-[17rem] lg:shrink-0"
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-cyan-500/90">
        Ringkasan filter
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Total */}
        <div className="flex items-center gap-2">
          <PeopleFill size={16} className="text-cyan-400" />
          <span className="text-cyan-300/90">Total</span>
          <motion.span className="text-lg font-bold tabular-nums text-yellow-400">
            {totalDisplay}
          </motion.span>
        </div>

        <span className="hidden h-4 w-px bg-cyan-700/60 sm:block" aria-hidden />

        {/* JK */}
        <div className="flex items-center gap-4 text-cyan-200">
          <div className="flex items-center gap-1.5">
            <PersonFill size={14} className="text-cyan-300" />
            <motion.span className="tabular-nums font-medium text-yellow-200">
              {maleDisplay}
            </motion.span>
          </div>
          <div className="flex items-center gap-1.5">
            <PersonFillAdd size={14} className="text-pink-300" />
            <motion.span className="tabular-nums font-medium text-pink-200">
              {femaleDisplay}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Tren */}
      <div className="flex items-center gap-2 border-t border-cyan-700/30 pt-2 text-xs">
        {trendUp ? (
          <ArrowUpRight size={14} className="shrink-0 text-green-400" />
        ) : (
          <ArrowDownRight size={14} className="shrink-0 text-red-400" />
        )}
        <span
          className={`font-semibold tabular-nums ${trendUp ? "text-green-400" : "text-red-400"}`}
        >
          {trendUp ? "+" : ""}
          {growth.toFixed(1)}%
        </span>
        <span className="text-cyan-500">vs minggu lalu</span>
      </div>
    </motion.div>
  );
}
