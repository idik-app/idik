"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Syringe, Trash2 } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  DoctorCombobox,
  formatDoctorLabel,
  resolveDoctorFromLooseInput,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import { useMasterDoctors } from "@/app/hooks/useMasterData";
import { useMemo } from "react";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
  /** Drawer: input penuh. Tabel: ikon + popover. */
  variant: "drawer" | "tableIcon";
  /** Di tabel: true saat mouse di area sel dokter (ikon arc terbang seperti menu nama pasien). */
  arcOpen?: boolean;
  /** Untuk tabel: simpan lewat adapter (toast error sudah di `patchRowField`). */
  onCommit?: (next: string | null) => Promise<boolean>;
  className?: string;
  options?: DoctorOption[];
  loading?: boolean;
  error?: string | null;
};

const DRAWER_INPUT_CLASS =
  "mt-0.5 w-full min-w-0 rounded-md border border-cyan-900/50 bg-black/40 px-2 py-1.5 text-sm font-semibold text-white placeholder:text-white/90 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30";

function norm(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

export default function DokterAnestesiField({
  tindakanId,
  value,
  onSaved,
  variant,
  arcOpen = false,
  onCommit,
  className,
  options = [],
  loading = false,
  error = null,
}: Props) {
  const { show } = useNotification();
  const uid = useId();
  const { doctors: rawDoctors, isLoading: doctorsLoading } = useMasterDoctors();

  const allOptions = useMemo(() => {
    // Priority: use the prop options if they are provided (e.g. from table), 
    // otherwise use the fetched doctors (e.g. for drawer).
    const source = (options && options.length > 0)
      ? options
      : (rawDoctors || []).map((r: any) => ({
          id: r.id,
          nama_dokter: r.nama_dokter,
          spesialis: r.spesialis,
          aktif: r.aktif,
        }) as DoctorOption);

    // Only show doctors with "Anestesi" specialty
    return source.filter((d: DoctorOption) =>
      d.spesialis?.toLowerCase().includes("anestesi")
    );
  }, [options, rawDoctors]);

  const combinedLoading = loading || (options.length === 0 && doctorsLoading);

  const [draft, setDraft] = useState(() => norm(String(value ?? "")));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastPersistedRef = useRef(norm(String(value ?? "")));

  useEffect(() => {
    const v = norm(String(value ?? ""));
    setDraft(v);
    lastPersistedRef.current = v;
  }, [value, tindakanId]);

  const persistInternal = useCallback(
    async (nextRaw: string | null) => {
      const tid = String(tindakanId ?? "").trim();
      if (!tid) return false;

      const next = nextRaw == null ? "" : norm(nextRaw);
      if (next === lastPersistedRef.current) return true;

      setSaving(true);
      try {
        const res = await fetch(
          `/api/tindakan/${encodeURIComponent(tid)}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dokter_anestesi: next || null }),
          },
        );
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !json.ok) {
          throw new Error(json.message || res.statusText);
        }
        lastPersistedRef.current = next;
        onSaved?.();
        return true;
      } catch (e) {
        show({
          type: "error",
          message: `Gagal simpan dokter anestesi: ${(e as Error).message}`,
        });
        setDraft(lastPersistedRef.current);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [show, tindakanId, onSaved],
  );

  const persist = useCallback(
    async (nextRaw: string | null) => {
      if (onCommit) {
        const next = nextRaw == null ? "" : norm(nextRaw);
        if (next === lastPersistedRef.current) return true;
        setSaving(true);
        try {
          const ok = await onCommit(next || null);
          if (ok) lastPersistedRef.current = next;
          else setDraft(lastPersistedRef.current);
          return ok;
        } finally {
          setSaving(false);
        }
      }
      return persistInternal(nextRaw);
    },
    [onCommit, persistInternal],
  );

  const onBlurCommit = useCallback(async () => {
    const ok = await persist(draft);
    if (variant === "tableIcon" && ok) setOpen(false);
  }, [draft, persist, variant]);

  const handleClear = useCallback(async () => {
    setDraft("");
    const ok = await persist(null);
    if (variant === "tableIcon" && ok) setOpen(false);
  }, [persist, variant]);

  if (variant === "drawer") {
    return (
      <div className={cn("relative w-full", className)}>
        <DoctorCombobox
          listboxId={`${uid}-dokter-anestesi-drawer`}
          value={draft}
          disabled={saving || combinedLoading}
          loading={combinedLoading}
          placeholder="Nama dokter anestesi…"
          options={allOptions}
          onChange={setDraft}
          onInputBlur={async (finalText) => {
            const m = allOptions;
            const resolved = m.length
              ? resolveDoctorFromLooseInput(m, finalText)
              : null;
            const persisted = resolved
              ? String(resolved.nama_dokter).trim()
              : finalText.trim();
            const display = resolved ? formatDoctorLabel(resolved) : finalText.trim();
            setDraft(display);
            await persist(persisted);
          }}
          onSelectOption={async (picked) => {
            const canonical = formatDoctorLabel(picked);
            setDraft(canonical);
            await persist(picked.nama_dokter || null);
          }}
          className="w-full"
          inputClassName={DRAWER_INPUT_CLASS}
        />
        {error && (
          <p className="mt-1 text-[10px] text-red-400">{error}</p>
        )}
      </div>
    );
  }

  const filled = Boolean(norm(String(value ?? "")));
  const titleText = filled
    ? `Dokter anestesi: ${norm(String(value ?? ""))}`
    : "Dokter anestesi — klik untuk mengisi";

  return (
    <div
      data-anestesi-field="true"
      className={cn(
        "pointer-events-auto relative flex shrink-0 items-center self-center",
        className,
      )}
    >
      <Popover
        open={open}
        onOpenChange={(o) => {
          if (o) setDraft(norm(String(value ?? "")));
          setOpen(o);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title={titleText}
            aria-label={titleText}
            disabled={saving || !String(tindakanId ?? "").trim()}
            data-no-row-click="true"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ease-out",
              "bg-teal-600 text-white shadow-md",
              "hover:scale-110 active:scale-100",
              "outline outline-1 outline-amber-400/40 dark:outline-amber-400/50",
              arcOpen && !open && "ring-2 ring-amber-400/70 dark:ring-amber-400/50",
              filled 
                ? "bg-teal-500 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/30 shadow-[0_0_10px_rgba(45,212,191,0.3)]" 
                : "border-amber-200/70 dark:border-amber-300/50 bg-teal-600",
              saving && "opacity-60",
              !String(tindakanId ?? "").trim() && "opacity-45 grayscale",
              !(arcOpen || filled || open) && "pointer-events-none scale-0 opacity-0",
            )}
          >
            {filled ? (
              <span
                className="absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full border border-white/60 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] dark:bg-amber-500"
                title={titleText}
                aria-hidden
              />
            ) : null}
            <Syringe className="h-3.5 w-3.5" aria-hidden strokeWidth={2.75} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className={cn(
            UI_LAYERS.popover,
            "w-[min(18rem,calc(100vw-2rem))] space-y-2 border border-slate-200 p-3 dark:border-white/15",
          )}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${uid}-popover-anestesi`}
              className="text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:text-white"
            >
              Dokter anestesi
            </label>
            {filled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleClear();
                }}
                className="flex items-center gap-1 text-[10px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title="Hapus dokter anestesi"
              >
                <Trash2 size={12} />
                <span>Hapus</span>
              </button>
            )}
          </div>
          <div className="relative w-full">
            <DoctorCombobox
              listboxId={`${uid}-popover-anestesi-combobox`}
              value={draft}
              disabled={saving || combinedLoading}
              loading={combinedLoading}
              placeholder="Nama dokter…"
              options={allOptions}
              onChange={setDraft}
              onInputBlur={async (finalText) => {
                const m = allOptions;
                const resolved = m.length
                  ? resolveDoctorFromLooseInput(m, finalText)
                  : null;
                const persisted = resolved
                  ? String(resolved.nama_dokter).trim()
                  : finalText.trim();
                const display = resolved
                  ? formatDoctorLabel(resolved)
                  : finalText.trim();
                setDraft(display);
                await persist(persisted);
              }}
              onSelectOption={async (picked) => {
                const canonical = formatDoctorLabel(picked);
                setDraft(canonical);
                await persist(picked.nama_dokter || null);
              }}
              className="w-full"
              inputClassName={cn(
                "w-full rounded-md border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1",
                "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 focus:ring-cyan-500/35",
                "dark:border-cyan-800/50 dark:bg-black/50 dark:text-white dark:placeholder:text-white/90",
              )}
            />
          </div>
          <p className="text-[10px] leading-snug text-slate-600 dark:text-white/85">
            Simpan otomatis saat klik di luar atau tekan Enter.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
