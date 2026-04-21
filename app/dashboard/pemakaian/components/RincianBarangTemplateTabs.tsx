"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";

import { BarangVariantCombobox } from "@/components/ui/barang-variant-combobox";
import type { MasterBarangPickRow } from "@/components/ui/barang-variant-combobox";
import { DISTRIBUTOR_PRODUK_KATEGORI } from "@/lib/distributorCatalog";
import type { KomponenKatalogBaris } from "@/lib/pemakaian/templateInputBarang";
import type { TemplateChecklistRow } from "@/app/dashboard/pemakaian/data/templateInputBarangRows";

export type KomponenKatalogPanelProps = {
  rows: KomponenKatalogBaris[];
  onChangeRows: (next: KomponenKatalogBaris[]) => void;
  distributorOptions: { id: string | null; nama_pt: string }[];
  distributorsLoading?: boolean;
  barangOptions: MasterBarangPickRow[];
  barangLoading?: boolean;
};

function distributorOptionKey(id: string | null, namaPt: string): string {
  return `${id ?? "∅"}\x1e${namaPt}`;
}

function parseDistributorOptionKey(
  key: string,
): { id: string | null; nama_pt: string } | null {
  const i = key.indexOf("\x1e");
  if (i < 0) return null;
  const idPart = key.slice(0, i);
  const nama = key.slice(i + 1);
  return {
    id: idPart === "∅" ? null : idPart,
    nama_pt: nama,
  };
}

