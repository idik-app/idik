"use client";

import * as React from "react";

import type { TemplateChecklistRow } from "@/app/dashboard/pemakaian/data/templateInputBarangRows";

export type RincianBarangTab = "struk" | "obat_alkes" | "komponen";

function splitValue(raw: string, slots: number): string[] {
  const parts = (raw ?? "").split("|");
  return Array.from({ length: slots }, (_, i) => parts[i] ?? "");
}

function joinSlots(parts: string[]): string {
  return parts.join("|");
}

function TemplateTable({
  rows,
  values,
  onChange,
}: {
  rows: TemplateChecklistRow[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto max-h-[min(60vh,520px)] overflow-y-auto [scrollbar-gutter:stable]">
      <table className="w-full text-[10px] min-w-[640px]">
        <thead className="sticky top-0 z-[1] bg-[#0a1628]">
          <tr className="text-white/80">
            <th className="text-left font-semibold px-2 py-1.5 w-8">No</th>
            <th className="text-left font-semibold px-2 py-1.5 min-w-[200px]">
              Item
            </th>
            <th className="text-right font-semibold px-2 py-1.5 min-w-[120px]">
              Jumlah / isian
            </th>
            <th className="text-left font-semibold px-2 py-1.5 w-24">Ket.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-6 text-center text-white/45 align-middle"
              >
                Tidak ada item di template. Edit template untuk menambah atau
                biarkan kosong.
              </td>
            </tr>
          ) : null}
          {rows.map((row, idx) => {
            const v = values[row.id] ?? "";
            const parts = splitValue(v, row.slots);
            return (
              <tr key={row.id} className="bg-black/20">
                <td className="px-2 py-1 text-white/55 tabular-nums align-top">
                  {idx + 1}
                </td>
                <td className="px-2 py-1 text-white/90 align-top">{row.label}</td>
                <td className="px-2 py-1 align-top">
                  <div className="flex flex-wrap items-center gap-0.5 justify-end">
                    {Array.from({ length: row.slots }, (_, i) => (
                      <React.Fragment key={`${row.id}-s${i}`}>
                        {i > 0 ? (
                          <span className="text-white/35 select-none">/</span>
                        ) : null}
                        <input
                          type="text"
                          value={parts[i]}
                          onChange={(e) => {
                            const next = [...parts];
                            next[i] = e.target.value;
                            onChange(row.id, joinSlots(next));
                          }}
                          className="w-11 min-w-0 bg-black/50 border border-white/15 rounded px-1 py-0.5 text-center text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                          aria-label={`${row.label} bagian ${i + 1}`}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </td>
                <td className="px-2 py-1 text-white/45 align-top text-[9px]">
                  {row.catatan ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RincianBarangTemplateTabs({
  tab,
  onTabChange,
  rowsObatAlkes,
  rowsKomponen,
  obatAlkes,
  komponen,
  onChangeObatAlkes,
  onChangeKomponen,
  children,
}: {
  tab: RincianBarangTab;
  onTabChange: (t: RincianBarangTab) => void;
  /** Definisi baris checklist (bisa dari localStorage / edit template). */
  rowsObatAlkes: TemplateChecklistRow[];
  rowsKomponen: TemplateChecklistRow[];
  obatAlkes: Record<string, string>;
  komponen: Record<string, string>;
  onChangeObatAlkes: (id: string, value: string) => void;
  onChangeKomponen: (id: string, value: string) => void;
  children: React.ReactNode;
}) {
  const tabBtn = (t: RincianBarangTab, label: string) => (
    <button
      suppressHydrationWarning
      type="button"
      role="tab"
      aria-selected={tab === t}
      className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium transition ${
        tab === t
          ? "text-white border border-white/90 bg-white/[0.08] shadow-[0_0_16px_rgba(255,255,255,0.12)]"
          : "text-white/40 border border-transparent hover:text-white/65"
      }`}
      onClick={() => onTabChange(t)}
    >
      {label}
    </button>
  );

  return (
    <div className="min-w-0 max-w-full space-y-2">
      {/*
        Banyak tab: flex-wrap → tab lanjut ke baris berikut (tidak terpotong).
        Satu baris + scroll horizontal: ganti ke flex-nowrap + overflow-x-auto pada container luar.
      */}
      <div
        className="flex max-w-full flex-wrap gap-1 rounded-xl bg-black/50 border border-white/15 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        role="tablist"
        aria-label="Jenis input rincian barang"
      >
        {tabBtn("struk", "Struk (master)")}
        {tabBtn("obat_alkes", "Obat / Alkes")}
        {tabBtn("komponen", "Komponen cathlab")}
      </div>

      {tab === "struk" ? (
        children
      ) : tab === "obat_alkes" ? (
        <TemplateTable
          rows={rowsObatAlkes}
          values={obatAlkes}
          onChange={onChangeObatAlkes}
        />
      ) : (
        <TemplateTable
          rows={rowsKomponen}
          values={komponen}
          onChange={onChangeKomponen}
        />
      )}
    </div>
  );
}
