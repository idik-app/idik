export default function PasienStatusBadge({ status }: { status: string }) {
  const color =
    status === "Aktif"
      ? "bg-cyan-700/30 text-cyan-300"
      : status === "Kontrol Berkala"
      ? "bg-blue-700/30 text-blue-300"
      : status === "Meninggal"
      ? "bg-red-700/30 text-red-300"
      : "bg-slate-700/30 text-slate-300";

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${color}`}
    >
      {status}
    </span>
  );
}
