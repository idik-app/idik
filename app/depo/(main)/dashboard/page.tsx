import Link from "next/link";

const cards: {
  title: string;
  desc: string;
  href: string;
  cta: string;
}[] = [
  {
    title: "Master data farmasi",
    desc: "Distributor, mapping barang, dan referensi untuk stok depo.",
    href: "/depo/master",
    cta: "Buka master data",
  },
  {
    title: "Master barang",
    desc: "Katalog obat & alkes terpusat.",
    href: "/dashboard/farmasi/master-barang",
    cta: "Buka master barang",
  },
  {
    title: "Pemakaian & resep",
    desc: "Antrian validasi resep alkes dan koreksi dari depo.",
    href: "/depo/pemakaian",
    cta: "Ke pemakaian",
  },
  {
    title: "Stok opname",
    desc: "Pencocokan fisik dengan sistem.",
    href: "/dashboard/farmasi/stok-opname",
    cta: "Ke stok opname",
  },
  {
    title: "Laporan barang keluar",
    desc: "Rekap distribusi keluar per periode.",
    href: "/depo/laporan/keluar",
    cta: "Lihat laporan",
  },
];

export default function DepoDashboardPage() {
  return (
    <div className="space-y-6 p-4 md:p-5">
      <div>
        <h1 className="text-lg font-semibold text-white">
          Depo Farmasi
        </h1>
        <p className="text-[12px] text-white mt-1 max-w-2xl">
          Ringkasan akses cepat ke modul farmasi RS. Gunakan menu samping untuk
          berpindah modul; halaman detail tetap memakai dashboard farmasi yang
          sama dengan otorisasi role depo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.href}
            className="rounded-2xl border border-emerald-900/50 bg-slate-950/40 p-4 flex flex-col gap-2"
          >
            <div className="text-[13px] font-medium text-white">
              {c.title}
            </div>
            <p className="text-[11px] text-white flex-1">{c.desc}</p>
            <Link
              href={c.href}
              className="inline-flex w-fit items-center rounded-lg border border-cyan-500/50 bg-slate-900/50 px-3 py-1.5 text-[11px] text-white hover:bg-slate-800/60 hover:border-cyan-400/70 transition-colors"
            >
              {c.cta}
            </Link>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 text-[11px] text-white">
        <span className="font-medium text-white">Catatan: </span>
        Akun dengan role Depo Farmasi masuk lewat halaman login portal ini atau
        beranda; setelah login Anda diarahkan ke halaman Depo ini. Modul di sini
        disinkronkan dengan menu Farmasi di dashboard utama (bukan salinan data
        terpisah).
      </div>
    </div>
  );
}
