"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  groupEmptyByTab,
  listEmptyBotFields,
} from "@/lib/simrs/botCatalog";
import BotAskButton from "./BotAskButton";

type Props = {
  record: Record<string, unknown>;
  className?: string;
};

/** Ringkasan N field kosong digroup per tab + Suruh bot per baris. */
export default function SimrsBotEmptyFieldsList({ record, className }: Props) {
  const [open, setOpen] = useState(false);
  const empty = useMemo(() => listEmptyBotFields(record), [record]);
  const groups = useMemo(() => groupEmptyByTab(empty), [empty]);

  const tindakanId = String(record.id ?? "").trim();
  const noRm = String(record.no_rm ?? "").trim();
  const nama = String(record.nama_pasien ?? record.nama ?? "").trim();

  if (!tindakanId || !noRm || empty.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-violet-500/30 bg-violet-950/40 text-white",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold dark:text-white"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="text-violet-200">{empty.length} field kosong</span>
        <span className="font-normal text-white/70">— Suruh bot</span>
      </button>
      {open ? (
        <div className="max-h-56 space-y-2 overflow-y-auto border-t border-white/10 px-3 py-2">
          {groups.map((g) => (
            <div key={g.tab}>
              <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/60">
                {g.tabLabel}
              </p>
              <ul className="space-y-1">
                {g.fields.map((f) => (
                  <li
                    key={f.field_key}
                    className="flex items-center justify-between gap-2 text-[11px]"
                  >
                    <span className="truncate text-white/90">{f.label}</span>
                    <BotAskButton
                      tindakanId={tindakanId}
                      noRm={noRm}
                      namaPasien={nama}
                      fieldKey={f.field_key}
                      tab={f.tab}
                      empty
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
