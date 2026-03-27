"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X, ExternalLink } from "lucide-react";

import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  WIREFRAME_DRAWER_TABS,
  FIELD_LABELS,
  formatFieldValue,
  type WireframeTabId,
} from "../bridge/wireframeDrawerTabs";

type Props = {
  open: boolean;
  record: TindakanJoinResult | null;
  onClose: () => void;
};

export default function TindakanDetailDrawer({ open, record, onClose }: Props) {
  const [tab, setTab] = useState<WireframeTabId>("pasien");

  useEffect(() => {
    if (open) setTab("pasien");
  }, [open, record?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const title = useMemo(() => {
    if (!record) return "Detail tindakan";
    const rm = (record as { no_rm?: string }).no_rm ?? "";
    const nama = (record as { nama_pasien?: string }).nama_pasien ?? "";
    const tin = (record as { tindakan?: string }).tindakan ?? "";
    return [rm && `RM ${rm}`, nama || "—", tin].filter(Boolean).join(" · ");
  }, [record]);

  const status = (record as { status?: string } | null)?.status ?? "—";

  const pemakaianHref = useMemo(() => {
    if (!record) return "/dashboard/pemakaian";
    const id = (record as { id?: string }).id;
    const pasienId = (record as { pasien_id?: string | null }).pasien_id;
    const rm = (record as { no_rm?: string }).no_rm ?? "";
    const q = new URLSearchParams();
    if (id) q.set("tindakanId", String(id));
    if (pasienId) q.set("pasienId", String(pasienId));
    if (rm) q.set("rm", String(rm));
    const qs = q.toString();
    return qs ? `/dashboard/pemakaian?${qs}` : "/dashboard/pemakaian";
  }, [record]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Tutup drawer"
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[110] flex w-full max-w-lg flex-col border-l border-cyan-500/25 bg-gradient-to-b from-[#04070d] via-[#0a1018] to-black shadow-[0_0_40px_rgba(0,255,255,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tindakan-drawer-title"
      >
        <div className="sticky top-0 z-10 border-b border-cyan-500/20 bg-black/50 px-4 py-3 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                id="tindakan-drawer-title"
                className="text-sm font-semibold text-cyan-100 truncate"
              >
                {title}
              </p>
              <p className="mt-1 text-xs font-mono text-cyan-400/90">
                Status: <span className="text-yellow-200/90">{status}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg border border-cyan-500/30 p-2 text-cyan-300 hover:bg-cyan-500/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-cyan-800/60">
            {WIREFRAME_DRAWER_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === t.id
                    ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/40"
                    : "text-cyan-500/70 border border-transparent hover:bg-cyan-500/10"
                }`}
              >
                {t.short}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!record ? (
            <p className="text-sm text-gray-500">Tidak ada data baris.</p>
          ) : (
            <>
              {WIREFRAME_DRAWER_TABS.filter((x) => x.id === tab).map((def) => (
                <div key={def.id} className="space-y-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-500/80">
                    {def.label}
                  </h3>
                  <dl className="grid grid-cols-1 gap-3 text-sm">
                    {def.fields.map((key) => (
                      <div
                        key={key}
                        className="rounded-lg border border-cyan-900/40 bg-black/30 px-3 py-2"
                      >
                        <dt className="text-[11px] text-gray-500">
                          {FIELD_LABELS[key] ?? key}
                        </dt>
                        <dd className="mt-0.5 text-cyan-100/95 break-words">
                          {formatFieldValue(
                            key,
                            (record as unknown as Record<string, unknown>)[key],
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}

              <div className="mt-8 rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-4">
                <p className="text-xs text-yellow-200/80 mb-3">
                  Alur wireframe: lanjut ke <strong>Pemakaian alkes</strong> untuk
                  order consumable pada konteks pasien &amp; kasus ini.
                </p>
                <Link
                  href={pemakaianHref}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600/30 px-4 py-2.5 text-sm font-medium text-cyan-100 border border-cyan-400/40 hover:bg-cyan-500/25"
                >
                  Buka halaman Pemakaian
                  <ExternalLink size={16} />
                </Link>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
