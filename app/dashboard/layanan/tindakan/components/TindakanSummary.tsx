export default function TindakanSummary({
  stats,
  loading,
}: {
  stats: Record<string, any>;
  loading: boolean;
}) {
  if (loading) {
    return <div className="text-gray-500 italic">Memuat ringkasan...</div>;
  }

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {Object.entries(stats || {}).map(([label, value]) => (
        <div
          key={label}
          className="p-4 rounded-xl bg-black/40 border border-cyan-900/40 text-center shadow-inner shadow-cyan-900/30"
        >
          <div className="text-cyan-300 text-lg font-bold">{value}</div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
      ))}
    </div>
  );
}
