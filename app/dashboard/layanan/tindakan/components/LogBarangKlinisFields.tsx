"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  type LogBarangKlinisItem,
  type UpsertLogFromCekKind,
  normalizeCekJam,
  nowCekJamLocal,
  sanitizeLogBarangKlinis,
  toBoolCek,
  upsertLogFromCek,
} from "@/lib/tindakan/cekObatPemakaianBridge";
import { runCekObatSideEffects } from "@/lib/tindakan/runCekObatSideEffects";
import ZoomTextField from "./ZoomTextField";

const DEBOUNCE_MS = 550;

type CekValues = {
  cek_ntg_cedocard?: unknown;
  cek_heparin?: unknown;
  cek_lain?: unknown;
};

/** Nilai dari tab Dokter & tim untuk opsi / autofill Oleh. */
type TimValues = {
  dokter?: unknown;
  dokter_anestesi?: unknown;
  ppds?: unknown;
  asisten?: unknown;
  sirkuler?: unknown;
  logger?: unknown;
};

type Props = {
  tindakanId: string;
  value: unknown;
  /** Untuk chip status checklist klinis (baca-saja). */
  cekValues?: CekValues;
  timValues?: TimValues;
  onSaved?: (info?: { field?: string }) => void;
  patchExecutor?: (body: Record<string, unknown>) => Promise<void>;
};

const TIM_NAME_KEYS = [
  "dokter",
  "dokter_anestesi",
  "ppds",
  "asisten",
  "sirkuler",
  "logger",
] as const;

/** Prioritas autofill Oleh: Logger → Asisten → … → Dokter */
const OLEH_DEFAULT_KEYS = [
  "logger",
  "asisten",
  "sirkuler",
  "ppds",
  "dokter_anestesi",
  "dokter",
] as const;

function toName(v: unknown): string {
  return String(v ?? "").trim();
}

function collectTimNames(tim?: TimValues): string[] {
  if (!tim) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of TIM_NAME_KEYS) {
    const n = toName(tim[key]);
    if (!n) continue;
    const k = n.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(n);
  }
  return out;
}

function defaultOlehFromTim(tim?: TimValues): string | null {
  if (!tim) return null;
  for (const key of OLEH_DEFAULT_KEYS) {
    const n = toName(tim[key]);
    if (n) return n;
  }
  return null;
}

const CEK_MENU: {
  kind: UpsertLogFromCekKind;
  label: string;
  bridge: boolean;
}[] = [
  { kind: "ntg_cedocard", label: "NTG / Cedocard", bridge: true },
  { kind: "heparin", label: "Heparin", bridge: true },
  { kind: "lain", label: "Lain", bridge: false },
];

function newId() {
  return `lb-${Math.random().toString(36).slice(2, 11)}`;
}

function cekPatchKeys(kind: UpsertLogFromCekKind) {
  if (kind === "lain") {
    return {
      checkedKey: "cek_lain",
      ketKey: "cek_lain_ket",
      jamKey: "cek_lain_jam",
      olehKey: "cek_lain_oleh",
    };
  }
  if (kind === "heparin") {
    return {
      checkedKey: "cek_heparin",
      ketKey: "cek_heparin_ket",
      jamKey: "cek_heparin_jam",
      olehKey: "cek_heparin_oleh",
    };
  }
  return {
    checkedKey: "cek_ntg_cedocard",
    ketKey: "cek_ntg_cedocard_ket",
    jamKey: "cek_ntg_cedocard_jam",
    olehKey: "cek_ntg_cedocard_oleh",
  };
}

function expectedNama(kind: UpsertLogFromCekKind) {
  if (kind === "heparin") return "Heparin";
  if (kind === "lain") return "Lain";
  return "NTG / Cedocard";
}

