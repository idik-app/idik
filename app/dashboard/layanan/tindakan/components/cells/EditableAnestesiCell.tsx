"use client";

import { cn } from "@/lib/utils";
import type { TindakanJoinResult } from "../../bridge/mapping.types";

export function EditableAnestesiCell({
  rec,
  anestesiArcRowKey,
  openAnestesiArc,
  scheduleCloseAnestesiArc,
  closeAnestesiArcImmediate,
  patchRowField,
}: {
  rec: TindakanJoinResult;
  anestesiArcRowKey: string | null;
  openAnestesiArc: (key: string) => void;
  scheduleCloseAnestesiArc: () => void;
  closeAnestesiArcImmediate: () => void;
  patchRowField: (rec: TindakanJoinResult, field: string, val: any) => Promise<boolean>;
}) {
  const raw = rec as unknown as Record<string, unknown>;
  const id = String(raw.id ?? "");
  const key = id || `row-anestesi-${rec.id}`;
  const isAnestesi = Boolean(raw.anestesi);
  const isOpen = anestesiArcRowKey === key;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation();
          if (isOpen) {
            closeAnestesiArcImmediate();
          } else {
            openAnestesiArc(key);
          }
        }}
        onMouseEnter={() => {
          if (isOpen) {
            scheduleCloseAnestesiArc();
          }
        }}
        className={cn(
          "w-5 h-5 flex items-center justify-center rounded transition-all",
          isAnestesi
            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800"
        )}
        title={isAnestesi ? "Tindakan Anestesi Aktif" : "Anestesi"}
      >
        <span className="text-[9px] font-black tracking-tighter">AN</span>
      </button>

      {isOpen && (
        <div
          onMouseEnter={() => openAnestesiArc(key)}
          onMouseLeave={() => scheduleCloseAnestesiArc()}
          className="absolute left-1/2 -translate-x-1/2 mt-1 w-24 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded shadow-lg p-1 z-50 text-[10px]"
        >
          <button
            type="button"
            onMouseDown={async (e) => {
              e.stopPropagation();
              closeAnestesiArcImmediate();
              await patchRowField(rec, "anestesi", !isAnestesi);
            }}
            className={cn(
              "w-full text-left px-2 py-1 rounded",
              isAnestesi ? "text-red-500 hover:bg-red-50" : "text-emerald-500 hover:bg-emerald-50"
            )}
          >
            {isAnestesi ? "Non-aktifkan" : "Aktifkan"}
          </button>
        </div>
      )}
    </div>
  );
}
