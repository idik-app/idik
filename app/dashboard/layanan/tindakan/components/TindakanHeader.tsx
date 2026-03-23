export default function TableHeader() {
  return (
    <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-semibold text-cyan-300 border-b border-cyan-800/40 bg-black/40">
      <div>TANGGAL</div>
      <div>NAMA PASIEN</div>
      <div>DOKTER</div>
      <div>JENIS TINDAKAN</div>
      <div>STATUS</div>
    </div>
  );
}