function newKomponenKatalogRowId(): string {
  return `kkb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Nilai <select> distributor — selaraskan dengan opsi master (id atau nama PT). */
function distKeyForRow(
  r: KomponenKatalogBaris,
  sortedDist: { id: string | null; nama_pt: string }[],
): string {
  const nama = r.distributorNama.trim();
  if (!r.distributorId && !nama) return "";
  const hit = sortedDist.find(
    (d) =>
      (r.distributorId != null &&
        r.distributorId !== "" &&
        d.id === r.distributorId) ||
      (nama.length > 0 &&
        (d.nama_pt || "").toLowerCase() === nama.toLowerCase()),
  );
  if (hit) return distributorOptionKey(hit.id, hit.nama_pt);
  return distributorOptionKey(r.distributorId, nama);
}

export function KomponenKatalogPanel({
  rows,
  onChangeRows,
  distributorOptions,
  distributorsLoading,
  barangOptions,
  barangLoading,
}: KomponenKatalogPanelProps) {
  const listboxId = React.useId();
  const sortedDist = React.useMemo(() => {
    return [...distributorOptions].sort((a, b) =>
      (a.nama_pt || "").localeCompare(b.nama_pt || "", "id", {
        sensitivity: "base",
      }),
    );
  }, [distributorOptions]);

  const [distKey, setDistKey] = React.useState("");
  const [kategori, setKategori] = React.useState<string>("");
  const [namaBarang, setNamaBarang] = React.useState("");
  const [addHint, setAddHint] = React.useState<string | null>(null);

  const addRow = React.useCallback(() => {
    const nama = namaBarang.trim();
    if (!kategori) {
      setAddHint("Pilih kategori alkes.");
      return;
    }
    if (!nama) {
      setAddHint("Isi atau pilih nama barang dari katalog.");
      return;
    }
    setAddHint(null);
    const d = distKey ? parseDistributorOptionKey(distKey) : null;
    onChangeRows([
      ...rows,
      {
        id: newKomponenKatalogRowId(),
        distributorId: d?.id ?? null,
        distributorNama: (d?.nama_pt ?? "").trim(),
        kategori,
        namaBarang: nama,
      },
    ]);
    setNamaBarang("");
  }, [distKey, kategori, namaBarang, onChangeRows, rows]);

  const fieldLabel = "block text-[10px] font-semibold text-white/55 mb-1";
  const selectCls =
    "w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-[11px] text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50";
  const selectCellCls =
    "min-w-[7rem] max-w-[14rem] bg-black/50 border border-white/15 rounded-md px-1.5 py-1 text-[10px] text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50";

  const distOptionsForTable = React.useMemo(() => {
    const byKey = new Map<string, { id: string | null; nama_pt: string }>();
    for (const d of sortedDist) {
      byKey.set(distributorOptionKey(d.id, d.nama_pt), d);
    }
    for (const r of rows) {
      const nama = r.distributorNama.trim();
      if (!nama && !r.distributorId) continue;
      const k = distributorOptionKey(r.distributorId, nama);
      if (!byKey.has(k)) {
        byKey.set(k, {
          id: r.distributorId,
          nama_pt: nama || r.distributorId || "—",
        });
      }
    }
    return Array.from(byKey.values()).sort((a, b) =>
      (a.nama_pt || "").localeCompare(b.nama_pt || "", "id", {
        sensitivity: "base",
      }),
    );
  }, [sortedDist, rows]);

  const patchKatalogRow = React.useCallback(
    (rowId: string, patch: Partial<KomponenKatalogBaris>) => {
      onChangeRows(
        rows.map((x) => (x.id === rowId ? { ...x, ...patch } : x)),
      );
    },
    [onChangeRows, rows],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-3">
      <div className="text-[10px] font-semibold text-[#E8C547] uppercase tracking-wide">
        Tambah komponen (katalog)
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Distributor</label>
          <select
            suppressHydrationWarning
            className={selectCls}
            value={distKey}
            onChange={(e) => setDistKey(e.target.value)}
            disabled={distributorsLoading && sortedDist.length === 0}
          >
            <option value="">
              {distributorsLoading ? "Memuat distributor…" : "Pilih distributor"}
            </option>
            {sortedDist.map((d) => (
              <option
                key={distributorOptionKey(d.id, d.nama_pt)}
                value={distributorOptionKey(d.id, d.nama_pt)}
              >
                {d.nama_pt || d.id || "—"}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Kategori alkes</label>
          <select
            suppressHydrationWarning
            className={selectCls}
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
          >
            <option value="">Pilih kategori</option>
            {DISTRIBUTOR_PRODUK_KATEGORI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={fieldLabel}>Nama barang</label>
          <BarangVariantCombobox
            listboxId={listboxId}
            variant="table"
            value={namaBarang}
            onChange={setNamaBarang}
            onPickVariant={(v: MasterBarangPickRow) => {
              setNamaBarang(v.nama.trim());
              const nid = v.distributor_id?.trim() || null;
              const nn = v.distributor_nama?.trim() || "";
              if (nid || nn) {
                const hit = sortedDist.find(
                  (d) =>
                    (nid && d.id === nid) ||
                    (nn &&
                      (d.nama_pt || "").toLowerCase() === nn.toLowerCase()),
                );
                if (hit) {
                  setDistKey(distributorOptionKey(hit.id, hit.nama_pt));
                } else if (nn) {
                  setDistKey(distributorOptionKey(null, nn));
                }
              }
            }}
            options={barangOptions}
            loading={barangLoading}
            blurResolveLine={{
              distributor: distKey
                ? parseDistributorOptionKey(distKey)?.nama_pt
                : undefined,
            }}
            inputClassName="w-full bg-black/50 border border-white/15 rounded-lg px-2 py-1.5 text-[11px] text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
          />
        </div>
      </div>
      {addHint ? (
        <p className="text-[10px] text-amber-300/90">{addHint}</p>
      ) : null}
      <button
        suppressHydrationWarning
        type="button"
        onClick={addRow}
        className="w-full sm:w-auto rounded-lg border border-[#E8C547]/45 bg-[#E8C547]/10 px-3 py-2 text-[11px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20"
      >
        + Tambah ke daftar
      </button>

      {rows.length > 0 ? (
        <div className="rounded-lg border border-white/10 overflow-x-auto">
          <table className="w-full text-[10px] min-w-[520px]">
            <thead className="bg-[#0a1628] text-white/75">
              <tr>
                <th className="text-left font-semibold px-2 py-1.5">
                  Distributor
                </th>
                <th className="text-left font-semibold px-2 py-1.5 w-20">
                  Kategori
                </th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[140px]">
                  Nama barang
                </th>
                <th className="text-center font-semibold px-2 py-1.5 w-12">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.map((r) => (
                <tr key={r.id} className="bg-black/20 text-white/85">
                  <td className="px-1 py-1 align-top">
                    <select
                      suppressHydrationWarning
                      aria-label={`Distributor — ${r.namaBarang}`}
                      className={selectCellCls}
                      value={distKeyForRow(r, sortedDist)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          patchKatalogRow(r.id, {
                            distributorId: null,
                            distributorNama: "",
                          });
                          return;
                        }
                        const p = parseDistributorOptionKey(v);
                        if (p) {
                          patchKatalogRow(r.id, {
                            distributorId: p.id,
                            distributorNama: p.nama_pt.trim(),
                          });
                        }
                      }}
                      disabled={
                        distributorsLoading && distOptionsForTable.length === 0
                      }
                    >
                      <option value="">—</option>
                      {distOptionsForTable.map((d) => (
                        <option
                          key={distributorOptionKey(d.id, d.nama_pt)}
                          value={distributorOptionKey(d.id, d.nama_pt)}
                        >
                          {d.nama_pt || d.id || "—"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1 align-top">
                    <select
                      suppressHydrationWarning
                      aria-label={`Kategori — ${r.namaBarang}`}
                      className={`${selectCellCls} max-w-[6.5rem]`}
                      value={r.kategori}
                      onChange={(e) =>
                        patchKatalogRow(r.id, { kategori: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      {DISTRIBUTOR_PRODUK_KATEGORI.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1 align-top min-w-[10rem]">
                    <BarangVariantCombobox
                      listboxId={`${listboxId}-row-${r.id}`}
                      variant="table"
                      value={r.namaBarang}
                      onChange={(nama) =>
                        patchKatalogRow(r.id, { namaBarang: nama })
                      }
                      onPickVariant={(v: MasterBarangPickRow) => {
                        const patch: Partial<KomponenKatalogBaris> = {
                          namaBarang: v.nama.trim(),
                        };
                        const nid = v.distributor_id?.trim() || null;
                        const nn = v.distributor_nama?.trim() || "";
                        if (nid || nn) {
                          const hit = sortedDist.find(
                            (d) =>
                              (nid && d.id === nid) ||
                              (nn &&
                                (d.nama_pt || "").toLowerCase() ===
                                  nn.toLowerCase()),
                          );
                          if (hit) {
                            patch.distributorId = hit.id;
                            patch.distributorNama = hit.nama_pt;
                          } else if (nn) {
                            patch.distributorId = null;
                            patch.distributorNama = nn;
                          }
                        }
                        patchKatalogRow(r.id, patch);
                      }}
                      options={barangOptions}
                      loading={barangLoading}
                      blurResolveLine={{
                        distributor: r.distributorNama.trim() || undefined,
                      }}
                      inputClassName="w-full min-w-0 bg-black/50 border border-white/15 rounded-md px-1.5 py-1 text-[10px] text-sky-200/95 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                    />
                  </td>
                  <td className="px-1 py-1 align-top text-center">
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() =>
                        onChangeRows(rows.filter((x) => x.id !== r.id))
                      }
                      className="p-1 rounded text-rose-300/90 hover:bg-rose-950/50"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

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
  komponenKatalogPanel,
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
  /** Panel tambah item katalog di tab Komponen (opsional). */
  komponenKatalogPanel?: KomponenKatalogPanelProps | null;
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
        <div className="space-y-2">
          {komponenKatalogPanel ? (
            <KomponenKatalogPanel {...komponenKatalogPanel} />
          ) : null}
          <TemplateTable
            rows={rowsKomponen}
            values={komponen}
            onChange={onChangeKomponen}
          />
        </div>
      )}
    </div>
  );
}
