"use client";

export default function PasienInsightBar() {
  return (
    <div className="w-full py-2 px-4 mb-4 rounded-lg bg-gradient-to-r from-cyan-900/40 via-gray-900/40 to-cyan-900/40 border border-cyan-700/30 text-sm text-cyan-100 shadow-[0_0_10px_rgba(0,255,255,0.1)] animate-in fade-in slide-in-from-top-1 duration-200">
      <span className="text-yellow-400 font-medium">AI Insight:</span> Pasien
      BPJS meningkat <b className="text-cyan-300">12%</b> dibanding minggu lalu.
      Pertimbangkan{" "}
      <span className="text-yellow-400">penjadwalan ulang slot Cathlab 2.</span>
    </div>
  );
}
