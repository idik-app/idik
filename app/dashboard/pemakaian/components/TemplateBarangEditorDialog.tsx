"use client";

import * as React from "react";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDialog } from "@/contexts/AppDialogContext";
import {
  TEMPLATE_KOMPONEN,
  TEMPLATE_OBAT_ALKES,
  type TemplateChecklistRow,
} from "@/app/dashboard/pemakaian/data/templateInputBarangRows";
import {
  resetKomponenStorageToDefault,
  resetObatAlkesStorageToDefault,
  saveKomponenRows,
  saveObatAlkesRows,
} from "@/app/dashboard/pemakaian/lib/templateLocalStorage";

type EditorTab = "obat" | "komponen";

function cloneRows(rows: TemplateChecklistRow[]): TemplateChecklistRow[] {
  return rows.map((r) => ({ ...r }));
}

function newObatId(): string {
  return `oa-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

function newKomId(): string {
  return `k-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function TemplateBarangEditorDialog({
  open,
  onClose,
  initialObatAlkes,
  initialKomponen,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialObatAlkes: TemplateChecklistRow[];
  initialKomponen: TemplateChecklistRow[];
  onSaved: (
    obat: TemplateChecklistRow[],
    komponen: TemplateChecklistRow[],
  ) => void;
}) {
  const { confirm: appConfirm, alert: appAlert } = useAppDialog();
  const [editorTab, setEditorTab] = React.useState<EditorTab>("obat");
  const [draftObat, setDraftObat] = React.useState<TemplateChecklistRow[]>([]);
  const [draftKom, setDraftKom] = React.useState<TemplateChecklistRow[]>([]);
  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDraftObat(cloneRows(initialObatAlkes));
    setDraftKom(cloneRows(initialKomponen));
    setEditorTab("obat");
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, [open, initialObatAlkes, initialKomponen]);

  React.useEffect(() => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  }, [editorTab]);

  const rows = editorTab === "obat" ? draftObat : draftKom;
  const setRows =
    editorTab === "obat" ? setDraftObat : setDraftKom;

  function patchRow(
    index: number,
    patch: Partial<TemplateChecklistRow>,
  ) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    const id = editorTab === "obat" ? newObatId() : newKomId();
    setRows((prev) => [
      ...prev,
      { id, label: "Item baru", slots: 1, catatan: undefined },
    ]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(from: number, to: number) {
    if (from === to) return;
    setRows((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function handleResetTab() {
    const ok = await appConfirm({
      title: "Reset template",
      message:
        "Kembalikan daftar ke bawaan aplikasi? Perubahan di tab ini akan hilang (penyimpanan lokal di-reset).",
      confirmLabel: "Reset",
      danger: true,
    });
    if (!ok) return;
    if (editorTab === "obat") {
      resetObatAlkesStorageToDefault();
      setDraftObat(cloneRows(TEMPLATE_OBAT_ALKES));
    } else {
      resetKomponenStorageToDefault();
      setDraftKom(cloneRows(TEMPLATE_KOMPONEN));
    }
  }

  function validate(list: TemplateChecklistRow[]): string | null {
    const ids = new Set<string>();
    for (const r of list) {
      if (!r.label.trim()) return "Setiap baris wajib punya nama (label).";
      if (!Number.isFinite(r.slots) || r.slots < 1 || r.slots > 12) {
        return "Jumlah slot isian harus 1–12.";
      }
      if (ids.has(r.id)) return `ID ganda: ${r.id}`;
      ids.add(r.id);
    }
    return null;
  }

  async function handleSave() {
    const errO = validate(draftObat);
    if (errO) {
      void appAlert({ message: errO, title: "Obat / Alkes", variant: "warning" });
      setEditorTab("obat");
      return;
    }
    const errK = validate(draftKom);
    if (errK) {
      void appAlert({
        message: errK,
        title: "Komponen cathlab",
        variant: "warning",
      });
      setEditorTab("komponen");
      return;
    }
    saveObatAlkesRows(draftObat);
    saveKomponenRows(draftKom);
    onSaved(draftObat, draftKom);
    onClose();
  }

  const tabBtn = (t: EditorTab, label: string) => (
    <button
      suppressHydrationWarning
      type="button"
      role="tab"
      aria-selected={editorTab === t}
      className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
        editorTab === t
          ? "text-cyan-100 border border-cyan-400/60 bg-cyan-950/50"
          : "text-cyan-300/50 border border-transparent hover:text-cyan-200/80"
      }`}
      onClick={() => setEditorTab(t)}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[min(92vh,720px)] flex flex-col overflow-hidden bg-black/75 border border-cyan-500/35 text-cyan-100 backdrop-blur-xl p-4 sm:p-5 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col [&>div]:overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-gold">
            <Pencil className="h-4 w-4 shrink-0" aria-hidden />
            Edit template checklist
          </DialogTitle>
          <p className="text-[11px] text-cyan-300/75 leading-snug mt-1">
            Ubah baris, jumlah kotak isian (slot), dan keterangan.{" "}
            <span className="text-white/55">
              Seret ikon grip di kiri untuk mengurutkan.
            </span>{" "}
            Disimpan di peramban Anda (localStorage) — tidak mengubah data order
            di server. Isian per order tetap di kolom{" "}
            <span className="text-white/80">template_input_barang</span> saat
            order disimpan.
          </p>
        </DialogHeader>

        <div
          className="shrink-0 flex flex-wrap gap-1 rounded-xl bg-black/40 border border-white/10 p-1"
          role="tablist"
        >
          {tabBtn("obat", "Obat / Alkes")}
          {tabBtn("komponen", "Komponen cathlab")}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-y-contain rounded-lg border border-white/10 bg-black/30 pr-1 [scrollbar-gutter:stable]">
          <table className="w-full text-[11px] min-w-[560px]">
            <thead className="sticky top-0 z-[1] bg-[#0a1628]">
              <tr className="text-white/75">
                <th
                  className="w-9 px-1 py-1.5 text-center font-semibold"
                  title="Seret untuk mengurutkan"
                >
                  <GripVertical
                    className="inline h-3.5 w-3.5 text-white/35"
                    aria-hidden
                  />
                  <span className="sr-only">Urut</span>
                </th>
                <th className="text-left font-semibold px-2 py-1.5 w-8">No</th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[180px]">
                  Nama item
                </th>
                <th className="text-left font-semibold px-2 py-1.5 w-24">
                  Slot (1–12)
                </th>
                <th className="text-left font-semibold px-2 py-1.5 min-w-[100px]">
                  Ket.
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-[11px] text-white/45"
                  >
                    Belum ada item. Pakai{" "}
                    <span className="text-white/70">Tambah baris</span> bila
                    perlu, atau simpan kosong untuk menyembunyikan checklist
                    tab ini.
                  </td>
                </tr>
              ) : null}
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`bg-black/20 align-top transition-colors ${
                    draggedIdx === idx ? "opacity-45" : ""
                  } ${
                    dragOverIdx === idx && draggedIdx !== idx
                      ? "bg-[#E8C547]/12 ring-1 ring-[#E8C547]/35 ring-inset"
                      : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (draggedIdx !== null && draggedIdx !== idx) {
                      setDragOverIdx(idx);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverIdx((v) => (v === idx ? null : v));
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const raw = e.dataTransfer.getData("text/plain");
                    const from = Number(raw);
                    if (!Number.isFinite(from)) return;
                    moveRow(from, idx);
                    setDraggedIdx(null);
                    setDragOverIdx(null);
                  }}
                >
                  <td className="px-1 py-1 align-middle w-9">
                    <span
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(idx));
                        e.dataTransfer.effectAllowed = "move";
                        setDraggedIdx(idx);
                      }}
                      onDragEnd={() => {
                        setDraggedIdx(null);
                        setDragOverIdx(null);
                      }}
                      className="inline-flex cursor-grab active:cursor-grabbing select-none text-white/40 hover:text-white/70 p-0.5 rounded"
                      aria-label={`Seret untuk mengurutkan baris ${idx + 1}`}
                      title="Seret untuk mengurutkan"
                    >
                      <GripVertical className="h-4 w-4 shrink-0" />
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-white/45 tabular-nums">
                    {idx + 1}
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) =>
                        patchRow(idx, { label: e.target.value })
                      }
                      className="w-full min-w-0 bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/45"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={row.slots}
                      onChange={(e) => {
                        const n = Math.max(
                          1,
                          Math.min(12, Math.floor(Number(e.target.value) || 1)),
                        );
                        patchRow(idx, { slots: n });
                      }}
                      className="w-full bg-black/50 border border-white/15 rounded px-1.5 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/45"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={row.catatan ?? ""}
                      onChange={(e) => {
                        const t = e.target.value.trim();
                        patchRow(idx, {
                          catatan: t ? t : undefined,
                        });
                      }}
                      placeholder="—"
                      className="w-full min-w-0 bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white/70 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/45"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => void removeRow(idx)}
                      className="inline-flex rounded-md border border-rose-500/45 bg-rose-950/40 p-1 text-rose-200 hover:bg-rose-900/55"
                      title="Hapus baris"
                      aria-label={`Hapus baris ${idx + 1}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 flex flex-wrap items-center gap-2 pt-1">
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => addRow()}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold text-white/85 hover:bg-white/10"
          >
            <Plus className="h-3 w-3" aria-hidden />
            Tambah baris
          </button>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => void handleResetTab()}
            className="text-[10px] font-medium text-amber-300/90 hover:text-amber-200 underline-offset-2 hover:underline"
          >
            Reset tab ini ke bawaan
          </button>
        </div>

        <DialogFooter className="mt-2 shrink-0 gap-2 sm:justify-end">
          <button
            suppressHydrationWarning
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-black/55"
          >
            Batal
          </button>
          <button
            suppressHydrationWarning
            type="button"
            onClick={() => void handleSave()}
            className="rounded-lg border border-[#E8C547]/55 bg-[#E8C547]/15 px-3 py-1.5 text-[11px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/25"
          >
            Simpan
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
