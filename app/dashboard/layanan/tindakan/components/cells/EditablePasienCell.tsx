"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { PasienOption } from "@/components/ui/pasien-combobox";
import { PasienCombobox } from "@/components/ui/pasien-combobox";
import { History, Eye } from "lucide-react";

export function EditablePasienCell({
  recordId,
  isNewRow,
  value,
  draft,
  onDraftChange,
  onBlur,
  options,
  isDuplicateRm,
  matchedRmForPrior,
  displayCleanRmNumber,
  priorList,
  openDetail,
  raw,
}: {
  recordId: string;
  isNewRow: boolean;
  value: string;
  draft: string;
  onDraftChange: (val: string) => void;
  onBlur: () => void;
  options: PasienOption[];
  isDuplicateRm: boolean;
  matchedRmForPrior: string;
  displayCleanRmNumber: string;
  priorList: any[];
  openDetail: (id: string) => void;
  raw: Record<string, unknown>;
}) {
  const selectRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div
      data-no-row-click="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex w-full items-center gap-1.5 px-2 py-1 max-w-[20rem] min-w-[16rem]",
        "transition-all duration-300 ease-out focus-within:scale-[1.01]"
      )}
    >
      <div className="relative flex-1 min-w-0">
        <PasienCombobox
          listboxId={`pasien-row-${recordId}`}
          value={draft}
          onChange={onDraftChange}
          onSelectOption={() => {
            // will commit on blur or explicitly
          }}
          onInputBlur={onBlur}
          options={options}
          className="max-w-[20rem]"
          inputClassName="w-full text-left border-none bg-transparent p-0 text-xs font-semibold focus:outline-none focus:ring-0 select-all hover:bg-black/5 dark:hover:bg-white/5 text-amber-800 placeholder:text-amber-700/55 dark:text-white dark:placeholder:text-white/90"
        />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Prior List indicator / Toggle indicator */}
        {isDuplicateRm && matchedRmForPrior && priorList.length > 0 ? (
          <div
            title={`Ada ${priorList.length} tindakan prior untuk RM ${displayCleanRmNumber}`}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 animate-pulse"
          >
            <History size={12} strokeWidth={2.5} />
          </div>
        ) : null}

        {/* View Detail button */}
        {!isNewRow && (
          <button
            type="button"
            data-no-row-click="true"
            onClick={(e) => {
              e.stopPropagation();
              openDetail(recordId);
            }}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300"
            title="Buka panel detail tindakan"
          >
            <Eye size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
