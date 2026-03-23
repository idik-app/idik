'use client';

import { AlertTriangle } from 'lucide-react';

type Props = {
  params: { slug?: string[] };
};

const CONTEXT_LABELS: Record<string, string> = {
  'master-barang': 'Master Barang',
  'master-alkes': 'Master Alkes',
  'stok-opname': 'Stok Opname',
  'laporan/keluar': 'Laporan Barang Keluar',
  'laporan/stok-alkes': 'Laporan Stok Alkes',
};

export default function FarmasiFallbackPage({ params }: Props) {
  const slugParts = params.slug ?? [];
  const key = slugParts.join('/');
  const contextName = CONTEXT_LABELS[key] ?? (key || 'Farmasi');

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center text-cyan-200">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="text-amber-400" size={28} />
        <h1 className="text-xl font-semibold text-amber-300 drop-shadow-[0_0_6px_#facc15]">
          ⚠️ Modul belum ditemukan
        </h1>
      </div>
      <p className="text-sm text-cyan-300/80">
        Modul untuk konteks <span className="font-semibold text-[#D4AF37]">"{contextName}"</span>{' '}
        belum tersedia atau masih dalam pengembangan.
      </p>
      <p className="mt-3 text-xs text-cyan-400/70 max-w-md">
        Silakan hubungi admin Depo Farmasi / pengembang sistem bila Anda membutuhkan modul ini
        segera, atau kembali ke menu lain di sidebar.
      </p>
    </div>
  );
}

