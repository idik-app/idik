"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, Plus, MapPin } from "lucide-react";
import { useNotification } from "@/app/contexts/NotificationContext";
import { cn } from "@/lib/utils";

type Props = {
  tindakanId: string;
  value: string | null | undefined;
  onSaved?: () => void;
  placeholder?: string;
  className?: string;
};

export default function RsPerujukField({
  tindakanId,
  value,
  onSaved,
  placeholder = "Asal RS...",
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
          body: JSON.stringify({ rs_perujuk: next || null }),
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
        message: `Gagal simpan RS Perujuk: ${(e as Error).message}`,
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
        title="Tambah RS Perujuk"
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
        <MapPin size={14} />
      </button>
    );
  }

  return (
    <div className="relative group flex items-center gap-1.5 w-full">
      <Building2 
        size={12} 
        className={cn(
          "shrink-0",
          draft 
            ? "text-cyan-500 dark:text-cyan-400" 
            : "text-cyan-700/40 dark:text-white/20"
        )} 
      />
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
          "w-full rounded border px-2 py-1 text-[11px] font-semibold focus:outline-none transition-all",
          "border-cyan-400/40 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-1 focus:ring-cyan-500/30",
          "dark:border-cyan-800/40 dark:bg-black/40 dark:text-white dark:placeholder:text-white/40",
          saving && "opacity-60 grayscale",
          className,
        )}
      />
    </div>
  );
}
