'use client';

import { useEffect, useState } from 'react';
import {
  Boxes,
  Building2,
  PackageSearch,
  Filter,
  Tag,
  PhoneCall,
  UserCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { MasterDistributorRow } from '@/lib/database.types';

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
      (m) => (m as any).supabase as any,
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

type TabKey = 'BARANG' | 'ALKES' | 'DISTRIBUTOR';

const ALKES_KATEGORI_OPTIONS = [
  'Kateter Ablasi',
  'Ballon',
  'Stent',
  'Kateter Diagnostik',
  'Guiding Kateter',
  'Introducer Sheat',
  'Micro Kateter',
] as const;

export default function MasterFarmasiPage() {
  const [tab, setTab] = useState<TabKey>('BARANG');

  return (
    <div className="p-6 text-cyan-200 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3">
          <Boxes size={26} className="text-[#D4AF37]" />
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37] drop-shadow-[0_0_6px_#00ffff]">
              Master Data Farmasi
            </h1>
            <p className="text-xs text-cyan-300/80">
              Satu pintu untuk mengelola Barang, Alkes (view), dan Distributor yang terhubung ke
              pemakaian &amp; depo.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-full bg-slate-900/70 border border-slate-600 text-xs">
          {([
            { key: 'BARANG', label: 'Obat' },
            { key: 'ALKES', label: 'Alkes' },
            { key: 'DISTRIBUTOR', label: 'Distributor' },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition ${
                tab === t.key
                  ? 'bg-white text-slate-950 border border-cyan-400'
                  : 'bg-transparent text-cyan-200 hover:bg-cyan-900/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'BARANG' && <BarangPanel />}
      {tab === 'ALKES' && <AlkesPanel />}
      {tab === 'DISTRIBUTOR' && <DistributorPanel />}
    </div>
  );
}

function BarangPanel() {
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [items, setItems] = useState<MasterBarang[]>([]);
  const [alkesCount, setAlkesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barangModalOpen, setBarangModalOpen] = useState(false);
  const [editingBarang, setEditingBarang] = useState<MasterBarang | null>(null);
  const [savingBarang, setSavingBarang] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!isPublicSupabaseConfigured()) {
        setError(
          'Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sb: any = await ensureSupabase();

        const [obatRes, alkesRes] = await Promise.all([
          sb
            .from('master_barang')
            .select('*')
            .eq('jenis', 'OBAT')
            .order('nama', { ascending: true }),
          sb
            .from('master_barang')
            .select('*', { count: 'exact', head: true })
            .eq('jenis', 'ALKES'),
        ]);

        if (obatRes.error) {
          setError(obatRes.error.message);
          setItems([]);
        } else {
          const mapped =
            obatRes.data?.map((row: any) => ({
              id: row.id,
              kode: row.kode,
              nama: row.nama,
              jenis: row.jenis,
              satuan: row.satuan ?? '',
              kategori: row.kategori ?? '',
              barcode: row.barcode ?? undefined,
              distributor: row.distributor_id
                ? String(row.distributor_id)
                : undefined,
              hargaPokok: Number(row.harga_pokok ?? 0),
              hargaJual: Number(row.harga_jual ?? 0),
              aktif: !!row.is_active,
            })) ?? [];
          setItems(mapped);
        }

        setAlkesCount(alkesRes.count ?? 0);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setItems([]);
        setAlkesCount(0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter((b) => {
    if (onlyActive && !b.aktif) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      b.kode.toLowerCase().includes(q) ||
      b.nama.toLowerCase().includes(q) ||
      (b.barcode ?? '').toLowerCase().includes(q)
    );
  });

  const totalObat = items.length;
  const totalAlkes = alkesCount;
  const totalBarang = totalObat + totalAlkes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Total Obat"
          value={totalObat}
          subtitle="Semua obat aktif/nonaktif di master"
        />
        <SummaryCard
          title="Total Alkes (info)"
          value={totalAlkes}
          subtitle="Jumlah jenis alkes (referensi dari master)"
        />
        <SummaryCard
          title="Total Barang (Obat + Alkes)"
          value={totalBarang}
          subtitle="Total kombinasi obat + alkes di sistem"
        />
      </div>

      <div
        className="bg-gradient-to-r from-[#020617]/90 via-[#020617]/80 to-[#020617]/90
                   border border-cyan-800/70 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center text-xs
                   animate-in fade-in slide-in-from-top-1 duration-300"
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
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#0EA5E9]/40 rounded-2xl p-4 backdrop-blur-md overflow-hidden
                   animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">Master Obat</h2>
            <p className="text-[11px] text-cyan-400/80">
              Sumber utama data obat yang dipakai di stok, pemakaian, dan laporan pasien.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBarang(null);
              setBarangModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-white text-[11px] font-semibold text-slate-950
                       shadow-sm ring-1 ring-slate-900/10
                       hover:bg-slate-50 hover:shadow-md transition"
          >
            + Tambah Obat
          </button>
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
                <Th className="text-center w-24">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {loading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Memuat data obat...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Belum ada barang yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setEditingBarang(b);
                      setBarangModalOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingBarang(b);
                        setBarangModalOpen(true);
                      }
                    }}
                    className="hover:bg-cyan-900/30 cursor-pointer transition"
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
                    <Td className="text-center">
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBarang(b);
                            setBarangModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-200 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Hapus obat "${b.nama}"? Data tidak dapat dikembalikan.`)) return;
                            if (!isPublicSupabaseConfigured()) return;
                            setDeletingId(b.id);
                            try {
                              const sb: any = await ensureSupabase();
                              const { error } = await sb
                                .from('master_barang')
                                .delete()
                                .eq('id', b.id);
                              if (error) throw error;
                              setItems((prev) => prev.filter((x) => x.id !== b.id));
                            } catch (err) {
                              console.error('Gagal hapus obat', err);
                              alert('Gagal menghapus obat. Coba lagi.');
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === b.id}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-900/40 hover:text-red-200 transition disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {barangModalOpen && (
        <BarangModal
          initial={editingBarang}
          saving={savingBarang}
          onClose={() => {
            if (!savingBarang) {
              setBarangModalOpen(false);
              setEditingBarang(null);
            }
          }}
          onSave={async (payload) => {
            if (!payload.nama.trim()) {
              alert('Nama obat wajib diisi.');
              return;
            }
            if (!isPublicSupabaseConfigured()) return;
            setSavingBarang(true);
            try {
              const sb: any = await ensureSupabase();

              const kodeTrimmed = payload.kode?.trim();
              const kode =
                kodeTrimmed ||
                (editingBarang ? editingBarang.kode : `OBAT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
              const row = {
                kode,
                nama: payload.nama.trim(),
                jenis: 'OBAT' as const,
                satuan: payload.satuan ?? '',
                kategori: payload.kategori ?? '',
                barcode: payload.barcode?.trim() || null,
                distributor_id: payload.distributor?.trim() || null,
                harga_pokok: payload.hargaPokok,
                harga_jual: payload.hargaJual,
                is_active: payload.aktif,
              };

              if (editingBarang) {
                const { data, error } = await sb
                  .from('master_barang')
                  // @ts-expect-error - master_barang row type from DB
                  .update(row)
                  .eq('id', editingBarang.id)
                  .select('*')
                  .single();

                if (error) throw error;

                const mapped: MasterBarang = {
                  id: (data as any).id,
                  kode: (data as any).kode,
                  nama: (data as any).nama,
                  jenis: (data as any).jenis,
                  satuan: (data as any).satuan ?? '',
                  kategori: (data as any).kategori ?? '',
                  barcode: (data as any).barcode ?? undefined,
                  distributor: (data as any).distributor_id
                    ? String((data as any).distributor_id)
                    : undefined,
                  hargaPokok: Number((data as any).harga_pokok ?? 0),
                  hargaJual: Number((data as any).harga_jual ?? 0),
                  aktif: !!(data as any).is_active,
                };

                setItems((prev) => prev.map((x) => (x.id === editingBarang.id ? mapped : x)));
              } else {
                const { data, error } = await sb
                  .from('master_barang')
                  // @ts-expect-error - master_barang row type from DB
                  .insert(row)
                  .select('*')
                  .single();

                if (error) throw error;

                const mapped: MasterBarang = {
                  id: (data as any).id,
                  kode: (data as any).kode,
                  nama: (data as any).nama,
                  jenis: (data as any).jenis,
                  satuan: (data as any).satuan ?? '',
                  kategori: (data as any).kategori ?? '',
                  barcode: (data as any).barcode ?? undefined,
                  distributor: (data as any).distributor_id
                    ? String((data as any).distributor_id)
                    : undefined,
                  hargaPokok: Number((data as any).harga_pokok ?? 0),
                  hargaJual: Number((data as any).harga_jual ?? 0),
                  aktif: !!(data as any).is_active,
                };

                setItems((prev) => [...prev, mapped]);
              }

              setBarangModalOpen(false);
              setEditingBarang(null);
            } catch (e: unknown) {
              const msg =
                e && typeof e === 'object' && 'message' in e
                  ? String((e as { message?: string }).message)
                  : e != null
                    ? String(e)
                    : 'Unknown error';
              const details = e && typeof e === 'object' && 'details' in e ? (e as { details?: string }).details : '';
              const hint = e && typeof e === 'object' && 'hint' in e ? (e as { hint?: string }).hint : '';
              console.error('Gagal menyimpan obat', msg, details || hint || e);
              alert(details || hint ? `Gagal menyimpan obat: ${msg}\n${details || ''}${hint ? `\n${hint}` : ''}` : `Gagal menyimpan obat: ${msg}`);
            } finally {
              setSavingBarang(false);
            }
          }}
        />
      )}
    </div>
  );
}

