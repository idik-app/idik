"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  useMasterTindakan,
  type MasterTindakanRow,
} from "../contexts/MasterTindakanContext";

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

function EditableNamaCell({
  rowId,
  value,
}: {
  rowId: string;
  value: string;
}) {
  const { patchMasterTindakan } = useMasterTindakan();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = useCallback(async () => {
    setErr(null);
    const next = draft.trim();
    const cur = value.trim();
    if (next.length < 1) {
      setErr("Nama wajib diisi");
      return;
    }
    if (next === cur) {
      setEditing(false);
      return;
    }
    const r = await patchMasterTindakan(rowId, { nama: next });
    if (!r.ok) {
      setErr(r.message ?? "Gagal menyimpan");
      return;
    }
    setEditing(false);
  }, [draft, value, rowId, patchMasterTindakan]);

  const cancel = useCallback(() => {
    setDraft(value);
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
        {value.trim() ? value : (
          <span className="text-cyan-600/80">—</span>
        )}
      </button>
    );
  }

  return (
    <div className="w-full min-w-[8rem]">
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
      {err ? <p className="text-[11px] text-red-400 mt-0.5">{err}</p> : null}
    </div>
  );
}

function EditableUrutanCell({
  rowId,
  value,
}: {
  rowId: string;
  value: number;
}) {
  const { patchMasterTindakan } = useMasterTindakan();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const commit = useCallback(async () => {
    setErr(null);
    const n = Math.trunc(Number(draft.trim()));
    if (!Number.isFinite(n)) {
      setErr("Angka valid");
      return;
    }
    if (n === value) {
      setEditing(false);
      return;
    }
    const r = await patchMasterTindakan(rowId, { urutan: n });
    if (!r.ok) {
      setErr(r.message ?? "Gagal menyimpan");
      return;
    }
    setEditing(false);
  }, [draft, value, rowId, patchMasterTindakan]);

  const cancel = useCallback(() => {
    setDraft(String(value));
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
        <span className="text-cyan-100">{value}</span>
      </button>
    );
  }

  return (
    <div className="w-full min-w-[4rem]">
      <input
        ref={inputRef}
        type="number"
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
      {err ? <p className="text-[11px] text-red-400 mt-0.5">{err}</p> : null}
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
  const { patchMasterTindakan } = useMasterTindakan();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const apply = async (next: boolean) => {
    if (next === aktif) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const r = await patchMasterTindakan(rowId, { aktif: next });
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

interface Props {
  rows: MasterTindakanRow[];
  onDelete: (row: { id: string; nama: string }) => void;
  noMatch?: boolean;
}

export default function MasterTindakanTable({
  rows,
  onDelete,
  noMatch,
}: Props) {
  if (noMatch) {
    return (
      <p className="text-center text-cyan-400 py-8 px-2 animate-in fade-in duration-200">
        Tidak ada item yang cocok dengan pencarian atau filter.
      </p>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <p className="text-center text-cyan-400 py-6 animate-in fade-in duration-200">
        Belum ada data. Gunakan tombol Tambah untuk menambahkan jenis tindakan.
      </p>
    );
  }

  return (
    <div
      className="relative overflow-x-auto rounded-xl border border-cyan-700/40 
                 bg-gradient-to-br from-cyan-900/10 to-black/60 
                 shadow-[0_0_15px_rgba(0,255,255,0.1)] backdrop-blur-md animate-in fade-in duration-300"
    >
      <div
        className="absolute inset-0 bg-gradient-to-br 
                    from-[hsl(var(--cyan))/0.08] via-transparent 
                    to-[hsl(var(--gold))/0.06] blur-2xl 
                    rounded-xl pointer-events-none"
      />

      <table className="relative w-full text-sm border-collapse z-10 min-w-[520px]">
        <thead className="sticky top-0 bg-black/60 text-yellow-400 backdrop-blur-sm">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Nama</th>
            <th className="px-3 py-2 text-left font-medium w-28">Urutan</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
            <th className="px-3 py-2 text-center font-medium w-28">Aksi</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t border-cyan-600/20 hover:bg-cyan-400/10 transition-all"
            >
              <td className="px-3 py-2 align-top">
                <EditableNamaCell rowId={r.id} value={r.nama} />
              </td>
              <td className="px-3 py-2 align-top">
                <EditableUrutanCell rowId={r.id} value={r.urutan} />
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
                  title="Hapus"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
