"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";

type Props = {
  value: string;
  onChange: (next: string) => void;
  onCommit?: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  /** textarea di panel zoom (untuk ket) */
  multiline?: boolean;
  /** Format on setiap ketikan (mis. jam HH:mm) */
  formatDraft?: (raw: string) => string;
  /** Input ringkas di baris */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
};

/**
 * Field baris + panel zoom saat focus/klik agar mengetik lebih leluasa.
 */
export default function ZoomTextField({
  value,
  onChange,
  onCommit,
  placeholder,
  disabled,
  className,
  multiline,
  formatDraft,
  inputMode,
  "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => zoomRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onCommit?.(value);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        onCommit?.(value);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onCommit, value]);

  const apply = (raw: string) => {
    const next = formatDraft ? formatDraft(raw) : raw;
    onChange(next);
  };

  const baseInput =
    "min-h-10 w-full rounded-xl border border-white/12 bg-[#5C6573] px-2 py-1.5 text-[12px] font-semibold text-white placeholder:text-white/50 outline-none focus:ring-1 focus:ring-white/25 disabled:opacity-60";

  return (
    <div ref={wrapRef} className={cn("relative min-w-0", className)}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        inputMode={inputMode}
        readOnly={Boolean(multiline) && !open}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onClick={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(e) => {
          if (!open) setOpen(true);
          apply(e.target.value);
        }}
        className={cn(baseInput, "truncate")}
      />
      {open && !disabled ? (
        <div
          className={cn(
            "absolute left-0 top-0 w-[min(100vw-2rem,20rem)] rounded-xl border border-white/20 bg-[#4a5568] p-2 shadow-xl",
            UI_LAYERS.popover,
          )}
        >
          {multiline ? (
            <textarea
              ref={zoomRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              placeholder={placeholder}
              aria-label={ariaLabel}
              rows={3}
              onChange={(e) => apply(e.target.value)}
              onBlur={() => {
                // delay agar klik dalam panel tidak menutup dulu
                window.setTimeout(() => {
                  if (!wrapRef.current?.contains(document.activeElement)) {
                    setOpen(false);
                    onCommit?.(value);
                  }
                }, 120);
              }}
              className="w-full resize-y rounded-lg border border-white/12 bg-[#5C6573] px-2.5 py-2 text-sm font-semibold text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/30"
            />
          ) : (
            <input
              ref={zoomRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={value}
              placeholder={placeholder}
              aria-label={ariaLabel}
              inputMode={inputMode}
              onChange={(e) => apply(e.target.value)}
              onBlur={() => {
                window.setTimeout(() => {
                  if (!wrapRef.current?.contains(document.activeElement)) {
                    setOpen(false);
                    onCommit?.(value);
                  }
                }, 120);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setOpen(false);
                  onCommit?.(value);
                }
              }}
              className="min-h-11 w-full rounded-lg border border-white/12 bg-[#5C6573] px-2.5 py-2 text-sm font-semibold text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/30"
            />
          )}
          <p className="mt-1 text-[10px] font-medium text-white/70">
            Esc / klik luar untuk tutup
          </p>
        </div>
      ) : null}
    </div>
  );
}
