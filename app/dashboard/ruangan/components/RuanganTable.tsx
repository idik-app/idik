"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useRuangan, type RuanganRow } from "../contexts/RuanganContext";

function AktifBadge({ aktif }: { aktif: boolean }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium border ${
        aktif
          ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
          : "border-gray-500/40 bg-gray-900/60 text-gray-400"
      }`}
    >
      {aktif ? "Aktif" : "Nonaktif"}
    </span>
  );
}

type TextField = "nama" | "kode" | "kategori" | "keterangan";

function EditableTextCell({
  rowId,
  field,
  value,
  placeholder,
}: {
  rowId: string;
  field: TextField;
  value: string | null;
  placeholder?: string;
}) {
  const { patchRuangan } = useRuangan();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const commit = useCallback(async () => {
    setErr(null);
    const next = draft.trim();
    const cur = (value ?? "").trim();
    if (field === "nama") {
      if (next.length < 1) {
        setErr("Nama wajib diisi");
        return;
      }
    }
    if (next === cur) {
      setEditing(false);
      return;
    }
    const payload =
      field === "nama"
        ? { nama: next }
        : ({
            [field]: next.length ? next : null,
          } as Record<string, string | null>);
    const r = await patchRuangan(
      rowId,
      payload as Parameters<typeof patchRuangan>[1]
    );
    if (!r.ok) {
      setErr(r.message ?? "Gagal menyimpan");
      return;
    }
    setEditing(false);
  }, [draft, value, field, rowId, patchRuangan]);

  const cancel = useCallback(() => {
    setDraft(value ?? "");
    setErr(null);
    setEditing(false);
  }, [value]);

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full text-left rounded px-1.5 py-0.5 -mx-1.5 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition text-cyan-100/95"
        onClick={() => setEditing(true)}
      >
        {value?.trim() ? value : (
          <span className="text-cyan-600/80">{placeholder ?? "—"}</span>
        )}
      </button>
    );
  }

  return (
    <div className="w-full min-w-[6rem]">
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className="w-full bg-gray-950/80 border border-cyan-500/50 rounded px-2 py-1 text-sm text-cyan-50 focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
      />
      {err && <p className="text-[11px] text-red-400 mt-0.5">{err}</p>}
    </div>
  );
}

function EditableKapasitasCell({
  rowId,
  value,
}: {
  rowId: string;
  value: number | null;
}) {
  const { patchRuangan } = useRuangan();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value != null ? String(value) : "");
  }, [value, editing]);

  const commit = useCallback(async () => {
    setErr(null);
    const t = draft.trim();
    let kapasitas: number | null = null;
    if (t.length > 0) {
      const n = Number(t);
      if (!Number.isFinite(n) || n < 0) {
        setErr("Angka ≥ 0");
        return;
      }
      kapasitas = Math.floor(n);
    }
    const cur = value ?? null;
    if (kapasitas === cur) {
      setEditing(false);
      return;
    }
    const r = await patchRuangan(rowId, { kapasitas });
    if (!r.ok) {
      setErr(r.message ?? "Gagal menyimpan");
      return;
    }
    setEditing(false);
  }, [draft, value, rowId, patchRuangan]);

  const cancel = useCallback(() => {
    setDraft(value != null ? String(value) : "");
    setErr(null);
    setEditing(false);
  }, [value]);

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full text-left rounded px-1.5 py-0.5 -mx-1.5 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition"
        onClick={() => setEditing(true)}
      >
        {value != null ? (
          <span className="text-cyan-100">{value}</span>
        ) : (
          <span className="text-cyan-600/80">—</span>
        )}
      </button>
    );
  }

  return (
    <div className="w-full min-w-[4rem]">
      <input
        ref={inputRef}
        type="number"
        min={0}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void commit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className="w-full bg-gray-950/80 border border-cyan-500/50 rounded px-2 py-1 text-sm text-cyan-50 focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
      />
      {err && <p className="text-[11px] text-red-400 mt-0.5">{err}</p>}
    </div>
  );
}

function EditableAktifCell({
  rowId,
  aktif,
}: {
  rowId: string;
  aktif: boolean;
}) {
  const { patchRuangan } = useRuangan();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = async (next: boolean) => {
    if (next === aktif) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const r = await patchRuangan(rowId, { aktif: next });
    setBusy(false);
    if (!r.ok) return;
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        className="rounded px-1 py-0.5 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition"
        onClick={() => setEditing(true)}
      >
        <AktifBadge aktif={aktif} />
      </button>
    );
  }

  return (
    <select
      value={aktif ? "aktif" : "nonaktif"}
      disabled={busy}
      onChange={(e) => void apply(e.target.value === "aktif")}
      onBlur={() => setEditing(false)}
      className="bg-gray-950/90 border border-cyan-500/50 rounded px-2 py-1 text-xs text-cyan-100 focus:outline-none focus:ring-1 focus:ring-cyan-400/60"
      autoFocus
    >
      <option value="aktif">Aktif</option>
      <option value="nonaktif">Nonaktif</option>
    </select>
  );
}

interface RuanganTableProps {
  rows: RuanganRow[];
  onDelete: (row: { id: string; nama: string }) => void;
  noMatch?: boolean;
}

export default function RuanganTable({
  rows,
  onDelete,
  noMatch,
}: RuanganTableProps) {
  if (noMatch) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-cyan-400 py-8 px-2"
      >
        Tidak ada ruangan yang cocok dengan pencarian atau filter. Ubah kata
        kunci atau reset filter.
      </motion.p>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-cyan-400 py-6"
      >
        Belum ada data ruangan. Gunakan tombol Tambah untuk menambahkan.
      </motion.p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-x-auto rounded-xl border border-cyan-700/40 
                 bg-gradient-to-br from-cyan-900/10 to-black/60 
                 shadow-[0_0_15px_rgba(0,255,255,0.1)] backdrop-blur-md"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br 
                    from-[hsl(var(--cyan))/0.08] via-transparent 
                    to-[hsl(var(--gold))/0.06] blur-2xl 
                    rounded-xl pointer-events-none"
      />

      <table className="relative w-full text-sm border-collapse z-10 min-w-[720px]">
        <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Nama</th>
            <th className="px-3 py-2 text-left font-medium">Kode</th>
            <th className="px-3 py-2 text-left font-medium">Kategori</th>
            <th className="px-3 py-2 text-left font-medium w-24">Kapasitas</th>
            <th className="px-3 py-2 text-left font-medium">Keterangan</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
            <th className="px-3 py-2 text-center font-medium w-28">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <motion.tr
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="border-t border-cyan-600/20 hover:bg-cyan-400/10 transition-all"
            >
              <td className="px-3 py-2 align-top">
                <EditableTextCell rowId={r.id} field="nama" value={r.nama} />
              </td>
              <td className="px-3 py-2 align-top">
                <EditableTextCell
                  rowId={r.id}
                  field="kode"
                  value={r.kode}
                  placeholder="Kode"
                />
              </td>
              <td className="px-3 py-2 align-top">
                <EditableTextCell
                  rowId={r.id}
                  field="kategori"
                  value={r.kategori}
                  placeholder="Kategori"
                />
              </td>
              <td className="px-3 py-2 align-top">
                <EditableKapasitasCell rowId={r.id} value={r.kapasitas} />
              </td>
              <td className="px-3 py-2 align-top max-w-[240px]">
                <EditableTextCell
                  rowId={r.id}
                  field="keterangan"
                  value={r.keterangan}
                  placeholder="Catatan"
                />
              </td>
              <td className="px-3 py-2 text-center align-top">
                <EditableAktifCell rowId={r.id} aktif={r.aktif} />
              </td>
              <td className="px-3 py-2 text-center align-top">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete({ id: r.id, nama: r.nama });
                  }}
                  className="p-1.5 rounded-md border border-red-500/40 
                             text-red-400 hover:text-red-200 
                             hover:bg-red-500/10 
                             shadow-[0_0_8px_rgba(255,0,0,0.3)] transition"
                  title="Hapus ruangan"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
