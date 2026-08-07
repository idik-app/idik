"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type LogBarangKlinisItem,
  normalizeCekJam,
  nowCekJamLocal,
  sanitizeLogBarangKlinis,
} from "@/lib/tindakan/cekObatPemakaianBridge";

const DEBOUNCE_MS = 550;

type Props = {
  tindakanId: string;
  value: unknown;
  onSaved?: (info?: { field?: string }) => void;
  patchExecutor?: (body: Record<string, unknown>) => Promise<void>;
};

function newId() {
  return `lb-${Math.random().toString(36).slice(2, 11)}`;
}

function formatTimeOnTheFly(val: string): string {
  let cleaned = val.replace(/[^0-9:]/g, "");
  if (!cleaned.includes(":") && cleaned.length === 4) {
    cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`;
  }
  const parts = cleaned.split(":");
  if (parts.length === 2) {
    let h = parts[0].slice(0, 2);
    let m = parts[1].slice(0, 2);
    const hNum = parseInt(h, 10);
    const mNum = parseInt(m, 10);
    if (!isNaN(hNum) && hNum > 23) h = "23";
    if (!isNaN(mNum) && mNum > 59) m = "59";
    cleaned = `${h}:${m}`;
  }
  return cleaned.slice(0, 5);
}

async function patchTindakan(
  tindakanId: string,
  body: Record<string, unknown>,
  patchExecutor?: (body: Record<string, unknown>) => Promise<void>,
) {
  if (patchExecutor) {
    await patchExecutor(body);
    return;
  }
  const res = await fetch(`/api/tindakan/${encodeURIComponent(tindakanId)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || json.ok === false) {
    throw new Error(json.message || `Gagal simpan (${res.status})`);
  }
}

export default function LogBarangKlinisFields({
  tindakanId,
  value,
  onSaved,
  patchExecutor,
}: Props) {
  const canEdit = Boolean(tindakanId);
  const [items, setItems] = useState<LogBarangKlinisItem[]>(() =>
    sanitizeLogBarangKlinis(value),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setItems(sanitizeLogBarangKlinis(value));
  }, [value, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = async (next: LogBarangKlinisItem[]) => {
    const cleaned = sanitizeLogBarangKlinis(next);
    await patchTindakan(
      tindakanId,
      { log_barang_klinis: cleaned },
      patchExecutor,
    );
    onSaved?.({ field: "log_barang_klinis" });
  };

  const schedule = (next: LogBarangKlinisItem[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void persist(next).catch(() => {
        setItems(sanitizeLogBarangKlinis(value));
      });
    }, DEBOUNCE_MS);
  };

  const updateAt = (idx: number, patch: Partial<LogBarangKlinisItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setItems(next);
    schedule(next);
  };

  const addRow = (presetNama?: string) => {
    const next = [
      ...items,
      {
        id: newId(),
        nama: presetNama ?? "",
        jam: nowCekJamLocal(),
        keterangan: null,
        oleh: null,
      },
    ];
    setItems(next);
    void persist(next).catch(() => setItems(sanitizeLogBarangKlinis(value)));
  };

  const removeAt = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    void persist(next).catch(() => setItems(sanitizeLogBarangKlinis(value)));
  };

  const inputClass =
    "min-h-10 w-full rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-[12px] font-semibold text-white placeholder:text-white/50 outline-none focus:ring-1 focus:ring-white/25 disabled:opacity-60";

  return (
    <div className="rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a202c]">
          Log barang / obat
        </h3>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => addRow("NTG / Cedocard")}
              className="rounded-lg border border-[#2C3E50]/30 bg-white/40 px-2 py-1 text-[10px] font-bold uppercase text-[#1a202c] hover:bg-white/70"
            >
              NTG / Cedocard
            </button>
            <button
              type="button"
              onClick={() => addRow("Heparin")}
              className="rounded-lg border border-[#2C3E50]/30 bg-white/40 px-2 py-1 text-[10px] font-bold uppercase text-[#1a202c] hover:bg-white/70"
            >
              Heparin
            </button>
            <button
              type="button"
              onClick={() => addRow()}
              className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#2C3E50] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#1a202c]"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] font-medium text-[#2d3748]/80">
          Belum ada baris. Tambah untuk mencatat barang/obat klinis (dokumentasi).
        </p>
      ) : (
        <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-0.5">
          {items.map((it, idx) => (
            <li
              key={it.id}
              className="rounded-xl border border-[#9AA8B8]/80 bg-[#A8B4C4]/60 p-2"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={it.nama}
                  disabled={!canEdit}
                  placeholder="Nama"
                  aria-label="Nama barang/obat"
                  onChange={(e) => updateAt(idx, { nama: e.target.value })}
                  className={cn(inputClass, "sm:flex-1")}
                />
                <input
                  type="text"
                  value={it.jam ?? ""}
                  disabled={!canEdit}
                  placeholder="HH:mm"
                  aria-label="Jam"
                  onChange={(e) => {
                    const jam = formatTimeOnTheFly(e.target.value);
                    updateAt(idx, {
                      jam: jam === "" ? null : normalizeCekJam(jam) ?? jam,
                    });
                  }}
                  className={cn(inputClass, "sm:w-[5.5rem]")}
                />
                <input
                  type="text"
                  value={it.keterangan ?? ""}
                  disabled={!canEdit}
                  placeholder="Keterangan"
                  aria-label="Keterangan"
                  onChange={(e) =>
                    updateAt(idx, {
                      keterangan: e.target.value.trim() ? e.target.value : null,
                    })
                  }
                  className={cn(inputClass, "sm:flex-1")}
                />
                <input
                  type="text"
                  value={it.oleh ?? ""}
                  disabled={!canEdit}
                  placeholder="Oleh"
                  aria-label="Oleh"
                  onChange={(e) =>
                    updateAt(idx, {
                      oleh: e.target.value.trim() ? e.target.value : null,
                    })
                  }
                  className={cn(inputClass, "sm:w-[7rem]")}
                />
                {canEdit && (
                  <button
                    type="button"
                    aria-label="Hapus baris log"
                    onClick={() => removeAt(idx)}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[#7f1d1d] hover:bg-red-100/80"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