type BarangFormValue = {
  kode: string;
  nama: string;
  satuan: string;
  kategori: string;
  barcode?: string;
  distributor?: string;
  hargaPokok: number;
  hargaJual: number;
  aktif: boolean;
};

function BarangModal(props: {
  initial: MasterBarang | null;
  saving: boolean;
  onClose: () => void;
  onSave: (value: BarangFormValue) => Promise<void>;
}) {
  const { initial, saving, onClose, onSave } = props;
  const [form, setForm] = useState<BarangFormValue>(() =>
    initial
      ? {
          kode: initial.kode,
          nama: initial.nama,
          satuan: initial.satuan,
          kategori: initial.kategori,
          barcode: initial.barcode ?? '',
          distributor: initial.distributor ?? '',
          hargaPokok: initial.hargaPokok,
          hargaJual: initial.hargaJual,
          aktif: initial.aktif,
        }
      : {
          kode: '',
          nama: '',
          satuan: '',
          kategori: '',
          barcode: '',
          distributor: '',
          hargaPokok: 0,
          hargaJual: 0,
          aktif: true,
        }
  );

  useEffect(() => {
    if (initial) {
      setForm({
        kode: initial.kode,
        nama: initial.nama,
        satuan: initial.satuan,
        kategori: initial.kategori,
        barcode: initial.barcode ?? '',
        distributor: initial.distributor ?? '',
        hargaPokok: initial.hargaPokok,
        hargaJual: initial.hargaJual,
        aktif: initial.aktif,
      });
    } else {
      setForm({
        kode: '',
        nama: '',
        satuan: '',
        kategori: '',
        barcode: '',
        distributor: '',
        hargaPokok: 0,
        hargaJual: 0,
        aktif: true,
      });
    }
  }, [initial]);

  const handleChange = (field: keyof BarangFormValue, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
  };

  const isEdit = !!initial;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[90vh] bg-slate-950/95 border border-cyan-700/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-cyan-100">
              {isEdit ? 'Edit Obat' : 'Tambah Obat'}
            </h3>
            <p className="text-[11px] text-cyan-400/80">
              {isEdit
                ? 'Ubah data obat di master barang.'
                : 'Isi detail obat yang akan masuk ke master barang.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs text-cyan-300 hover:text-cyan-100 disabled:opacity-60"
          >
            Tutup
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (saving || !form.nama.trim()) return;
            void onSave(form);
          }}
          className="flex flex-col flex-1 min-h-0"
        >
        <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabeledField label="Kode Obat">
              <input
                value={form.kode}
                onChange={(e) => handleChange('kode', e.target.value)}
                placeholder="Kode unik obat"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Nama Obat">
              <input
                value={form.nama}
                onChange={(e) => handleChange('nama', e.target.value)}
                placeholder="Nama obat sesuai etiket"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Kategori">
              <input
                value={form.kategori}
                onChange={(e) => handleChange('kategori', e.target.value)}
                placeholder="Contoh: Antibiotik"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Satuan">
              <input
                value={form.satuan}
                onChange={(e) => handleChange('satuan', e.target.value)}
                placeholder="tablet / vial / botol"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Barcode kemasan">
              <input
                type="text"
                autoComplete="off"
                inputMode="numeric"
                value={form.barcode ?? ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Scan atau ketik barcode kemasan (opsional)"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Distributor (opsional)">
              <input
                value={form.distributor ?? ''}
                onChange={(e) => handleChange('distributor', e.target.value)}
                placeholder="ID / nama distributor"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="HPP">
              <input
                type="number"
                value={form.hargaPokok}
                onChange={(e) => handleChange('hargaPokok', Number(e.target.value || 0))}
                placeholder="Harga pokok pembelian"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 text-right"
              />
            </LabeledField>
            <LabeledField label="Harga Jual">
              <input
                type="number"
                value={form.hargaJual}
                onChange={(e) => handleChange('hargaJual', Number(e.target.value || 0))}
                placeholder="Harga jual ke pasien/depo"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 text-right"
              />
            </LabeledField>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-cyan-300">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => handleChange('aktif', e.target.checked)}
              className="h-3 w-3 rounded border-cyan-600 bg-slate-900"
            />
            Aktif
          </label>
        </div>

        <div className="px-4 py-3 border-t border-slate-800/80 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || !form.nama.trim()}
            className="px-4 py-1.5 rounded-full text-xs font-semibold
                       bg-gradient-to-r from-emerald-400 to-cyan-400
                       text-black shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:shadow-[0_0_22px_rgba(34,211,238,0.9)]
                       disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Obat'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

function AlkesPanel() {
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [items, setItems] = useState<MasterBarang[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alkesModalOpen, setAlkesModalOpen] = useState(false);
  const [editingAlkes, setEditingAlkes] = useState<MasterBarang | null>(null);
  const [savingAlkes, setSavingAlkes] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!isPublicSupabaseConfigured()) {
        setError(
          'Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
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
          .eq('jenis', 'ALKES')
          .order('nama', { ascending: true });

        if (err) {
          setError(err.message);
          setItems([]);
          return;
        }

        const mapped =
          data?.map((row: any) => ({
            id: row.id,
            kode: row.kode,
            nama: row.nama,
            jenis: row.jenis,
            satuan: row.satuan ?? '',
            kategori: row.kategori ?? '',
            barcode: row.barcode ?? undefined,
            distributor: row.distributor_id
              ? String(row.distributor_id)
              : undefined,
            hargaPokok: Number(row.harga_pokok ?? 0),
            hargaJual: Number(row.harga_jual ?? 0),
            aktif: !!row.is_active,
          })) ?? [];
        setItems(mapped);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter((b) => {
    if (onlyActive && !b.aktif) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      b.kode.toLowerCase().includes(q) ||
      b.nama.toLowerCase().includes(q) ||
      (b.barcode ?? '').toLowerCase().includes(q)
    );
  });

  const total = items.length;

  return (
    <div className="space-y-4">
      <SummaryCard
        title="Total Alkes (view)"
        value={total}
        subtitle="Hanya menampilkan barang jenis alkes dari Master Barang"
      />

      <div
        className="bg-gradient-to-r from-[#020617]/90 via-[#020617]/80 to-[#020617]/90
                   border border-cyan-800/70 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center text-xs
                   animate-in fade-in slide-in-from-top-1 duration-300"
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
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#0EA5E9]/40 rounded-2xl p-4 backdrop-blur-md overflow-hidden
                   animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">Master Alkes</h2>
            <p className="text-[11px] text-cyan-400/80">
              Kelola barang jenis ALKES: tambah, edit, dan hapus dari master barang.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingAlkes(null);
              setAlkesModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-white text-slate-950 border border-slate-300
                       text-[11px] font-semibold shadow-sm
                       hover:bg-slate-50 hover:border-slate-400 transition"
          >
            + Tambah Alkes
          </button>
        </div>

        <div className="overflow-x-auto text-xs rounded-xl border border-slate-800/80">
          <table className="min-w-full divide-y divide-slate-800/80">
            <thead className="bg-slate-950/80">
              <tr>
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Kategori</Th>
                <Th>Satuan</Th>
                <Th>Barcode</Th>
                <Th>Distributor</Th>
                <Th>Status</Th>
                <Th className="text-center w-24">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80 bg-slate-950/40">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Memuat data alkes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-6 text-center text-cyan-500/70"
                  >
                    Belum ada alkes yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setEditingAlkes(b);
                      setAlkesModalOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingAlkes(b);
                        setAlkesModalOpen(true);
                      }
                    }}
                    className="hover:bg-cyan-900/30 cursor-pointer transition"
                  >
                    <Td>{b.kode}</Td>
                    <Td>{b.nama}</Td>
                    <Td>{b.kategori}</Td>
                    <Td>{b.satuan}</Td>
                    <Td>{b.barcode ?? '-'}</Td>
                    <Td>{b.distributor ?? '-'}</Td>
                    <Td>
                      <StatusBadge aktif={b.aktif} />
                    </Td>
                    <Td className="text-center">
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAlkes(b);
                            setAlkesModalOpen(true);
                          }}
                          className="p-1.5 rounded-md text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-200 transition"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm(`Hapus alkes "${b.nama}"? Data tidak dapat dikembalikan.`)) return;
                            if (!isPublicSupabaseConfigured()) return;
                            setDeletingId(b.id);
                            try {
                              const sb: any = await ensureSupabase();
                              const { error: err } = await sb
                                .from('master_barang')
                                .delete()
                                .eq('id', b.id);
                              if (err) throw err;
                              setItems((prev) => prev.filter((x) => x.id !== b.id));
                            } catch (err) {
                              console.error('Gagal hapus alkes', err);
                              alert('Gagal menghapus alkes. Coba lagi.');
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === b.id}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-900/40 hover:text-red-200 transition disabled:opacity-50"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {alkesModalOpen && (
        <AlkesModal
          initial={editingAlkes}
          saving={savingAlkes}
          onClose={() => {
            if (!savingAlkes) {
              setAlkesModalOpen(false);
              setEditingAlkes(null);
            }
          }}
          onSave={async (payload) => {
            if (!isPublicSupabaseConfigured()) return;
            setSavingAlkes(true);
            try {
              const sb: any = await ensureSupabase();

              const kode =
                (payload.kode && payload.kode.trim()) ||
                `ALKES-${Date.now()}`;
              const row = {
                kode,
                nama: payload.nama.trim(),
                jenis: 'ALKES' as const,
                satuan: payload.satuan?.trim() || 'pcs',
                kategori: payload.kategori?.trim() || null,
                barcode: payload.barcode?.trim() || null,
                distributor_id: payload.distributor?.trim() || null,
                harga_pokok: payload.hargaPokok ?? null,
                harga_jual: payload.hargaJual ?? null,
                is_active: payload.aktif,
              };

              if (editingAlkes) {
                const { data, error: err } = await sb
                  .from('master_barang')
                  // @ts-expect-error - master_barang row type from DB
                  .update(row)
                  .eq('id', editingAlkes.id)
                  .select('*')
                  .single();

                if (err) throw err;

                const mapped: MasterBarang = {
                  id: (data as any).id,
                  kode: (data as any).kode,
                  nama: (data as any).nama,
                  jenis: (data as any).jenis,
                  satuan: (data as any).satuan ?? '',
                  kategori: (data as any).kategori ?? '',
                  barcode: (data as any).barcode ?? undefined,
                  distributor: (data as any).distributor_id
                    ? String((data as any).distributor_id)
                    : undefined,
                  hargaPokok: Number((data as any).harga_pokok ?? 0),
                  hargaJual: Number((data as any).harga_jual ?? 0),
                  aktif: !!(data as any).is_active,
                };

                setItems((prev) => prev.map((x) => (x.id === editingAlkes.id ? mapped : x)));
              } else {
                const { data, error: err } = await sb
                  .from('master_barang')
                  // @ts-expect-error - master_barang row type from DB
                  .insert(row)
                  .select('*')
                  .single();

                if (err) throw err;

                const mapped: MasterBarang = {
                  id: (data as any).id,
                  kode: (data as any).kode,
                  nama: (data as any).nama,
                  jenis: (data as any).jenis,
                  satuan: (data as any).satuan ?? '',
                  kategori: (data as any).kategori ?? '',
                  barcode: (data as any).barcode ?? undefined,
                  distributor: (data as any).distributor_id
                    ? String((data as any).distributor_id)
                    : undefined,
                  hargaPokok: Number((data as any).harga_pokok ?? 0),
                  hargaJual: Number((data as any).harga_jual ?? 0),
                  aktif: !!(data as any).is_active,
                };

                setItems((prev) => [...prev, mapped]);
              }

              setAlkesModalOpen(false);
              setEditingAlkes(null);
            } catch (e) {
              const msg =
                e && typeof e === 'object' && 'message' in e
                  ? (e as { message?: string }).message
                  : String(e);
              console.error('Gagal menyimpan alkes', e);
              alert(msg ? `Gagal menyimpan alkes: ${msg}` : 'Gagal menyimpan alkes. Coba lagi.');
            } finally {
              setSavingAlkes(false);
            }
          }}
        />
      )}
    </div>
  );
}

