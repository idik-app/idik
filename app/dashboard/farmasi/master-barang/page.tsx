'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import {
  Boxes,
  PackageSearch,
  PlusCircle,
  Filter,
  ScanLine,
  Tag,
  Layers,
} from 'lucide-react';
import { KomponenKatalogPanel } from '@/app/dashboard/pemakaian/components/RincianBarangTemplateTabs';
import {
  normalizeTemplateInputBarang,
  type KomponenKatalogBaris,
} from '@/lib/pemakaian/templateInputBarang';
import type { MasterBarangPickRow } from '@/components/ui/barang-variant-combobox';

type JenisBarang = 'OBAT' | 'ALKES';

type MasterBarang = {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisBarang;
  satuan: string;
  kategori: string;
  barcode?: string;
  distributor?: string;
  hargaPokok: number;
  hargaJual: number;
  aktif: boolean;
};

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

async function jsonFetcher(url: string) {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof j?.message === 'string' ? j.message : `HTTP ${res.status}`,
    );
  }
  return j;
}

export default function MasterBarangPage() {
  const [query, setQuery] = useState('');
  const [jenis, setJenis] = useState<'ALL' | JenisBarang>('ALL');
  const [onlyActive, setOnlyActive] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [items, setItems] = useState<MasterBarang[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    data: katalogRes,
    mutate: mutateKatalog,
    isLoading: katalogListLoading,
    error: katalogFetchError,
  } = useSWR('/api/farmasi/komponen-katalog', jsonFetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  });

  const { data: variantsRes, isLoading: variantsLoading } = useSWR(
    '/api/master-barang/variants',
    jsonFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const barangPickOptions = (variantsRes?.items ?? []) as MasterBarangPickRow[];

  const [katalogDraft, setKatalogDraft] = useState<KomponenKatalogBaris[]>([]);
  const [katalogDistOptions, setKatalogDistOptions] = useState<
    { id: string | null; nama_pt: string }[]
  >([]);
  const [katalogDistLoading, setKatalogDistLoading] = useState(true);
  const [katalogSaveMsg, setKatalogSaveMsg] = useState<string | null>(null);
  const [katalogSaving, setKatalogSaving] = useState(false);

  useEffect(() => {
    if (!katalogRes?.ok) return;
    setKatalogDraft(
      normalizeTemplateInputBarang({ komponenKatalog: katalogRes.rows })
        .komponenKatalog ?? [],
    );
  }, [katalogRes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setKatalogDistLoading(true);
      let rows: { id: string | null; nama_pt: string }[] = [];
      try {
        const res = await fetch('/api/distributor/distributors', {
          credentials: 'include',
        });
        const j = await res.json().catch(() => ({}));
        if (j?.ok && Array.isArray(j.data)) {
          rows = j.data.map((d: { id: string; nama_pt: string }) => ({
            id: d.id,
            nama_pt: String(d.nama_pt ?? '').trim(),
          }));
        }
      } catch {
        /* biarkan kosong */
      }
      if (cancelled) return;
      if (rows.length === 0 && barangPickOptions.length > 0) {
        const m = new Map<string, { id: string | null; nama_pt: string }>();
        for (const v of barangPickOptions) {
          const id = v.distributor_id?.trim() || null;
          const nama = v.distributor_nama?.trim() || '';
          if (id && nama) m.set(id, { id, nama_pt: nama });
          else if (nama) {
            m.set(`n:${nama.toLowerCase()}`, { id: null, nama_pt: nama });
          }
        }
        rows = Array.from(m.values());
      }
      setKatalogDistOptions(rows);
      setKatalogDistLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [barangPickOptions]);

  const saveKomponenKatalog = useCallback(async () => {
    setKatalogSaving(true);
    setKatalogSaveMsg(null);
    try {
      const res = await fetch('/api/farmasi/komponen-katalog', {
        method: 'PUT',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: katalogDraft }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        throw new Error(
          typeof j?.message === 'string'
            ? j.message
            : `Gagal menyimpan (HTTP ${res.status}).`,
        );
      }
      await mutateKatalog();
      setKatalogSaveMsg('Katalog tersimpan. Data dipakai di input pemakaian cathlab.');
    } catch (e) {
      setKatalogSaveMsg(
        e instanceof Error ? e.message : 'Gagal menyimpan katalog.',
      );
    } finally {
      setKatalogSaving(false);
    }
  }, [katalogDraft, mutateKatalog]);

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
          .from('master_barang')
          .select('*')
          .order('nama', { ascending: true });

        if (err) {
          setError((err as any).message ?? 'Gagal memuat master_barang');
          setItems([]);
          return;
        }

        const mapped =
          data?.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            kode: String(row.kode ?? ''),
            nama: String(row.nama ?? ''),
            jenis: row.jenis as JenisBarang,
            satuan: String(row.satuan ?? ''),
            kategori: String(row.kategori ?? ''),
            barcode: row.barcode ? String(row.barcode) : undefined,
            distributor: row.distributor_id
              ? String(row.distributor_id)
              : undefined,
            hargaPokok: Number(row.harga_pokok ?? 0),
            hargaJual: Number(row.harga_jual ?? 0),
            aktif: !!row.is_active,
          })) ?? [];

        setItems(mapped);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Gagal memuat data');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, []);

  const filtered = items.filter((b) => {
    if (jenis !== 'ALL' && b.jenis !== jenis) return false;
    if (onlyActive && !b.aktif) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      b.kode.toLowerCase().includes(q) ||
      b.nama.toLowerCase().includes(q) ||
      (b.barcode ?? '').toLowerCase().includes(q)
    );
  });

  const totalBarang = items.length;
  const totalAlkes = items.filter((b) => b.jenis === 'ALKES').length;
  const totalObat = items.filter((b) => b.jenis === 'OBAT').length;

  return (
    <div className="p-6 text-cyan-200 space-y-6">
      <div
        className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="flex items-center gap-3">
          <Boxes size={26} className="text-[#D4AF37]" />
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37] drop-shadow-[0_0_6px_#00ffff]">
              Master Barang Farmasi
            </h1>
            <p className="text-xs text-cyan-300/80">
              Satu sumber data obat &amp; alkes, terhubung ke stok, pemakaian, dan depo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px]
                       bg-slate-900/80 border border-cyan-600/70 text-cyan-200
                       hover:bg-slate-900 transition"
          >
            <ScanLine size={14} className="text-emerald-400" />
            Scan Barcode (Map)
          </button>
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-gradient-to-r from-[#D4AF37] to-emerald-400
                       text-xs font-semibold text-black dark:text-white shadow-[0_0_18px_rgba(250,204,21,0.6)]
                       hover:shadow-[0_0_24px_rgba(45,212,191,0.8)] transition"
          >
            <PlusCircle size={16} />
            Tambah Barang
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Barang"
          value={totalBarang}
          subtitle="Obat + Alkes aktif/nonaktif"
        />
        <SummaryCard
          title="Total Alkes"
          value={totalAlkes}
          subtitle="Item kategori alat kesehatan"
        />
        <SummaryCard
          title="Total Obat"
          value={totalObat}
          subtitle="Item kategori obat"
        />
      </div>

      <div
        className="rounded-2xl border border-[#D4AF37]/60 bg-gradient-to-br from-[#0B0F15]/95 to-[#101A24]/95 p-4 space-y-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={22} className="text-[#D4AF37] shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-[#D4AF37]">
                Komponen cathlab (katalog)
              </h2>
              <p className="text-[11px] text-cyan-300/85 max-w-xl">
                Daftar distributor + kategori + nama untuk saran autocomplete di{' '}
                <span className="text-cyan-200">Input Pemakaian Alkes</span> dan halaman pemakaian.
                Disimpan terpusat di database (bukan per order).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void saveKomponenKatalog()}
            disabled={katalogSaving || katalogListLoading}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wide
              bg-gradient-to-r from-[#D4AF37] to-emerald-400 text-black disabled:opacity-50 disabled:pointer-events-none
              shadow-[0_0_14px_rgba(212,175,55,0.35)] hover:shadow-[0_0_20px_rgba(45,212,191,0.45)] transition"
          >
            {katalogSaving ? 'Menyimpan…' : 'Simpan katalog'}
          </button>
        </div>
        {katalogListLoading ? (
          <p className="text-[11px] text-cyan-400/80">Memuat katalog…</p>
        ) : null}
        {katalogFetchError ? (
          <p className="text-[11px] text-amber-300">
            {katalogFetchError instanceof Error
              ? katalogFetchError.message
              : 'Gagal memuat katalog (perlu login / migrasi DB).'}
          </p>
        ) : null}
        {katalogSaveMsg ? (
          <p
            className={`text-[11px] ${
              katalogSaveMsg.includes('Gagal') || katalogSaveMsg.includes('HTTP')
                ? 'text-amber-300'
                : 'text-emerald-300'
            }`}
          >
            {katalogSaveMsg}
          </p>
        ) : null}
        <KomponenKatalogPanel
          rows={katalogDraft}
          onChangeRows={setKatalogDraft}
          distributorOptions={katalogDistOptions}
          distributorsLoading={katalogDistLoading}
          barangOptions={barangPickOptions}
          barangLoading={variantsLoading}
        />
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
            placeholder="Cari kode / nama / barcode..."
            className="w-52 bg-slate-950/70 border border-cyan-700/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-cyan-300">Jenis:</span>
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value as any)}
            className="bg-slate-950/70 border border-cyan-700/70 rounded-md px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
          >
            <option value="ALL">Semua</option>
            <option value="ALKES">Alkes</option>
            <option value="OBAT">Obat</option>
          </select>
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
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#0EA5E9]/40 rounded-2xl p-4 backdrop-blur-md overflow-x-hidden overflow-y-visible"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">Daftar Master Barang</h2>
            <p className="text-[11px] text-cyan-400/80">
              Data ini akan dipakai untuk stok opname, pemakaian/resep alkes, dan laporan.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto text-xs rounded-xl border border-slate-800/80">
          <table className="min-w-full divide-y divide-slate-800/80">
            <thead className="bg-slate-950/80">
              <tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Jenis</Th>
                <Th>Kategori</Th>
                <Th>Satuan</Th>
                <Th>Barcode</Th>
                <Th>Distributor</Th>
                <Th className="text-right">HPP</Th>
                <Th className="text-right">Harga Jual</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Memuat data dari database…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Belum ada barang yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-cyan-900/20 cursor-pointer transition"
                  >
                    <Td>{b.kode}</Td>
                    <Td>{b.nama}</Td>
                    <Td>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          b.jenis === 'ALKES'
                            ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/60'
                            : 'bg-indigo-900/60 text-indigo-200 border border-indigo-500/60'
                        }`}
                      >
                        <Tag size={11} />
                        {b.jenis}
                      </span>
                    </Td>
                    <Td>{b.kategori}</Td>
                    <Td>{b.satuan}</Td>
                    <Td>{b.barcode ?? '-'}</Td>
                    <Td>{b.distributor ?? '-'}</Td>
                    <Td className="text-right">
                      {b.hargaPokok.toLocaleString('id-ID')}
                    </Td>
                    <Td className="text-right">
                      {b.hargaJual.toLocaleString('id-ID')}
                    </Td>
                    <Td>
                      <StatusBadge aktif={b.aktif} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60">
          <div className="w-full sm:max-w-2xl max-h-[90vh] bg-slate-950/95 border border-cyan-700/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-cyan-100">
                  Tambah / Edit Barang
                </h3>
                <p className="text-[11px] text-cyan-400/80">
                  Skeleton form – nanti dihubungkan ke Supabase &amp; validasi bisnis.
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs text-cyan-300 hover:text-cyan-100"
              >
                Tutup
              </button>
            </div>

            <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabeledField label="Kode Barang">
                  <input
                    placeholder="Kode unik (mis. DES-3028)"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Nama Barang">
                  <input
                    placeholder="Nama lengkap barang"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Jenis">
                  <select
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    defaultValue="ALKES"
                  >
                    <option value="ALKES">Alat Kesehatan</option>
                    <option value="OBAT">Obat</option>
                  </select>
                </LabeledField>
                <LabeledField label="Kategori">
                  <input
                    placeholder="Kategori (mis. Stent Koroner, Antiplatelet)"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Satuan">
                  <input
                    placeholder="pcs / vial / tablet / box"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Distributor">
                  <input
                    placeholder="Nama distributor utama"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Barcode">
                  <div className="flex items-center gap-2">
                    <input
                      placeholder="Scan / ketik barcode..."
                      className="flex-1 bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                    <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] bg-slate-900/80 border border-cyan-700/70 text-cyan-200 hover:bg-slate-900">
                      <ScanLine size={12} className="text-emerald-400" />
                      Scan
                    </button>
                  </div>
                </LabeledField>
                <LabeledField label="Status">
                  <select
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    defaultValue="AKTIF"
                  >
                    <option value="AKTIF">Aktif</option>
                    <option value="NONAKTIF">Nonaktif</option>
                  </select>
                </LabeledField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabeledField label="Harga Pokok (HPP)">
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
                <LabeledField label="Harga Jual">
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <LabeledField label="Catatan (opsional)">
                  <textarea
                    rows={2}
                    placeholder="Catatan teknis / regulasi (mis. single use only, perlu cold chain, dll)"
                    className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                </LabeledField>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-800/80 flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80"
              >
                Batal
              </button>
              <button
                className="px-4 py-1.5 rounded-full text-xs font-semibold
                           bg-gradient-to-r from-emerald-400 to-cyan-400
                           text-black dark:text-white shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:shadow-[0_0_22px_rgba(34,211,238,0.9)]"
              >
                Simpan Master Barang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard(props: { title: string; value: number; subtitle: string }) {
  const { title, value, subtitle } = props;
  return (
    <div
      className="bg-gradient-to-br from-[#0B0F15]/95 to-[#101A24]/95 border border-[#D4AF37]/70 rounded-2xl p-4 backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <PackageSearch size={22} className="text-[#D4AF37]" />
        <div>
          <h3 className="text-sm font-semibold text-[#D4AF37]">{title}</h3>
          <p className="text-2xl font-bold text-cyan-50">{value}</p>
          <p className="text-[11px] text-cyan-300/80 mt-0.5">{subtitle}</p>
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

function LabeledField(props: { label: string; children: React.ReactNode }) {
  const { label, children } = props;
  return (
    <label className="flex flex-col gap-1 text-[11px] text-cyan-300">
      <span className="font-semibold text-cyan-200">{label}</span>
      {children}
    </label>
  );
}

