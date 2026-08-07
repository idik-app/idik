"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clock } from "lucide-react";
import {
  buildPrefillSlot,
  CEK_OBAT_FIFO_NAME_HINTS,
  CEK_OBAT_LABEL,
  CEK_OBAT_TEMPLATE_BY_KIND,
  type CekObatKind,
  cekObatKeys,
  mergeObatAlkesPrefill,
  normalizeCekJam,
  nowCekJamLocal,
  parseQtyFromKet,
  sanitizeLogBarangKlinis,
  toBoolCek,
  upsertLogFromCek,
} from "@/lib/tindakan/cekObatPemakaianBridge";
import { normalizeMasterBarangUuid } from "@/lib/pemakaian/masterBarangUuidForFifo";
import ZoomTextField from "./ZoomTextField";

const DEBOUNCE_MS = 550;

type RowState = {
  checked: boolean;
  ket: string;
  jam: string;
  oleh: string;
};

type Props = {
  tindakanId: string;
  values: {
    cek_ntg_cedocard?: unknown;
    cek_ntg_cedocard_ket?: unknown;
    cek_ntg_cedocard_jam?: unknown;
    cek_ntg_cedocard_oleh?: unknown;
    cek_heparin?: unknown;
    cek_heparin_ket?: unknown;
    cek_heparin_jam?: unknown;
    cek_heparin_oleh?: unknown;
    cek_lain?: unknown;
    cek_lain_ket?: unknown;
    cek_lain_jam?: unknown;
    cek_lain_oleh?: unknown;
  };
  /** Existing log untuk merge saat centang */
  logBarangValue?: unknown;
  onSaved?: (info?: { field?: string }) => void;
  patchExecutor?: (body: Record<string, unknown>) => Promise<void>;
};

const ROWS: {
  kind: "ntg_cedocard" | "heparin" | "lain";
  label: string;
  ketPlaceholder: string;
  bridge?: CekObatKind;
}[] = [
  {
    kind: "ntg_cedocard",
    label: "NTG / Cedocard",
    ketPlaceholder: "Dosis / keterangan",
    bridge: "ntg_cedocard",
  },
  {
    kind: "heparin",
    label: "Heparin",
    ketPlaceholder: "Dosis / keterangan",
    bridge: "heparin",
  },
  {
    kind: "lain",
    label: "Lain",
    ketPlaceholder: "Nama / keterangan",
  },
];

function rowFromValues(
  kind: "ntg_cedocard" | "heparin" | "lain",
  values: Props["values"],
): RowState {
  const prefix =
    kind === "ntg_cedocard"
      ? "cek_ntg_cedocard"
      : kind === "heparin"
        ? "cek_heparin"
        : "cek_lain";
  const v = values as Record<string, unknown>;
  return {
    checked: toBoolCek(v[prefix]),
    ket: String(v[`${prefix}_ket`] ?? ""),
    jam: normalizeCekJam(v[`${prefix}_jam`]) ?? "",
    oleh: String(v[`${prefix}_oleh`] ?? ""),
  };
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

async function fetchLatestPemakaianOrder(tindakanId: string): Promise<{
  id: string;
  template_input_barang?: unknown;
  items?: unknown;
  tanggal?: string | null;
} | null> {
  const res = await fetch(
    `/api/pemakaian-orders?tindakanId=${encodeURIComponent(tindakanId)}&limit=20`,
    { credentials: "include" },
  );
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: Array<Record<string, unknown>>;
    rows?: Array<Record<string, unknown>>;
  };
  const rows = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.rows)
      ? json.rows
      : [];
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const ta = String(a.updated_at ?? a.created_at ?? "");
    const tb = String(b.updated_at ?? b.created_at ?? "");
    return tb.localeCompare(ta);
  });
  const top = sorted[0];
  return {
    id: String(top.id),
    template_input_barang: top.template_input_barang,
    items: top.items,
    tanggal: top.tanggal != null ? String(top.tanggal) : null,
  };
}