function hasLogNama(items: LogBarangKlinisItem[], kind: UpsertLogFromCekKind) {
  const target = expectedNama(kind).toLowerCase();
  return items.some((it) => it.nama.trim().toLowerCase() === target);
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
  cekValues,
  timValues,
  onSaved,
  patchExecutor,
}: Props) {
  const canEdit = Boolean(tindakanId);
  const menuId = useId();
  const olehListId = useId();
  const [items, setItems] = useState<LogBarangKlinisItem[]>(() =>
    sanitizeLogBarangKlinis(value),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  const tambahBtnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollToIdRef = useRef<string | null>(null);

  const timNames = useMemo(() => collectTimNames(timValues), [timValues]);
  const defaultOleh = useMemo(
    () => defaultOlehFromTim(timValues),
    [timValues],
  );

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

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        tambahBtnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const id = scrollToIdRef.current;
    if (!id || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-log-id="${id}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    scrollToIdRef.current = null;
  }, [items]);

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

  const addBlankRow = () => {
    setMenuOpen(false);
    const id = newId();
    const next = [
      ...items,
      {
        id,
        nama: "",
        jam: nowCekJamLocal(),
        keterangan: null,
        oleh: defaultOleh,
      },
    ];
    scrollToIdRef.current = id;
    setItems(next);
    dirtyRef.current = true;
    void persist(next).catch(() => {
      dirtyRef.current = false;
      setItems(sanitizeLogBarangKlinis(value));
    });
  };

  const addFromCek = async (kind: UpsertLogFromCekKind) => {
    setMenuOpen(false);
    if (busy) return;
    setBusy(true);
    const jam = nowCekJamLocal();
    const wasNew = !hasLogNama(items, kind);
    const upserted = upsertLogFromCek({
      items,
      kind,
      ket: "",
      jam,
      oleh: defaultOleh,
    });
    // Pastikan jam/oleh terisi pada baris target jika field masih kosong
    let nextItems = upserted.items;
    const target = expectedNama(kind).toLowerCase();
    nextItems = nextItems.map((it) => {
      if (it.nama.trim().toLowerCase() !== target) return it;
      return {
        ...it,
        jam: it.jam || jam,
        oleh: it.oleh || defaultOleh,
      };
    });
    const targetRow = nextItems.find(
      (it) => it.nama.trim().toLowerCase() === target,
    );
    if (targetRow) scrollToIdRef.current = targetRow.id;

    setItems(nextItems);
    dirtyRef.current = true;

    const keys = cekPatchKeys(kind);
    try {
      await patchTindakan(
        tindakanId,
        {
          log_barang_klinis: sanitizeLogBarangKlinis(forPersist(nextItems)),
          [keys.checkedKey]: true,
          [keys.jamKey]: jam,
          ...(defaultOleh ? { [keys.olehKey]: defaultOleh } : {}),
        },
        patchExecutor,
      );
      dirtyRef.current = false;
      onSaved?.({ field: "log_barang_klinis" });
      onSaved?.({ field: keys.checkedKey });

      if (kind === "ntg_cedocard" || kind === "heparin") {
        await runCekObatSideEffects({
          tindakanId,
          kind,
          ket: targetRow?.keterangan ?? "",
          jam,
          offerFifo: wasNew,
        });
      }
    } catch {
      dirtyRef.current = false;
      setItems(sanitizeLogBarangKlinis(value));
    } finally {
      setBusy(false);
      tambahBtnRef.current?.focus();
    }
  };

  /** Hapus baris Log tidak me-reset cek_*. */
  const removeAt = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    dirtyRef.current = true;
    void persist(next).catch(() => {
      dirtyRef.current = false;
      setItems(sanitizeLogBarangKlinis(value));
    });
  };

  const statusActive = (kind: UpsertLogFromCekKind) => {
    const key =
      kind === "heparin"
        ? "cek_heparin"
        : kind === "lain"
          ? "cek_lain"
          : "cek_ntg_cedocard";
    return toBoolCek(cekValues?.[key]) || hasLogNama(items, kind);
  };

  return (
    <div className="flex h-full min-h-[280px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1a202c] dark:text-white">
            Log barang / obat
          </h3>
          <div className="flex flex-wrap items-center gap-1">
            {CEK_MENU.map((m) => {
              const on = statusActive(m.kind);
              return (
                <span
                  key={m.kind}
                  title={on ? `${m.label} sudah dicek` : `${m.label} belum`}
                  className={cn(
                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    on
                      ? "bg-[#2C3E50] text-white"
                      : "bg-white/35 text-[#1a202c]/55 dark:text-white/50",
                  )}
                >
                  {m.kind === "ntg_cedocard" ? "NTG" : m.label}
                </span>
              );
            })}
          </div>
        </div>

        {canEdit && (
          <div ref={menuWrapRef} className="relative">
            <button
              ref={tambahBtnRef}
              type="button"
              id={`${menuId}-trigger`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? `${menuId}-menu` : undefined}
              disabled={busy}
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-[#2C3E50] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#1a202c] disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah
              <ChevronDown className="h-3.5 w-3.5 opacity-80" />
            </button>
            {menuOpen && (
              <div
                id={`${menuId}-menu`}
                role="menu"
                aria-labelledby={`${menuId}-trigger`}
                className={cn(
                  "absolute right-0 top-full mt-1 w-56 overflow-hidden rounded-xl border border-white/20 bg-[#2C3E50] py-1 shadow-xl",
                  UI_LAYERS.popover,
                )}
              >
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Cek obat
                </p>
                {CEK_MENU.map((m) => {
                  const already = hasLogNama(items, m.kind);
                  return (
                    <button
                      key={m.kind}
                      type="button"
                      role="menuitem"
                      disabled={busy}
                      onClick={() => void addFromCek(m.kind)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      <span>Cek {m.label}</span>
                      {already ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-emerald-300">
                          <Check className="h-3 w-3" />
                          Sudah
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                <div className="my-1 border-t border-white/15" />
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={addBlankRow}
                  className="flex w-full items-center px-3 py-2 text-left text-[12px] font-semibold text-white hover:bg-white/10 disabled:opacity-60"
                >
                  Baris kosong
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-[12px] font-medium text-[#2d3748]/80 dark:text-white/85">
          Belum ada baris. Klik Tambah untuk cek obat atau baris baru.
        </p>
      ) : (
        <ul
          ref={listRef}
          className="max-h-[min(520px,55vh)] flex-1 space-y-2 overflow-y-auto pr-0.5"
        >
          {items.map((it, idx) => (
            <li
              key={it.id}
              data-log-id={it.id}
              className="min-w-0 rounded-xl border border-[#9AA8B8]/80 bg-[#A8B4C4]/60 p-2"
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <ZoomTextField
                  value={it.nama}
                  disabled={!canEdit}
                  placeholder="Nama"
                  aria-label="Nama barang/obat"
                  className="min-w-0 sm:flex-1"
                  onChange={(v) => updateAt(idx, { nama: v })}
                />
                <ZoomTextField
                  value={it.jam ?? ""}
                  disabled={!canEdit}
                  placeholder="HH:mm"
                  aria-label="Jam"
                  className="w-full sm:w-[5.5rem] sm:shrink-0"
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
                  className="min-w-0 sm:flex-1"
                  onChange={(v) =>
                    updateAt(idx, {
                      keterangan: v.trim() ? v : null,
                    })
                  }
                />
                <input
                  type="text"
                  list={timNames.length ? olehListId : undefined}
                  value={it.oleh ?? ""}
                  disabled={!canEdit}
                  placeholder="Oleh"
                  aria-label="Oleh"
                  onChange={(e) => {
                    const v = e.target.value;
                    updateAt(idx, { oleh: v.trim() ? v : null });
                  }}
                  className={cn(
                    "min-h-10 w-full truncate rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-[12px] font-semibold text-white placeholder:text-white/50 outline-none focus:ring-1 focus:ring-white/25 disabled:opacity-60",
                    "sm:w-[8.5rem] sm:shrink-0",
                  )}
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
            </li>
          ))}
        </ul>
      )}
      {timNames.length > 0 ? (
        <datalist id={olehListId}>
          {timNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
