"use client";

import useSWR from "swr";
import { cn } from "@/lib/utils";

type LogRow = {
  id: string;
  status: string | null;
  status_keterangan: string | null;
  changed_by: string | null;
  created_at: string;
};

type Props = {
  tindakanId: string;
  refreshKey?: number;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function StatusTindakanLog({ tindakanId, refreshKey }: Props) {
  const id = String(tindakanId ?? "").trim();
  const { data, isLoading } = useSWR(
    id ? `/api/tindakan/${encodeURIComponent(id)}/status-log?k=${refreshKey ?? 0}` : null,
    fetcher,
    { revalidateOnFocus: false },
  );

  const rows = (Array.isArray(data?.data) ? data.data : []) as LogRow[];
  if (!id || isLoading || rows.length === 0) return null;

  return (
    <div className="mt-2 rounded-xl border border-white/10 bg-black/20 p-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-white/75 dark:text-white/90">
        Riwayat status
      </p>
      <ul className="max-h-28 space-y-1 overflow-y-auto text-[10px]">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-md border border-white/8 bg-white/5 px-2 py-1 text-white/90 dark:text-white"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <span className="font-semibold">{row.status || "—"}</span>
              <span className="text-white/55 dark:text-white/70">
                {formatWhen(row.created_at)}
              </span>
            </div>
            {row.status_keterangan ? (
              <p className={cn("mt-0.5 text-white/80 dark:text-white/90")}>
                {row.status_keterangan}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
