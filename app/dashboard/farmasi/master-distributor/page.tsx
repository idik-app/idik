'use client';

import { useState, useEffect } from 'react';
import { Building2, Filter, PhoneCall, UserCircle, PlusCircle } from 'lucide-react';
import type { MasterDistributorRow } from '@/lib/database.types';

type Distributor = {
  id: string;
  namaPt: string;
  namaSales: string;
  kontakWa: string;
  email?: string;
  alamat?: string;
  aktif: boolean;
};

function mapDistributorRow(row: MasterDistributorRow): Distributor {
  return {
    id: row.id,
    namaPt: row.nama_pt,
    namaSales: row.nama_sales ?? '',
    kontakWa: row.kontak_wa ?? '',
    email: row.email ?? undefined,
    alamat: row.alamat ?? undefined,
    aktif: row.is_active,
  };
}

let supabasePromise: Promise<any> | null = null;
async function ensureSupabase() {
  if (!supabasePromise) {
    supabasePromise = import('@/lib/supabase/supabaseClient').then(
      (m) => m.supabase as any,
    );
  }
  return supabasePromise;
}

function isPublicSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export default function MasterDistributorPage() {
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [items, setItems] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!isPublicSupabaseConfigured()) {
        setError(
          'Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sb: any = await ensureSupabase();
        const { data, error: err } = await sb
          .from('master_distributor')
          .select('*')
          .order('nama_pt', { ascending: true });

        if (err) {
          setError((err as any).message ?? 'Gagal memuat master_distributor');
          setItems([]);
          return;
        }

        setItems((data ?? []).map((r) => mapDistributorRow(r as MasterDistributorRow)));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const filtered = items.filter((d) => {
    if (onlyActive && !d.aktif) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      d.namaPt.toLowerCase().includes(q) ||
      d.namaSales.toLowerCase().includes(q) ||
      d.kontakWa.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 text-cyan-200 space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="flex items-center gap-3">
          <Building2 size={26} className="text-[#D4AF37]" />
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37] drop-shadow-[0_0_6px_#00ffff]">
              Master Distributor
            </h1>
            <p className="text-xs text-cyan-300/80">
              Direktori PT distributor, sales, dan kontak WA untuk pemesanan alkes / obat.
            </p>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                     bg-gradient-to-r from-[#D4AF37] to-emerald-400
                     text-xs font-semibold text-black shadow-[0_0_18px_rgba(250,204,21,0.6)]
                     hover:shadow-[0_0_24px_rgba(45,212,191,0.8)] transition"
        >
          <PlusCircle size={16} />
          Tambah Distributor
        </button>
      </div>

      <div
        className="bg-gradient-to-r from-[#020617]/90 via-[#020617]/80 to-[#020617]/90
                   border border-cyan-800/70 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center text-xs animate-in fade-in duration-300"
      >
        <div className="flex items-center gap-2 text-cyan-300">
          <Filter size={14} className="text-cyan-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari PT / Sales / WA..."
            className="w-56 bg-slate-950/70 border border-cyan-700/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>
        <label className="flex items-center gap-1 text-[11px] text-cyan-300">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="h-3 w-3 rounded border-cyan-600 bg-slate-900"
          />
          Hanya tampilkan yang aktif
        </label>
      </div>

      {error && (
        <div className="text-xs text-amber-300 bg-amber-900/40 border border-amber-500/60 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#0EA5E9]/40 rounded-2xl p-4 backdrop-blur-md overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">Daftar Distributor</h2>
            <p className="text-[11px] text-cyan-400/80">
              Simpan informasi kontak sales untuk memudahkan stok opname, pemesanan, dan klaim.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto text-xs rounded-xl border border-slate-800/80">
          <table className="min-w-full divide-y divide-slate-800/80">
            <thead className="bg-slate-950/80">
              <tr>
                <Th>Nama PT</Th>
                <Th>Nama Sales</Th>
                <Th>Kontak WA</Th>
                <Th>Email</Th>
                <Th>Alamat</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Memuat data dari database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Belum ada distributor yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-cyan-900/20 cursor-pointer transition">
                    <Td>
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-[#D4AF37]" />
                        <span>{d.namaPt}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <UserCircle size={14} className="text-cyan-300" />
                        <span>{d.namaSales}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <PhoneCall size={13} className="text-emerald-300" />
                        <span className="font-mono text-[11px]">
                          {d.kontakWa ? `+${d.kontakWa}` : '-'}
                        </span>
                      </div>
                    </Td>
                    <Td>{d.email ?? '-'}</Td>
                    <Td className="max-w-xs truncate">{d.alamat ?? '-'}</Td>
                    <Td>
                      <StatusBadge aktif={d.aktif} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th(props: { children: React.ReactNode; className?: string }) {
  const { children, className = '' } = props;
  return (
    <th
      className={`px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-cyan-300 ${className}`}
    >
      {children}
    </th>
  );
}

function Td(props: { children: React.ReactNode; className?: string }) {
  const { children, className = '' } = props;
  return (
    <td className={`px-3 py-2 align-top text-[11px] text-cyan-100 ${className}`}>
      {children}
    </td>
  );
}

function StatusBadge(props: { aktif: boolean }) {
  const { aktif } = props;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        aktif
          ? 'bg-emerald-900/70 text-emerald-200 border border-emerald-500/70'
          : 'bg-slate-900/70 text-slate-300 border border-slate-500/70'
      }`}
    >
      {aktif ? 'Aktif' : 'Nonaktif'}
    </span>
  );
}

