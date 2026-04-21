"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquarePlus, MessageSquareText } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { cn } from "@/lib/utils";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
  placeholder?: string;
  className?: string;
};

export default function KeteranganField({
  tindakanId,
  value,
  onSaved,
  placeholder = "Keterangan...",
  className,
}: Props) {
  const { show } = useNotification();
  const [draft, setDraft] = useState(String(value ?? ""));
  const [saving, setSaving] = useState(false);
  /** false = tampilan ringkas (ikon); true = input terbuka untuk edit */
  const [isEditing, setIsEditing] = useState(false);
  const lastPersistedRef = useRef(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const val = String(value ?? "");
    setDraft(val);
    lastPersistedRef.current = val;
  }, [value, tindakanId]);

  const persist = useCallback(async () => {
    const next = draft.trim();
    if (next === lastPersistedRef.current) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/tindakan/${encodeURIComponent(tindakanId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keterangan: next || null }),
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
      setIsEditing(false);
      onSaved?.();
    } catch (e) {
      show({
        type: "error",
        message: `Gagal simpan Keterangan: ${(e as Error).message}`,
      });
      setDraft(lastPersistedRef.current);
    } finally {
      setSaving(false);
    }
  }, [draft, show, tindakanId, onSaved]);

  const openEditor = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setDraft(lastPersistedRef.current);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const summary = String(draft ?? "").trim();

  /** Belum isi sama sekali — tombol tambah */
  if (!isEditing && !summary) {
    return (
      <button
        type="button"
        title="Tambah Keterangan"
        onClick={openEditor}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex items-center justify-center rounded-full border border-transparent p-2 transition-all min-h-[2.25rem] min-w-[2.25rem]",
          "hover:bg-cyan-100/50 hover:border-cyan-300/30 text-cyan-700/50 dark:text-white/30 dark:hover:bg-white/5",
          className,
        )}
      >
        <MessageSquarePlus size={14} aria-hidden />
      </button>
    );
  }

  /** Ada teks tapi mode ringkas — hanya ikon; RS perujuk tetap lega di kiri */
  if (!isEditing && summary) {
    const label = summary;
    const titlePreview =
      label.length > 80 ? `${label.slice(0, 80)}…` : label || "Keterangan";
    return (
      <button
        type="button"
        title={titlePreview}
        aria-label={`Keterangan: ${titlePreview}`}
        onClick={openEditor}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "flex items-center justify-center rounded-full border border-transparent p-2 transition-all min-h-[2.25rem] min-w-[2.25rem]",
          "hover:bg-cyan-100/50 hover:border-cyan-300/40 text-cyan-700/80 dark:text-cyan-300/90 dark:hover:bg-white/10",
          label.toLowerCase().includes("pribadi") &&
            "border-amber-500/35 bg-amber-500/10 text-amber-600 dark:border-amber-500/40 dark:text-amber-300",
          className,
        )}
      >
        <MessageSquareText
          size={14}
          className={cn(
            "shrink-0",
            label.toLowerCase().includes("pribadi")
              ? "text-amber-600 dark:text-amber-400"
              : "text-cyan-600 dark:text-cyan-400",
          )}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <div
      className="relative group flex w-full min-w-0 items-center gap-1.5"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {!draft && (
        <MessageSquarePlus
          size={12}
          className="shrink-0 text-cyan-700/40 dark:text-white/20"
        />
      )}
      {draft && (
        <MessageSquareText
          size={12}
          className={cn(
            "shrink-0",
            draft.toLowerCase().includes("pribadi")
              ? "text-amber-500 animate-pulse"
              : "text-cyan-500 dark:text-cyan-400",
          )}
        />
      )}
      <input
        ref={inputRef}
        type="text"
        disabled={saving}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void persist()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void persist();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setDraft(lastPersistedRef.current);
            setIsEditing(false);
          }
        }}
        className={cn(
          "w-full min-w-[6rem] rounded-md border px-2 py-1.5 text-sm font-semibold focus:outline-none transition-all",
          "border-cyan-400/55 bg-white text-slate-950 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-500/30",
          "dark:border-cyan-900/50 dark:bg-black/40 dark:text-white dark:placeholder:text-white/90",
          saving && "opacity-60 grayscale",
          className,
        )}
      />
    </div>
  );
}
