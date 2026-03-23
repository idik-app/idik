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
      className="flex flex-col sm:flex-row sm:items-center gap-2 px-3 py-2 rounded-lg
                 border border-cyan-700 bg-cyan-950/40
                 shadow-[0_0_15px_rgba(0,255,255,0.08)]
                 text-xs sm:text-sm"
    >
      {/* Total Pasien */}
      <div className="flex items-center gap-2">
        <PeopleFill size={16} className="text-cyan-400" />
        <span className="text-cyan-400">Total:</span>
        <motion.span className="text-yellow-400 font-bold text-base">
          {totalDisplay}
        </motion.span>
      </div>

      {/* L / P */}
      <div className="flex items-center gap-3 text-cyan-400">
        <div className="flex items-center gap-1">
          <PersonFill size={13} className="text-cyan-300" />
          <motion.span className="text-yellow-300">{maleDisplay}</motion.span>
        </div>
        <div className="flex items-center gap-1">
          <PersonFillAdd size={13} className="text-pink-300" />
          <motion.span className="text-pink-300">{femaleDisplay}</motion.span>
        </div>
      </div>

      {/* Tren */}
      <div className="flex items-center gap-1 text-xs font-semibold ml-auto">
        {trendUp ? (
          <ArrowUpRight size={12} className="text-green-400" />
        ) : (
          <ArrowDownRight size={12} className="text-red-400" />
        )}
        <span className={`${trendUp ? "text-green-400" : "text-red-400"}`}>
          {trendUp ? "+" : ""}
          {growth.toFixed(1)}%
        </span>
        <span className="text-cyan-400 ml-1 hidden sm:inline">
          dari minggu lalu
        </span>
      </div>
    </motion.div>
  );
}
