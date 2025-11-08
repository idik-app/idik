"use client";

export default function DashboardContent() {
  return (
    <div className="grid gap-4 grid-cols-2">
      <div className="bg-slate-800/40 p-4 rounded-xl border border-cyan-400/20 shadow-inner shadow-cyan-500/10">
        <h3 className="text-cyan-300 mb-2">Pasien Aktif</h3>
        <p className="text-3xl font-semibold text-cyan-100">24</p>
      </div>
      <div className="bg-slate-800/40 p-4 rounded-xl border border-cyan-400/20 shadow-inner shadow-cyan-500/10">
        <h3 className="text-cyan-300 mb-2">Tindakan Hari Ini</h3>
        <p className="text-3xl font-semibold text-cyan-100">6</p>
      </div>
    </div>
  );
}
