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
  const [isEditing, setIsEditing] = useState(Boolean(value));
  const lastPersistedRef = useRef(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const val = String(value ?? "");
    setDraft(val);
    lastPersistedRef.current = val;
    // Always show input if it has value
    if (val) setIsEditing(true);
  }, [value, tindakanId]);

  const persist = useCallback(async () => {
    const next = draft.trim();
    if (next === lastPersistedRef.current) {
      if (!next) setIsEditing(false);
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
      if (!next) setIsEditing(false);
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

  if (!isEditing && !draft) {
    return (
      <button
        type="button"
        title="Tambah Keterangan"
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className={cn(
          "flex items-center justify-center p-1 rounded-full transition-all border border-transparent",
          "hover:bg-cyan-100/50 hover:border-cyan-300/30 text-cyan-700/50 dark:text-white/30 dark:hover:bg-white/5",
          className
        )}
      >
        <MessageSquarePlus size={14} />
      </button>
    );
  }

  return (
    <div className="relative group flex items-center gap-1.5 w-full">
      {!draft && (
        <MessageSquarePlus size={12} className="shrink-0 text-cyan-700/40 dark:text-white/20" />
      )}
      {draft && (
        <MessageSquareText 
          size={12} 
          className={cn(
            "shrink-0",
            draft.toLowerCase().includes("pribadi") 
              ? "text-amber-500 animate-pulse" 
              : "text-cyan-500 dark:text-cyan-400"
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
            if (!lastPersistedRef.current) setIsEditing(false);
          }
        }}
        className={cn(
          "w-full rounded border px-2 py-0.5 text-[10px] font-semibold focus:outline-none transition-all",
          "border-cyan-400/30 bg-white/50 text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-cyan-500/30",
          "dark:border-cyan-800/30 dark:bg-black/20 dark:text-white dark:placeholder:text-white/30",
          saving && "opacity-60 grayscale",
          className,
        )}
      />
    </div>
  );
}
