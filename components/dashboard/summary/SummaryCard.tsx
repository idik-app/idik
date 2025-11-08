"use client";

type Props = { label: string; value: number };

export default function SummaryCard({ label, value }: Props) {
  return (
    <div className="bg-black/40 border border-cyan-500/30 rounded-xl p-4 text-center shadow-md backdrop-blur-md hover:border-cyan-400 transition">
      <p className="text-cyan-300 text-sm font-medium">{label}</p>
      <p className="text-2xl font-bold text-cyan-100 mt-1">{value}</p>
    </div>
  );
}