function AlkesModal(props: {
  initial: MasterBarang | null;
  saving: boolean;
  onClose: () => void;
  onSave: (value: BarangFormValue) => Promise<void>;
}) {
  const { initial, saving, onClose, onSave } = props;
  const [form, setForm] = useState<BarangFormValue>(() =>
    initial
      ? {
          kode: initial.kode,
          nama: initial.nama,
          satuan: initial.satuan,
          kategori: initial.kategori,
          barcode: initial.barcode ?? '',
          distributor: initial.distributor ?? '',
          hargaPokok: initial.hargaPokok,
          hargaJual: initial.hargaJual,
          aktif: initial.aktif,
        }
      : {
          kode: '',
          nama: '',
          satuan: '',
          kategori: '',
          barcode: '',
          distributor: '',
          hargaPokok: 0,
          hargaJual: 0,
          aktif: true,
        }
  );

  useEffect(() => {
    if (initial) {
      setForm({
        kode: initial.kode,
        nama: initial.nama,
        satuan: initial.satuan,
        kategori: initial.kategori,
        barcode: initial.barcode ?? '',
        distributor: initial.distributor ?? '',
        hargaPokok: initial.hargaPokok,
        hargaJual: initial.hargaJual,
        aktif: initial.aktif,
      });
    } else {
      setForm({
        kode: '',
        nama: '',
        satuan: '',
        kategori: '',
        barcode: '',
        distributor: '',
        hargaPokok: 0,
        hargaJual: 0,
        aktif: true,
      });
    }
  }, [initial]);

  const handleChange = (field: keyof BarangFormValue, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
  };

  const isEdit = !!initial;

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[90vh] bg-slate-950/95 border border-cyan-700/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-cyan-100">
              {isEdit ? 'Edit Alkes' : 'Tambah Alkes'}
            </h3>
            <p className="text-[11px] text-cyan-400/80">
              {isEdit
                ? 'Ubah data alkes di master barang.'
                : 'Isi detail alkes yang akan masuk ke master barang.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs text-cyan-300 hover:text-cyan-100 disabled:opacity-60"
          >
            Tutup
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (saving) return;
            if (!form.nama.trim()) return;
            void onSave(form);
          }}
          className="flex flex-col flex-1 min-h-0"
        >
        <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabeledField label="Kode Alkes">
              <input
                value={form.kode}
                onChange={(e) => handleChange('kode', e.target.value)}
                placeholder="Kode unik alkes"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Nama Alkes">
              <input
                value={form.nama}
                onChange={(e) => handleChange('nama', e.target.value)}
                placeholder="Nama alkes sesuai etiket"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Kategori">
              <select
                value={form.kategori}
                onChange={(e) => handleChange('kategori', e.target.value)}
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              >
                <option value="">Pilih kategori</option>
                {ALKES_KATEGORI_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="Satuan">
              <input
                value={form.satuan}
                onChange={(e) => handleChange('satuan', e.target.value)}
                placeholder="pcs / unit / box"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Barcode kemasan">
              <input
                type="text"
                autoComplete="off"
                inputMode="numeric"
                value={form.barcode ?? ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Scan atau ketik barcode kemasan (opsional)"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Distributor (opsional)">
              <input
                value={form.distributor ?? ''}
                onChange={(e) => handleChange('distributor', e.target.value)}
                placeholder="ID / nama distributor"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="HPP">
              <input
                type="number"
                value={form.hargaPokok}
                onChange={(e) => handleChange('hargaPokok', Number(e.target.value || 0))}
                placeholder="Harga pokok pembelian"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 text-right"
              />
            </LabeledField>
            <LabeledField label="Harga Jual">
              <input
                type="number"
                value={form.hargaJual}
                onChange={(e) => handleChange('hargaJual', Number(e.target.value || 0))}
                placeholder="Harga jual ke pasien/depo"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400 text-right"
              />
            </LabeledField>
          </div>
          <label className="flex items-center gap-2 text-[11px] text-cyan-300">
            <input
              type="checkbox"
              checked={form.aktif}
              onChange={(e) => handleChange('aktif', e.target.checked)}
              className="h-3 w-3 rounded border-cyan-600 bg-slate-900"
            />
            Aktif
          </label>
        </div>

        <div className="px-4 py-3 border-t border-slate-800/80 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || !form.nama.trim()}
            className="px-4 py-1.5 rounded-full text-xs font-semibold
                       bg-gradient-to-r from-emerald-400 to-cyan-400
                       text-black shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:shadow-[0_0_22px_rgba(34,211,238,0.9)]
                       disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Alkes'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

function DistributorPanel() {
  const [query, setQuery] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [items, setItems] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!isPublicSupabaseConfigured()) {
        setError(
          'Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.',
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sb: any = await ensureSupabase();
        const { data, error } = await sb
          .from('master_distributor')
          .select('*')
          .order('nama_pt', { ascending: true });

        if (error) {
          setError(error.message);
          setItems([]);
          return;
        }

        setItems((data ?? []).map(mapDistributorRow));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
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
    <div className="space-y-4">
      <SummaryCard
        title="Total Distributor"
        value={items.length}
        subtitle="PT aktif/nonaktif yang terdaftar"
      />

      <div
        className="bg-gradient-to-r from-[#020617]/90 via-[#020617]/80 to-[#020617]/90
                   border border-cyan-800/70 rounded-2xl px-4 py-3 flex flex-wrap gap-3 items-center text-xs
                   animate-in fade-in slide-in-from-top-1 duration-300"
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
        className="bg-gradient-to-br from-[#0B0F15]/90 to-[#111B26]/90 border border-[#0EA5E9]/40 rounded-2xl p-4 backdrop-blur-md overflow-hidden
                   animate-in fade-in slide-in-from-top-2 duration-300"
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-cyan-200">Master Distributor</h2>
            <p className="text-[11px] text-cyan-400/80">
              Direktori PT distributor, sales, dan kontak WA untuk pemesanan alkes/obat.
            </p>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                       bg-white text-slate-950 border border-slate-300
                       text-[11px] font-semibold shadow-sm ring-1 ring-slate-900/10
                       hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition"
          >
            + Tambah Distributor
          </button>
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
                    Memuat data distributor...
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
                  <tr
                    key={d.id}
                    className="hover:bg-cyan-900/20 cursor-pointer transition"
                    onClick={() => {
                      setEditing(d);
                      setModalOpen(true);
                    }}
                  >
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

      {modalOpen && (
        <DistributorModal
          initial={editing}
          saving={saving}
          onClose={() => {
            if (!saving) setModalOpen(false);
          }}
          onSave={async (payload) => {
            if (!isPublicSupabaseConfigured()) return;
            setSaving(true);
            try {
              const sb: any = await ensureSupabase();

              if (editing) {
                const { error } = await sb
                  .from('master_distributor')
                  // @ts-expect-error - master_distributor row type from DB
                  .update({
                    nama_pt: payload.namaPt,
                    nama_sales: payload.namaSales,
                    kontak_wa: payload.kontakWa,
                    email: payload.email,
                    alamat: payload.alamat,
                    is_active: payload.aktif,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', editing.id);
                if (error) throw error;
                setItems((prev) =>
                  prev.map((row) =>
                    row.id === editing.id ? { ...row, ...payload } : row
                  )
                );
              } else {
                const { data, error } = await sb
                  .from('master_distributor')
                  // @ts-expect-error - master_distributor row type from DB
                  .insert({
                    nama_pt: payload.namaPt,
                    nama_sales: payload.namaSales,
                    kontak_wa: payload.kontakWa,
                    email: payload.email,
                    alamat: payload.alamat,
                    is_active: payload.aktif,
                  })
                  .select('*')
                  .single();
                if (error) throw error;
                setItems((prev) => [...prev, mapDistributorRow(data as MasterDistributorRow)]);
              }
              setModalOpen(false);
            } catch (e) {
              console.error('Gagal simpan distributor', e);
              alert('Gagal menyimpan distributor. Coba lagi.');
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

type DistributorFormValue = Distributor;

function DistributorModal(props: {
  initial: Distributor | null;
  saving: boolean;
  onClose: () => void;
  onSave: (value: DistributorFormValue) => Promise<void>;
}) {
  const { initial, saving, onClose, onSave } = props;
  const [form, setForm] = useState<DistributorFormValue>(
    initial ?? {
      id: '',
      namaPt: '',
      namaSales: '',
      kontakWa: '',
      email: '',
      alamat: '',
      aktif: true,
    }
  );

  const handleChange = (field: keyof DistributorFormValue, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg max-h-[90vh] bg-slate-950/95 border border-cyan-700/70 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-cyan-100">
              {initial ? 'Edit Distributor' : 'Tambah Distributor'}
            </h3>
            <p className="text-[11px] text-cyan-400/80">
              Isi informasi PT, sales, dan kontak WA distributor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-xs text-cyan-300 hover:text-cyan-100 disabled:opacity-60"
          >
            Tutup
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (saving || !form.namaPt.trim()) return;
            void onSave(form);
          }}
          className="flex flex-col flex-1 min-h-0"
        >
        <div className="px-4 py-3 space-y-3 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 gap-3">
            <LabeledField label="Nama PT">
              <input
                value={form.namaPt}
                onChange={(e) => handleChange('namaPt', e.target.value)}
                placeholder="Nama perusahaan distributor"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Nama Sales">
              <input
                value={form.namaSales}
                onChange={(e) => handleChange('namaSales', e.target.value)}
                placeholder="Nama contact person / sales"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Kontak WA (angka, tanpa +)">
              <input
                value={form.kontakWa}
                onChange={(e) => handleChange('kontakWa', e.target.value)}
                placeholder="628xxxxxx"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Email">
              <input
                value={form.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@distributor.co.id"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <LabeledField label="Alamat">
              <textarea
                rows={2}
                value={form.alamat ?? ''}
                onChange={(e) => handleChange('alamat', e.target.value)}
                placeholder="Alamat kantor / gudang utama"
                className="w-full bg-slate-900/80 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
            </LabeledField>
            <label className="flex items-center gap-2 text-[11px] text-cyan-300">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => handleChange('aktif', e.target.checked)}
                className="h-3 w-3 rounded border-cyan-600 bg-slate-900"
              />
              Aktif
            </label>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-800/80 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || !form.namaPt.trim()}
            className="px-4 py-1.5 rounded-full text-xs font-semibold
                       bg-gradient-to-r from-emerald-400 to-cyan-400
                       text-black shadow-[0_0_18px_rgba(34,211,238,0.6)] hover:shadow-[0_0_22px_rgba(34,211,238,0.9)]
                       disabled:opacity-60"
          >
            {saving ? 'Menyimpan...' : 'Simpan Distributor'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
}

function SummaryCard(props: { title: string; value: number; subtitle: string }) {
  const { title, value, subtitle } = props;
  return (
    <div className="bg-gradient-to-br from-[#0B0F15]/95 to-[#101A24]/95 border border-[#D4AF37]/70 rounded-2xl p-4 backdrop-blur-md animate-in fade-in duration-300">
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

