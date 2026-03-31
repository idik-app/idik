import { cn } from "@/lib/utils";

export default function TableHeader() {
  return (
    <div
      className={cn(
        "grid grid-cols-5 gap-4 px-6 py-3 text-sm font-extrabold border-b",
        "text-slate-900 border-cyan-200/70 bg-white/60 dark:text-cyan-300 dark:border-cyan-800/40 dark:bg-black/40",
      )}
    >
      <div>TANGGAL</div>
      <div>NAMA PASIEN</div>
      <div>DOKTER</div>
      <div>JENIS TINDAKAN</div>
      <div>STATUS</div>
    </div>
  );
}
