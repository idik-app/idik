"use client";

import { cn } from "@/lib/utils";
import { Plus, SquarePen, ClipboardList } from "lucide-react";
import type { TindakanJoinResult } from "../../bridge/mapping.types";

export function AlkesStatusCell({
  recordId,
  rowsForPemakaianLink,
  pemakaianOrderByTindakanId,
  setPemakaianModalRow,
  rec,
}: {
  recordId: string | null | undefined;
  rowsForPemakaianLink: any[];
  pemakaianOrderByTindakanId: Record<string, string>;
  setPemakaianModalRow: (row: any) => void;
  rec: TindakanJoinResult;
}) {
  if (!recordId) {
    return (
      <span className="text-slate-400 dark:text-zinc-600 italic select-none">
        Draft Row
      </span>
    );
  }

  const matchesOrder = rowsForPemakaianLink.some(
    (e) => String(e.tindakan_id ?? "").trim() === recordId
  );
  const matchedOrderId = pemakaianOrderByTindakanId[recordId];

  if (matchesOrder || matchedOrderId) {
    return (
      <button
        type="button"
        data-no-row-click="true"
        onClick={(e) => {
          e.stopPropagation();
          setPemakaianModalRow(rec);
        }}
        className={cn(
          "w-full px-2 py-1 rounded border transition-all flex items-center justify-center gap-1.5 font-bold text-[10px]",
          "border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-500/10 hover:bg-indigo-500/15"
        )}
      >
        <ClipboardList size={11} />
        Order Aktif
      </button>
    );
  }

  return (
    <button
      type="button"
      data-no-row-click="true"
      onClick={(e) => {
        e.stopPropagation();
        setPemakaianModalRow(rec);
      }}
      className={cn(
        "w-full px-2 py-1 rounded border border-dashed transition-all flex items-center justify-center gap-1.5 font-bold text-[10px]",
        "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:border-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800/50"
      )}
    >
      <Plus size={11} />
      Pakai Alkes
    </button>
  );
}
