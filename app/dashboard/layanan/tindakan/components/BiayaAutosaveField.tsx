"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 550;

export type BiayaAutosaveFieldKey =
  | "total"
  | "krs"
  | "consumable"
  | "pemakaian";

const NUMERIC: Set<BiayaAutosaveFieldKey> = new Set([
  "total",
  "krs",
  "consumable",
]);

/** Hilangkan prefiks "Rp" / "rp." dari teks nominal (tempel dari luar / data kotor). */
function stripLeadingRp(raw: string): string {
  return raw.trim().replace(/^rp\.?\s*/i, "").trim();
}

/** Format angka ke ribuan (14000000 -> 14.000.000) */
function formatRibuan(val: string): string {
  const numeric = val.replace(/\D/g, "");
  if (!numeric) return "";
  return Number(numeric).toLocaleString("id-ID");
}

function draftFromValue(field: BiayaAutosaveFieldKey, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (field === "total" || field === "krs" || field === "consumable") {
    const n = typeof value === "number" ? value : Number(String(value).replace(/\D/g, ""));
    if (Number.isFinite(n)) return n.toLocaleString("id-ID");
    return String(value);
  }
  return String(value);
}

function parseNumeric(raw: string): { ok: true; v: number | null } | { ok: false } {
  const normalized = stripLeadingRp(raw).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!normalized) return { ok: true, v: null };
  const n = Number(normalized);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, v: n };
}

function valueAsNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const p = parseNumeric(String(v));
  return p.ok ? p.v : null;
}

function numericEqual(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-9;
}

function normalizeTextPayload(raw: string): string | null {
  const t = raw.trim();
  return t === "" ? null : t;
}

function serverTextNorm(serverVal: unknown): string | null {
  if (serverVal === null || serverVal === undefined || serverVal === "")
    return null;
  const t = String(serverVal).trim();
  return t === "" ? null : t;
}

function textEqualServer(draft: string, serverVal: unknown): boolean {
  return normalizeTextPayload(draft) === serverTextNorm(serverVal);
}

type Props = {
  tindakanId: string;
  field: BiayaAutosaveFieldKey;
  value: unknown;
  onSaved?: () => void;
};

export default function BiayaAutosaveField({
  tindakanId,
  field,
  value,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState(() => draftFromValue(field, value));
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const inputFocusedRef = useRef(false);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    inputFocusedRef.current = false;
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, [tindakanId]);

  useEffect(() => {
    if (inputFocusedRef.current) return;
    const next = draftFromValue(field, value);
    setDraft(next);
  }, [value, field, tindakanId]);

  // Auto-sync untuk field pemakaian jika masih kosong
  useEffect(() => {
    if (field !== "pemakaian" || value || !tindakanId) return;

    const autoSync = async () => {
      try {
        const res = await fetch(`/api/pemakaian-orders?tindakanId=${encodeURIComponent(tindakanId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const j = await res.json();
        if (res.ok && j.ok && Array.isArray(j.orders) && j.orders.length > 0) {
          const order = j.orders[0];
          if (Array.isArray(order.items) && order.items.length > 0) {
            // Re-use logic build resume dari modal (tapi di sini kita hanya punya data item)
            const resumeText = order.items
              .map((it: any) => {
                let h = `• ${String(it.barang || "").trim().toUpperCase()}`;
                const m = [];
                if (it.qtyDipakai > 1) m.push(`${it.qtyDipakai}x`);
                if (it.tipe === "R" || it.tipe === "REUSE") m.push("REUSE");
                if (m.length > 0) h += ` (${m.join(", ")})`;
                
                const p = [h];
                if (it.lot?.trim()) p.push(`LOT: ${it.lot.trim()}`);
                if (it.ukuran?.trim()) p.push(`Ukuran: ${it.ukuran.trim()}`);
                if (it.ed?.trim()) p.push(`ED: ${it.ed.trim()}`);
                return p.join("\n");
              })
              .join("\n\n");

            if (resumeText) {
              setDraft(resumeText);
              void persist(resumeText);
            }
          }
        }
      } catch (e) {
        console.warn("[BiayaAutosaveField] Auto-sync failed:", e);
      }
    };

    void autoSync();
  }, [field, value, tindakanId]);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        void persist(draftRef.current);
      }
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    },
    [],
  );

  const persist = async (draftNow: string) => {
    let payloadVal: unknown;

    if (NUMERIC.has(field)) {
      const numericString = draftNow.replace(/\D/g, "");
      const n = numericString === "" ? null : Number(numericString);
      payloadVal = n;
      
      const currentVal = valueAsNumber(valueRef.current);
      if (numericEqual(n, currentVal)) return;
    } else {
      payloadVal = normalizeTextPayload(draftNow);
      if (textEqualServer(draftNow, valueRef.current)) return;
    }

    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: payloadVal }),
        },
      );
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || res.statusText);
      }
      onSaved?.();
    } catch (e) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[BiayaAutosaveField]", field, e);
      }
    }
  };

  const schedulePersist = (nextDraft: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void persist(nextDraft);
    }, DEBOUNCE_MS);
  };

  const flushBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (NUMERIC.has(field)) {
      const p = parseNumeric(draftRef.current);
      if (!p.ok) {
        setDraft(draftFromValue(field, value));
        return;
      }
      void persist(draftRef.current);
      return;
    }
    void persist(draftRef.current);
  };

  const inputClass = cn(
    "mt-0.5 w-full rounded-md border px-2 py-1.5 text-sm font-semibold focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30",
    "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
  );
  const aria =
    field === "total"
      ? "Perolehan BPJS"
      : field === "consumable"
        ? "Consumable"
        : field === "krs"
          ? "Total KRS"
          : "Pemakaian";

  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    inputFocusedRef.current = true;
  };

  const handleBlur = () => {
    flushBlur();
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      blurTimerRef.current = null;
      inputFocusedRef.current = false;
      const next = draftFromValue(field, valueRef.current);
      setDraft(next);
    }, 800);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDraft("");
    void persist("");
  };

  if (field === "pemakaian") {
    return (
      <textarea
        rows={8}
        autoComplete="off"
        className={cn(
          inputClass,
          "min-h-[10rem] resize-y font-mono text-[11px] leading-relaxed whitespace-pre-wrap",
        )}
        placeholder="—"
        value={draft}
        aria-label={aria}
        onFocus={handleFocus}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          schedulePersist(v);
        }}
        onBlur={handleBlur}
      />
    );
  }

  if (NUMERIC.has(field)) {
    return (
      <div
        className={cn(
          "mt-0.5 flex max-w-[min(100%,18rem)] items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/30",
          "border-cyan-400/55 bg-white dark:border-cyan-900/50 dark:bg-black/40",
        )}
        role="group"
        aria-label={aria}
      >
        <span
          className={cn(
            "shrink-0 text-sm font-semibold",
            "text-cyan-700 dark:text-cyan-500/90",
          )}
        >
          Rp
        </span>
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-sm font-semibold focus:outline-none focus:ring-0",
            "text-slate-950 placeholder:text-slate-500 dark:text-white dark:placeholder:text-white/90",
          )}
          placeholder="0"
          value={draft}
          aria-label={`${aria} (angka)`}
          onFocus={handleFocus}
          onChange={(e) => {
            const raw = e.target.value;
            const formatted = formatRibuan(raw);
            setDraft(formatted);
            schedulePersist(raw.replace(/\D/g, ""));
          }}
          onBlur={handleBlur}
        />
        {draft && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
            title="Hapus"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return null;
}
