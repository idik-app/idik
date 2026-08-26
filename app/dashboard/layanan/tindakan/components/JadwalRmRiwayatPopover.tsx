"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { extractCalendarDateKey } from "./cells/EditableCells";

const RM_LOOKUP_MIN_LEN = 4;

function txt(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeRmDigits(v: string): string {
  return String(v ?? "").replace(/\D/g, "");
}

function rmEquivalent(dbNoRm: string, typedRm: string): boolean {
  const a = txt(dbNoRm);
  const b = txt(typedRm);
  if (a === b) return true;
  const da = normalizeRmDigits(a);
  const db = normalizeRmDigits(b);
  if (da.length >= RM_LOOKUP_MIN_LEN && da === db) return true;
  return false;
}

function isSamePatient(
  ref: { no_rm?: string | null; pasien_id?: string | null },
  other: { no_rm?: string | null; pasien_id?: string | null },
): boolean {
  const rm = txt(ref.no_rm);
  const orm = txt(other.no_rm);
  if (rm && orm && rmEquivalent(rm, orm)) return true;
  const pid = txt(ref.pasien_id);
  const opid = txt(other.pasien_id);
  if (pid && opid && pid === opid) return true;
  return false;
}

function isCathlabTindakan(row: Record<string, unknown>): boolean {
  const blob = `${txt(row.kategori)} ${txt(row.ruangan)} ${txt(row.cath)}`.toLowerCase();
  return blob.includes("cath");
}

type RiwayatItem = {
  id: string;
  tanggal: string | null;
  tindakan: string | null;
  dokter: string | null;
  status: string | null;
  ruangan: string | null;
  waktu: string | null;
  no_rm: string | null;
  pasien_id: string | null;
};

function isPriorToRow(
  candidate: RiwayatItem,
  current: {
    id: string;
    tanggal: string | null;
    waktu: string | null;
    tindakan: string | null;
  },
): boolean {
  const cid = txt(current.id);
  if (cid && txt(candidate.id) === cid) return false;

  const selfDate = extractCalendarDateKey(txt(current.tanggal));
  const rowDate = extractCalendarDateKey(txt(candidate.tanggal));
  if (!selfDate || !rowDate) return false;

  if (rowDate > selfDate) return false;

  if (rowDate === selfDate) {
    const selfTindakan = txt(current.tindakan).toLowerCase();
    const rowTindakan = txt(candidate.tindakan).toLowerCase();
    if (rowTindakan === selfTindakan) return false;

    const selfWaktu = txt(current.waktu);
    const rowWaktu = txt(candidate.waktu);
    if (rowWaktu && selfWaktu) {
      if (rowWaktu >= selfWaktu) return false;
    } else {
      return false;
    }
  }

  return true;
}

function mapRiwayatItem(raw: Record<string, unknown>): RiwayatItem {
  return {
    id: txt(raw.id),
    tanggal: txt(raw.tanggal) || null,
    tindakan: txt(raw.tindakan) || null,
    dokter: txt(raw.dokter) || null,
    status: txt(raw.status) || null,
    ruangan: txt(raw.ruangan) || null,
    waktu: txt(raw.waktu) || null,
    no_rm: txt(raw.no_rm) || null,
    pasien_id: txt(raw.pasien_id) || null,
  };
}

function formatTanggalShort(raw: string | null): string {
  const iso = extractCalendarDateKey(txt(raw));
  if (!iso) return txt(raw) || "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

type Props = {
  rowId: string;
  noRm: string;
  pasienId: string | null;
  tanggal: string | null;
  waktu: string | null;
  tindakan: string | null;
  onOpenDetail: (id: string) => void;
};

export default function JadwalRmRiwayatPopover({
  rowId,
  noRm,
  pasienId,
  tanggal,
  waktu,
  tindakan,
  onOpenDetail,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RiwayatItem[]>([]);
  const [fetched, setFetched] = useState(false);

  const currentRef = useMemo(
    () => ({
      id: rowId,
      no_rm: noRm,
      pasien_id: pasienId,
      tanggal,
      waktu,
      tindakan,
    }),
    [noRm, pasienId, rowId, tanggal, tindakan, waktu],
  );

  const loadHistory = useCallback(async () => {
    const rm = txt(noRm);
    if (!rm) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search: rm,
        limit: "200",
      });
      const res = await fetch(`/api/tindakan?${q.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: Record<string, unknown>[];
      };
      const list = Array.isArray(json.data) ? json.data : [];
      const filtered = list
        .filter(isCathlabTindakan)
        .map(mapRiwayatItem)
        .filter((item) => isSamePatient(currentRef, item))
        .filter((item) =>
          isPriorToRow(item, {
            id: rowId,
            tanggal,
            waktu,
            tindakan,
          }),
        )
        .sort((a, b) => {
          const ta = extractCalendarDateKey(txt(a.tanggal)) ?? txt(a.tanggal);
          const tb = extractCalendarDateKey(txt(b.tanggal)) ?? txt(b.tanggal);
          if (ta !== tb) return tb.localeCompare(ta);
          return txt(b.id).localeCompare(txt(a.id));
        });
      setItems(filtered);
      setFetched(true);
    } catch {
      setItems([]);
      setFetched(true);
    } finally {
      setLoading(false);
    }
  }, [currentRef, noRm, rowId, tanggal, tindakan, waktu]);

  useEffect(() => {
    if (!open) return;
    void loadHistory();
  }, [loadHistory, open]);

  useEffect(() => {
    setFetched(false);
    setItems([]);
  }, [noRm, pasienId, rowId, tanggal]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Riwayat tindakan Cath Lab"
          aria-label="Riwayat tindakan Cath Lab"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex h-5 w-5 min-h-5 min-w-5 shrink-0 items-center justify-center rounded",
            "text-amber-600 hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500/50",
          )}
        >
          <History size={14} strokeWidth={2.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={6}
        className={cn(
          "w-80 max-w-[min(20rem,calc(100vw-2rem))] p-0",
          UI_LAYERS.dialogNestedPopover,
          "border-white/15 bg-zinc-900 text-white shadow-2xl",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-white/10 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">
            Riwayat Cath Lab
          </p>
          <p className="font-mono text-xs text-white/90">RM {txt(noRm)}</p>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Memuat riwayat…</span>
            </div>
          ) : !fetched || items.length === 0 ? (
            <p className="py-4 text-center text-xs italic text-zinc-400">
              Belum ada tindakan Cath Lab sebelumnya
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDetail(item.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-left",
                      "transition hover:border-amber-500/40 hover:bg-amber-500/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] font-bold text-amber-300">
                        {formatTanggalShort(item.tanggal)}
                      </span>
                      <span className="truncate text-[9px] uppercase text-zinc-500">
                        {txt(item.status) || "—"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-semibold text-white">
                      {txt(item.tindakan) || "—"}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {txt(item.dokter) || "—"}
                      {txt(item.ruangan) ? ` · ${txt(item.ruangan)}` : ""}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
