"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  /** Candidate rows: { id, no_rm, field_key } */
  items: { tindakanId: string; noRm: string; fieldKey: string }[];
  recipe?: string;
  className?: string;
};

/** Lapisan atas: isi massal — 1× konfirmasi batch. */
export default function SimrsBotBulkFill({
  items,
  recipe = "erm_ri_perawat",
  className,
}: Props) {
  const [busy, setBusy] = useState(false);

  if (items.length === 0) return null;

  const run = async () => {
    const ok = window.confirm(
      `Antrikan ${items.length} job isi field dari SIMRS?\nSatu konfirmasi untuk seluruh batch.`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const parentRes = await fetch("/api/system/simrs-bot-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_isi_fields",
          payload: {
            mode: "bulk",
            recipe,
            fields: items.map((i) => i.fieldKey),
            batch_ids: items.map((i) => i.tindakanId),
          },
        }),
      });
      const parentJson = (await parentRes.json()) as {
        ok?: boolean;
        error?: string;
        data?: { id: string };
      };
      if (!parentRes.ok || !parentJson.ok || !parentJson.data) {
        toast.error(parentJson.error || "Gagal buat batch");
        return;
      }
      const parentId = parentJson.data.id;
      let n = 0;
      for (const item of items) {
        const res = await fetch("/api/system/simrs-bot-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "isi_field_dari_simrs",
            payload: {
              mode: "tulis",
              recipe,
              no_rm: item.noRm,
              tindakan_id: item.tindakanId,
              field_key: item.fieldKey,
              parent_job_id: parentId,
            },
          }),
        });
        // sequential enqueue may 409 if one job active — first child only until agent frees
        if (res.ok) n += 1;
        else break;
      }
      toast.success(
        `Batch dibuat. ${n} job anak diantrikan (agen memproses berurutan).`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void run()}
      className={cn(
        "rounded-lg border border-violet-400/40 bg-violet-700/80 px-3 py-1.5 text-[10px] font-black uppercase text-white disabled:opacity-50",
        className,
      )}
    >
      {busy ? "Batch…" : `Isi massal (${items.length})`}
    </button>
  );
}
