"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  type LogBarangKlinisItem,
  normalizeCekJam,
  nowCekJamLocal,
  sanitizeLogBarangKlinis,
} from "@/lib/tindakan/cekObatPemakaianBridge";
import ZoomTextField from "./ZoomTextField";

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

function forPersist(items: LogBarangKlinisItem[]): LogBarangKlinisItem[] {
  return items.map((it) => {
    const jamRaw = String(it.jam ?? "").trim();
    // Partial draft tidak di-persist sebagai null; hanya kosong atau HH:mm penuh
    const jam =
      jamRaw === ""
        ? null
        : jamRaw.length === 5
          ? normalizeCekJam(jamRaw)
          : null;
    return {
      ...it,
      nama: it.nama,
      jam,
      keterangan: it.keterangan?.trim() ? it.keterangan.trim() : null,
      oleh: it.oleh?.trim() ? it.oleh.trim() : null,
    };
  });
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
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (dirtyRef.current || debounceRef.current) return;
    setItems(sanitizeLogBarangKlinis(value));
  }, [value, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const persist = async (next: LogBarangKlinisItem[]) => {
    const cleaned = sanitizeLogBarangKlinis(forPersist(next));
    await patchTindakan(
      tindakanId,
      { log_barang_klinis: cleaned },
      patchExecutor,
    );
    dirtyRef.current = false;
    onSaved?.({ field: "log_barang_klinis" });
  };

  const schedule = (next: LogBarangKlinisItem[]) => {
    dirtyRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(next).catch(() => {
        dirtyRef.current = false;
        setItems(sanitizeLogBarangKlinis(value));
      });
    }, DEBOUNCE_MS);
  };

  /** Update lokal; optional skip schedule (untuk jam partial). */
  const updateAt = (
    idx: number,
    patch: Partial<LogBarangKlinisItem>,
    opts?: { persistNow?: boolean; schedule?: boolean },
  ) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setItems(next);
    dirtyRef.current = true;
    if (opts?.persistNow) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void persist(next).catch(() => {
        dirtyRef.current = false;
        setItems(sanitizeLogBarangKlinis(value));
      });
      return;
    }
    if (opts?.schedule === false) return;
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
    dirtyRef.current = true;
    void persist(next).catch(() => {
      dirtyRef.current = false;
      setItems(sanitizeLogBarangKlinis(value));
    });
  };

  const removeAt = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    dirtyRef.current = true;
    void persist(next).catch(() => {
      dirtyRef.current = false;
      setItems(sanitizeLogBarangKlinis(value));
    });
  };

  return (
    <div className="flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none">
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
          Belum ada baris. Centang Cek obat atau Tambah untuk mencatat.
        </p>
      ) : (
        <ul className="max-h-[min(520px,55vh)] flex-1 space-y-2 overflow-y-auto pr-0.5">
          {items.map((it, idx) => (
            <li
              key={it.id}
              className="min-w-0 rounded-xl border border-[#9AA8B8]/80 bg-[#A8B4C4]/60 p-2"
            >
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ZoomTextField
                    value={it.nama}
                    disabled={!canEdit}
                    placeholder="Nama"
                    aria-label="Nama barang/obat"
                    className="min-w-0 flex-1"
                    onChange={(v) => updateAt(idx, { nama: v })}
                  />
                  {canEdit && (
                    <button
                      type="button"
                      aria-label="Hapus baris log"
                      onClick={() => removeAt(idx)}
                      className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-[#7f1d1d] hover:bg-red-100/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <ZoomTextField
                    value={it.jam ?? ""}
                    disabled={!canEdit}
                    placeholder="HH:mm"
                    aria-label="Jam"
                    className="w-[5.5rem] shrink-0"
                    inputMode="numeric"
                    formatDraft={formatTimeOnTheFly}
                    onChange={(jam) => {
                      const nextJam = jam === "" ? null : jam;
                      setItems((prev) => {
                        const next = prev.map((row, i) =>
                          i === idx ? { ...row, jam: nextJam } : row,
                        );
                        dirtyRef.current = true;
                        if (jam === "" || jam.length === 5) {
                          schedule(next);
                        }
                        return next;
                      });
                    }}
                    onCommit={(jam) => {
                      setItems((prev) => {
                        const normalized =
                          jam === ""
                            ? null
                            : normalizeCekJam(jam) ??
                              (jam.length === 5 ? null : jam);
                        const next = prev.map((row, i) =>
                          i === idx ? { ...row, jam: normalized } : row,
                        );
                        if (jam === "" || jam.length === 5) {
                          dirtyRef.current = true;
                          void persist(next).catch(() => {
                            dirtyRef.current = false;
                            setItems(sanitizeLogBarangKlinis(value));
                          });
                        }
                        return next;
                      });
                    }}
                  />
                  <ZoomTextField
                    value={it.keterangan ?? ""}
                    disabled={!canEdit}
                    placeholder="Keterangan"
                    aria-label="Keterangan"
                    multiline
                    className="min-w-0 flex-1"
                    onChange={(v) =>
                      updateAt(idx, {
                        keterangan: v.trim() ? v : null,
                      })
                    }
                  />
                  <ZoomTextField
                    value={it.oleh ?? ""}
                    disabled={!canEdit}
                    placeholder="Oleh"
                    aria-label="Oleh"
                    className="w-[5.5rem] shrink-0"
                    onChange={(v) =>
                      updateAt(idx, { oleh: v.trim() ? v : null })
                    }
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