async function forwardPrefillPemakaian(opts: {
  tindakanId: string;
  kind: CekObatKind;
  ket: string;
  jam: string;
}) {
  const order = await fetchLatestPemakaianOrder(opts.tindakanId);
  if (!order) return { orderId: null as string | null };
  const rowId = CEK_OBAT_TEMPLATE_BY_KIND[opts.kind];
  const nextPrefill = buildPrefillSlot({ ket: opts.ket, jam: opts.jam });
  const merged = mergeObatAlkesPrefill(
    order.template_input_barang,
    rowId,
    nextPrefill,
  );
  if (!merged.changed) return { orderId: order.id };
  const res = await fetch(
    `/api/pemakaian-orders/${encodeURIComponent(order.id)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template_input_barang: merged.template }),
    },
  );
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[CekObat] prefill pemakaian gagal", await res.text());
    }
  }
  return { orderId: order.id };
}

async function tryFifoAllocate(opts: {
  tindakanId: string;
  kind: CekObatKind;
  ket: string;
  orderId: string | null;
}) {
  const hints = CEK_OBAT_FIFO_NAME_HINTS[opts.kind];
  const masterRes = await fetch("/api/master-barang", {
    credentials: "include",
  }).catch(() => null);
  let masterUuid: string | null = null;
  let masterNama = CEK_OBAT_LABEL[opts.kind];
  if (masterRes?.ok) {
    const mj = (await masterRes.json().catch(() => ({}))) as {
      data?: Array<{ id?: unknown; nama?: string | null }>;
      rows?: Array<{ id?: unknown; nama?: string | null }>;
      items?: Array<{ id?: unknown; nama?: string | null }>;
    };
    const rows = Array.isArray(mj.data)
      ? mj.data
      : Array.isArray(mj.rows)
        ? mj.rows
        : Array.isArray(mj.items)
          ? mj.items
          : [];
    for (const row of rows) {
      const nama = String(row.nama ?? "").toLowerCase();
      if (!hints.some((h) => nama.includes(h))) continue;
      const uuid = normalizeMasterBarangUuid(row.id);
      if (uuid) {
        masterUuid = uuid;
        masterNama = String(row.nama ?? masterNama);
        break;
      }
    }
  }
  if (!masterUuid) {
    // fallback: allocate by fuzzy name via kode skip — try search endpoint or direct allocate with name in keterangan only fails
    throw new Error(
      `Master barang untuk ${CEK_OBAT_LABEL[opts.kind]} tidak ditemukan (UUID).`,
    );
  }
  const jumlah = parseQtyFromKet(opts.ket);
  const res = await fetch("/api/pemakaian/allocate", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      master_barang_id: masterUuid,
      jumlah,
      lokasi: "Cathlab",
      keterangan: `Cek obat tab Tindakan: ${masterNama}${opts.orderId ? ` (order ${opts.orderId})` : ""}`,
      tindakan_id: opts.tindakanId,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    message?: string;
  };
  if (!res.ok || json.ok === false) {
    throw new Error(json.message || `Alokasi FIFO gagal (${res.status})`);
  }
}

export default function CekObatTindakanFields({
  tindakanId,
  values,
  logBarangValue,
  onSaved,
  patchExecutor,
}: Props) {
  const canEdit = Boolean(tindakanId);
  const baseId = useId();
  const [rows, setRows] = useState(() =>
    Object.fromEntries(
      ROWS.map((r) => [r.kind, rowFromValues(r.kind, values)]),
    ) as Record<"ntg_cedocard" | "heparin" | "lain", RowState>,
  );
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastAutoPrefillRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setRows(
      Object.fromEntries(
        ROWS.map((r) => [r.kind, rowFromValues(r.kind, values)]),
      ) as Record<"ntg_cedocard" | "heparin" | "lain", RowState>,
    );
  }, [values, tindakanId]);

  useEffect(
    () => () => {
      Object.values(debounceRef.current).forEach(clearTimeout);
    },
    [],
  );

  const patchKeysFor = (kind: "ntg_cedocard" | "heparin" | "lain") => {
    if (kind === "lain") {
      return {
        checkedKey: "cek_lain",
        ketKey: "cek_lain_ket",
        jamKey: "cek_lain_jam",
        olehKey: "cek_lain_oleh",
      };
    }
    return cekObatKeys(kind);
  };

  const persistRow = async (
    kind: "ntg_cedocard" | "heparin" | "lain",
    next: RowState,
    opts?: { wasUnchecked?: boolean },
  ) => {
    const keys = patchKeysFor(kind);
    const jam = normalizeCekJam(next.jam);
    const body: Record<string, unknown> = {
      [keys.checkedKey]: next.checked,
      [keys.ketKey]: next.ket.trim() || null,
      [keys.jamKey]: jam,
      [keys.olehKey]: next.oleh.trim() || null,
    };
    await patchTindakan(tindakanId, body, patchExecutor);
    onSaved?.({ field: keys.checkedKey });

    // Centang → upsert Log barang / obat
    if (next.checked && opts?.wasUnchecked) {
      try {
        const currentLog = sanitizeLogBarangKlinis(logBarangValue);
        const upserted = upsertLogFromCek({
          items: currentLog,
          kind,
          ket: next.ket,
          jam,
          oleh: next.oleh,
        });
        if (upserted.changed) {
          await patchTindakan(
            tindakanId,
            { log_barang_klinis: upserted.items },
            patchExecutor,
          );
          onSaved?.({ field: "log_barang_klinis" });
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[CekObat] upsert log", e);
        }
      }
    }

    const meta = ROWS.find((r) => r.kind === kind);
    if (
      meta?.bridge &&
      next.checked &&
      opts?.wasUnchecked
    ) {
      try {
        const { orderId } = await forwardPrefillPemakaian({
          tindakanId,
          kind: meta.bridge,
          ket: next.ket,
          jam: jam ?? "",
        });
        lastAutoPrefillRef.current[meta.bridge] = buildPrefillSlot({
          ket: next.ket,
          jam,
        });
        const label = CEK_OBAT_LABEL[meta.bridge];
        const okFifo = window.confirm(
          `Alokasi stok FIFO untuk ${label}? (Batal = hanya dokumentasi/checklist)`,
        );
        if (okFifo) {
          try {
            await tryFifoAllocate({
              tindakanId,
              kind: meta.bridge,
              ket: next.ket,
              orderId,
            });
          } catch (e) {
            window.alert(
              e instanceof Error
                ? e.message
                : "Alokasi FIFO gagal. Data cek obat tetap tersimpan.",
            );
          }
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[CekObat] bridge", e);
        }
      }
    } else if (meta?.bridge && next.checked) {
      // ket/jam change: refresh prefill if allowed
      try {
        const order = await fetchLatestPemakaianOrder(tindakanId);
        if (!order) return;
        const rowId = CEK_OBAT_TEMPLATE_BY_KIND[meta.bridge];
        const nextPrefill = buildPrefillSlot({ ket: next.ket, jam });
        const prev = lastAutoPrefillRef.current[meta.bridge] ?? null;
        const merged = mergeObatAlkesPrefill(
          order.template_input_barang,
          rowId,
          nextPrefill,
          prev,
        );
        if (merged.changed) {
          await fetch(`/api/pemakaian-orders/${encodeURIComponent(order.id)}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template_input_barang: merged.template }),
          });
          lastAutoPrefillRef.current[meta.bridge] = nextPrefill;
        }
      } catch {
        /* ignore */
      }
    }
  };

  const schedule = (
    kind: "ntg_cedocard" | "heparin" | "lain",
    next: RowState,
  ) => {
    const key = kind;
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      void persistRow(kind, next).catch(() => {
        setRows((prev) => ({
          ...prev,
          [kind]: rowFromValues(kind, values),
        }));
      });
    }, DEBOUNCE_MS);
  };

  const boxClass =
    "rounded-xl border border-[#9AA8B8]/80 bg-[#A8B4C4]/60 px-2.5 py-2";

  return (
    <div className="rounded-2xl border border-[#9AA8B8]/80 bg-[#B8C5D3] p-4 shadow-none">
      <h3 className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#1a202c]">
        Cek obat
      </h3>
      <div className="space-y-2.5">
        {ROWS.map((meta) => {
          const state = rows[meta.kind];
          const cid = `${baseId}-${meta.kind}`;
          return (
            <div key={meta.kind} className={boxClass}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
                <label
                  htmlFor={cid}
                  className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 sm:w-[9.5rem]"
                >
                  <input
                    id={cid}
                    type="checkbox"
                    className="h-4 w-4 accent-[#2C3E50]"
                    checked={state.checked}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const wasUnchecked = !state.checked && checked;
                      let jam = state.jam;
                      if (checked && !normalizeCekJam(jam)) {
                        jam = nowCekJamLocal();
                      }
                      const next = { ...state, checked, jam };
                      setRows((p) => ({ ...p, [meta.kind]: next }));
                      void persistRow(meta.kind, next, { wasUnchecked }).catch(
                        () => {
                          setRows((p) => ({
                            ...p,
                            [meta.kind]: rowFromValues(meta.kind, values),
                          }));
                        },
                      );
                    }}
                  />
                  <span className="text-[12px] font-bold text-[#1a202c] dark:text-white">
                    {meta.label}
                  </span>
                </label>
                <ZoomTextField
                  value={state.ket}
                  disabled={!canEdit}
                  placeholder={meta.ketPlaceholder}
                  aria-label={`${meta.label} keterangan`}
                  multiline
                  className="min-w-[8rem] flex-1"
                  onChange={(ket) => {
                    const next = { ...state, ket };
                    setRows((p) => ({ ...p, [meta.kind]: next }));
                    schedule(meta.kind, next);
                  }}
                />
                <div className="relative w-full shrink-0 sm:w-[5.5rem]">
                  <ZoomTextField
                    value={state.jam}
                    disabled={!canEdit}
                    placeholder="HH:mm"
                    aria-label={`${meta.label} jam`}
                    className="w-full pr-7"
                    inputMode="numeric"
                    formatDraft={formatTimeOnTheFly}
                    onChange={(jam) => {
                      const next = { ...state, jam };
                      setRows((p) => ({ ...p, [meta.kind]: next }));
                      if (jam === "" || jam.length === 5) {
                        schedule(meta.kind, next);
                      }
                    }}
                    onCommit={(jam) => {
                      const normalized =
                        jam === ""
                          ? ""
                          : normalizeCekJam(jam) ??
                            (jam.length === 5 ? jam : state.jam);
                      const next = { ...state, jam: normalized };
                      setRows((p) => ({ ...p, [meta.kind]: next }));
                      if (normalized === "" || normalized.length === 5) {
                        void persistRow(meta.kind, next).catch(() => {
                          setRows((p) => ({
                            ...p,
                            [meta.kind]: rowFromValues(meta.kind, values),
                          }));
                        });
                      }
                    }}
                  />
                  {canEdit && (
                    <button
                      type="button"
                      title="Jam sekarang"
                      aria-label={`Set jam sekarang ${meta.label}`}
                      className="absolute right-1.5 top-1/2 z-[1] flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-white/45 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        const jam = nowCekJamLocal();
                        const next = { ...state, jam };
                        setRows((p) => ({ ...p, [meta.kind]: next }));
                        void persistRow(meta.kind, next);
                      }}
                    >
                      <Clock className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ZoomTextField
                  value={state.oleh}
                  disabled={!canEdit}
                  placeholder="Oleh"
                  aria-label={`${meta.label} oleh`}
                  className="w-full sm:w-[6.5rem] sm:shrink-0"
                  onChange={(oleh) => {
                    const next = { ...state, oleh };
                    setRows((p) => ({ ...p, [meta.kind]: next }));
                    schedule(meta.kind, next);
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
