"use client";

import { memo, Fragment, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Menu,
  ChevronDown,
  ChevronRight,
  History,
  Package,
  Activity,
  Trash2,
  Zap,
  Loader2,
  ChevronUp,
} from "lucide-react";

import type { PasienOption } from "@/components/ui/pasien-combobox";
import type { DoctorOption } from "@/components/ui/doctor-combobox";
import type { RuanganOption } from "@/components/ui/ruangan-combobox";
import type { MasterTindakanOption } from "@/components/ui/master-tindakan-combobox";
import type { TindakanJoinResult } from "../bridge/mapping.types";

import {
  shouldSuppressRowOpenAfterFieldInteraction,
  isKeyboardEventFromRowInteractiveTarget,
  resolveShownRmForRow,
  resolvePasienFromRow,
  displayNamaPasien,
  normalizeNamaPasien,
  resolveJenisKelaminFromRow,
  formatTanggalDdMmYyyy,
  displayRm,
  extractRmFromLabel,
  splitNamaDanRmDalamKurung,
  normalizeDigitsOnly,
} from "../utils/tindakanHelpers";

import {
  EditableTextCell,
  EditableTimeCell,
  EditableDateCell,
  EditableRuanganCell,
  EditableMasterTindakanCell,
  EditableDokterCell,
} from "./cells/EditableCells";

// Helper components that are unique to this row layout
import { EditablePasienCell } from "./cells/EditablePasienCell";
import { EditableAnestesiCell } from "./cells/EditableAnestesiCell";
import { AlkesStatusCell } from "./cells/AlkesStatusCell";

// Helper functions copied for fallback
function displayNikPasien(raw: Record<string, unknown>): string {
  const val = String(raw.nik || raw.nik_pasien || "").trim();
  return val || "";
}

function displayTglLahir(raw: Record<string, unknown>): string | null {
  const val = String(raw.tgl_lahir || raw.tanggal_lahir || raw.birth_date || "").trim();
  return val || null;
}

function displayPenjamin(raw: Record<string, unknown>): string {
  const val = String(raw.penjamin || raw.cara_bayar || "").trim();
  return val || "";
}

function displayNokaPasien(raw: Record<string, unknown>): string {
  const val = String(raw.no_kartu || raw.noka || "").trim();
  return val || "";
}

function displaySepPasien(raw: Record<string, unknown>): string {
  const val = String(raw.no_sep || raw.sep || "").trim();
  return val || "";
}

function formatDateShort(raw: string): string {
  return raw;
}

function resolveIcuEligible(ruangan: string | null | undefined): boolean {
  if (!ruangan) return false;
  const r = ruangan.toLowerCase();
  return r.includes("icu") || r.includes("hcu") || r.includes("iccu");
}

function buildPasienLabelFromRow(raw: Record<string, unknown>): string {
  const rm = displayRm(raw);
  const nama = displayNamaPasien(raw);
  if (rm !== "—" && nama !== "—") {
    return `${nama} (${rm})`;
  }
  if (nama !== "—") return nama;
  if (rm !== "—") return `(${rm})`;
  return "";
}

function cleanRmNumber(v: string): string {
  return v.replace(/\D/g, "");
}

// Styling constants matching TindakanTable.tsx
const TINDAKAN_SHEET_CELL =
  "border border-slate-200/80 dark:border-white/10 select-none text-[11px] font-semibold leading-normal p-0 h-[2.5rem]";
const TINDAKAN_CELL_SELECTION_CLASS =
  "bg-cyan-500/10 ring-2 ring-cyan-500/30 dark:bg-cyan-400/10 dark:ring-cyan-400/30";

interface TindakanTableRowProps {
  rec: TindakanJoinResult;
  i: number;
  page: number;
  perPage: number;
  pasienOptions: PasienOption[];
  doctorOptionsMaster: DoctorOption[];
  dokterOptions: string[];
  doctorLoading: boolean;
  doctorError: string | null;
  ruanganMaster: RuanganOption[];
  ruanganLoading: boolean;
  ruanganError: string | null;
  masterTindakanOptions: MasterTindakanOption[];
  masterTindakanLoading: boolean;
  masterTindakanError: string | null;
  cellSelection: any;
  anestesiArcRowKey: string | null;
  openAnestesiArc: (key: string) => void;
  scheduleCloseAnestesiArc: () => void;
  closeAnestesiArcImmediate: () => void;
  arcMenuRowKey: string | null;
  openArcMenu: (key: string) => void;
  scheduleCloseArcMenu: () => void;
  closeArcMenuImmediate: () => void;
  deletingId: string | null;
  handleDelete: (id: string, rec: TindakanJoinResult) => Promise<void>;
  pemakaianOrderByTindakanId: Record<string, string>;
  setPemakaianModalRow: (row: any) => void;
  setIcuModalRow: (row: any) => void;
  rowExpandedByKey: Record<string, boolean>;
  setRowExpandedByKey: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  rmHistoryOpenByRowKey: Record<string, boolean>;
  setRmHistoryOpenByRowKey: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  pasienLabelByRowId: Record<string, string>;
  setPasienLabelByRowId: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  doctorLabelByRowId: Record<string, string>;
  patchRowField: (id: string, updates: Record<string, unknown>) => Promise<boolean>;
  commitDoctorForRow: (id: string, stateKey: string, nextText: string) => Promise<boolean>;
  commitRuanganForRow: (id: string, next: string) => Promise<boolean>;
  commitTindakanForRow: (id: string, next: string) => Promise<boolean>;
  commitPasienInputBlur: (rowId: string, stateKey: string, raw: Record<string, unknown>, finalText: string) => Promise<void>;
  lightMode: boolean;
  openDetail: (id: string) => void;
  priorTindakanForPagedRows: Array<any[]>;
  rmDuplicateCountInFiltered: Map<string, number>;
  rowsForPemakaianLink: any[];
  onRecordPatch?: () => void;
}

export const TindakanTableRow = memo(function TindakanTableRow({
  rec,
  i,
  page,
  perPage,
  pasienOptions,
  doctorOptionsMaster,
  dokterOptions,
  doctorLoading,
  doctorError,
  ruanganMaster,
  ruanganLoading,
  ruanganError,
  masterTindakanOptions,
  masterTindakanLoading,
  masterTindakanError,
  cellSelection,
  anestesiArcRowKey,
  openAnestesiArc,
  scheduleCloseAnestesiArc,
  closeAnestesiArcImmediate,
  arcMenuRowKey,
  openArcMenu,
  scheduleCloseArcMenu,
  closeArcMenuImmediate,
  deletingId,
  handleDelete,
  pemakaianOrderByTindakanId,
  setPemakaianModalRow,
  setIcuModalRow,
  rowExpandedByKey,
  setRowExpandedByKey,
  rmHistoryOpenByRowKey,
  setRmHistoryOpenByRowKey,
  pasienLabelByRowId,
  setPasienLabelByRowId,
  doctorLabelByRowId,
  patchRowField,
  commitDoctorForRow,
  commitRuanganForRow,
  commitTindakanForRow,
  commitPasienInputBlur,
  lightMode,
  openDetail,
  priorTindakanForPagedRows,
  rmDuplicateCountInFiltered,
  rowsForPemakaianLink,
  onRecordPatch,
}: TindakanTableRowProps) {
  const raw = rec as unknown as Record<string, unknown>;
  const id = String(raw.id ?? "");
  const key = id || `row-${page}-${i}`;
  const arcOpen = arcMenuRowKey === key;
  const stateKey = id || key;
  const rowNo = (page - 1) * perPage + i + 1;
  const { digits: dupRmDigits, display: rmDisplayForKet } =
    resolveShownRmForRow(
      rec,
      pasienLabelByRowId,
      pasienOptions,
      key,
    );
  const dupCount = dupRmDigits
    ? (rmDuplicateCountInFiltered.get(dupRmDigits) ?? 0)
    : 0;
  const isDuplicateRm = dupCount > 1;
  const priorList = priorTindakanForPagedRows[i] ?? [];
  const pKet = resolvePasienFromRow(pasienOptions, raw);
  const namaForKet =
    normalizeNamaPasien(displayNamaPasien(raw)) ||
    (pKet?.nama ? normalizeNamaPasien(pKet.nama) : "") ||
    "";
  const matchedRmForPrior =
    dupRmDigits ||
    (pKet?.no_rm ? cleanRmNumber(pKet.no_rm) : "");

  return (
    <Fragment key={key}>
      <tr
        data-arc-row-key={key}
        data-tindakan-row-id={id || undefined}
        onMouseDownCapture={(e) => {
          if (!id) return;
          const tr = e.currentTarget;
          if (
            !shouldSuppressRowOpenAfterFieldInteraction(
              tr,
              e.target,
            )
          ) {
            return;
          }
          // We can call a direct local timer if needed, but since it is passed via parent it's better to just handle here
        }}
        onClick={(e) => {
          if (!id) return;
          if (
            cellSelection.consumeRowClickIfSelectionDrag()
          ) {
            e.preventDefault();
            return;
          }
          const target = e.target as HTMLElement | null;
          if (
            target?.closest(
              'input,select,textarea,button,a,[data-no-row-click="true"]',
            )
          ) {
            return;
          }
          openDetail(id);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          if (
            isKeyboardEventFromRowInteractiveTarget(
              e.target,
            )
          ) {
            return;
          }
          e.preventDefault();
          if (!id) return;
          openDetail(id);
        }}
        role={id ? "button" : undefined}
        tabIndex={id ? 0 : undefined}
        className={cn(
          "group relative transition-colors duration-150 border-b border-slate-100 dark:border-white/5",
          isDuplicateRm
            ? "bg-amber-100/75 dark:bg-amber-950/35"
            : "",
          id
            ? isDuplicateRm
              ? "cursor-pointer hover:bg-amber-100/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600/50 dark:hover:bg-amber-900/40 dark:focus-visible:outline-amber-500/50"
              : "cursor-pointer hover:bg-cyan-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-600/50 dark:hover:bg-cyan-900/30 dark:focus-visible:outline-cyan-500/50"
            : "opacity-60",
        )}
        style={{
          zIndex: 20 + perPage - i,
        }}
      >
        {/* Actions / Row # */}
        <td
          {...cellSelection.getTdProps(i, 0)}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "relative px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center tabular-nums",
            "text-cyan-800 dark:text-slate-100",
            cellSelection.isCellSelected(i, 0) &&
              TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          {/* Row Expand Toggle */}
          <button
            type="button"
            data-no-row-click="true"
            data-no-spreadsheet-select
            onClick={(e) => {
              e.stopPropagation();
              setRowExpandedByKey((p) => ({
                ...p,
                [key]: !p[key],
              }));
            }}
            className={cn(
              "absolute left-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all duration-200 z-[10]",
              "text-slate-400 hover:bg-cyan-100/80 hover:text-cyan-700 dark:text-slate-500 dark:hover:bg-cyan-900/40 dark:hover:text-cyan-300",
              rowExpandedByKey[key] &&
                "rotate-90 text-cyan-600 dark:text-cyan-400",
            )}
            title={
              rowExpandedByKey[key]
                ? "Sembunyikan detail"
                : "Tampilkan detail"
            }
          >
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
          
          {rowNo}
        </td>

        {/* Waktu Masuk */}
        <td
          {...cellSelection.getTdProps(i, 2)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center align-middle tabular-nums",
            "text-slate-800 dark:text-slate-100",
            cellSelection.isCellSelected(i, 2) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableTimeCell
            value={rec.waktu || ""}
            onCommit={async (val) =>
              patchRowField(id, { waktu: val || null })
            }
          />
        </td>

        {/* Tgl Masuk */}
        <td
          {...cellSelection.getTdProps(i, 1)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 whitespace-nowrap font-mono text-[11px] text-center align-middle",
            "text-amber-800 dark:text-slate-100",
            cellSelection.isCellSelected(i, 1) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableDateCell
            value={rec.tanggal || ""}
            onCommit={async (val) =>
              patchRowField(id, { tanggal: val || null })
            }
          />
        </td>

        {/* Pasien (RM + NAMA) */}
        <td
          {...cellSelection.getTdProps(i, 3)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 text-left align-middle",
            "text-cyan-800 dark:text-cyan-300",
            cellSelection.isCellSelected(i, 3) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditablePasienCell
            key={key}
            recordId={stateKey}
            isNewRow={!rec.id}
            value={
              pasienLabelByRowId[stateKey] ??
              buildPasienLabelFromRow(raw)
            }
            draft={
              pasienLabelByRowId[stateKey] ??
              buildPasienLabelFromRow(raw)
            }
            onDraftChange={(val) => {
              setPasienLabelByRowId((p) => ({
                ...p,
                [stateKey]: val,
              }));
            }}
            onBlur={() => commitPasienInputBlur(id, stateKey, raw, pasienLabelByRowId[stateKey] || "")}
            options={pasienOptions}
            isDuplicateRm={isDuplicateRm}
            matchedRmForPrior={matchedRmForPrior}
            displayCleanRmNumber={rmDisplayForKet}
            priorList={priorList}
            openDetail={openDetail}
            raw={raw}
          />
        </td>

        {/* Dokter Operator */}
        <td
          {...cellSelection.getTdProps(i, 4)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 text-left align-middle",
            "text-amber-800 dark:text-white",
            cellSelection.isCellSelected(i, 4) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableDokterCell
            key={key}
            value={doctorLabelByRowId[stateKey] || ""}
            onCommit={(val) =>
              commitDoctorForRow(id, stateKey, val)
            }
            doctorOptionsMaster={doctorOptionsMaster}
            dokterOptions={dokterOptions}
            loading={doctorLoading}
            listboxId={`dokter-row-${key}`}
          />
        </td>

        {/* Ruangan */}
        <td
          {...cellSelection.getTdProps(i, 5)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 text-left align-middle",
            "text-amber-800 dark:text-amber-300",
            cellSelection.isCellSelected(i, 5) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableRuanganCell
            key={key}
            value={rec.ruangan || ""}
            onCommit={(val) =>
              commitRuanganForRow(id, val)
            }
            ruanganMaster={ruanganMaster}
            loading={ruanganLoading}
            listboxId={`ruangan-row-${key}`}
          />
        </td>

        {/* Master Tindakan / ICD-9 */}
        <td
          {...cellSelection.getTdProps(i, 6)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 max-w-[14rem] text-center align-middle",
            "text-amber-800 dark:text-white",
            cellSelection.isCellSelected(i, 6) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableMasterTindakanCell
            key={key}
            value={rec.tindakan || ""}
            onCommit={(val) =>
              commitTindakanForRow(id, val)
            }
            masterOptions={masterTindakanOptions}
            loading={masterTindakanLoading}
            listboxId={`tindakan-row-${key}`}
          />
        </td>

        {/* Anestesi Icon / Quick info */}
        <td className="p-3 text-center border-r border-slate-100 dark:border-white/5 align-middle select-none min-w-[44px] max-w-[44px]">
          <EditableAnestesiCell
            key={key}
            rec={rec}
            anestesiArcRowKey={anestesiArcRowKey}
            openAnestesiArc={openAnestesiArc}
            scheduleCloseAnestesiArc={
              scheduleCloseAnestesiArc
            }
            closeAnestesiArcImmediate={
              closeAnestesiArcImmediate
            }
            patchRowField={async (record, fieldName, value) => {
              if (record.id) {
                return await patchRowField(record.id, { [fieldName]: value });
              }
              return false;
            }}
          />
        </td>

        {/* Detail text */}
        <td
          {...cellSelection.getTdProps(i, 8)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 text-center align-middle",
            "text-slate-800 dark:text-slate-100",
            cellSelection.isCellSelected(i, 8) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableTextCell
            value={rec.tarif_tindakan !== null ? String(rec.tarif_tindakan) : ""}
            placeholder="Tarif..."
            onCommit={async (val) => {
              const num = val.trim() ? Number(val) : null;
              return await patchRowField(id, { tarif_tindakan: num });
            }}
          />
        </td>

        {/* Keterangan */}
        <td
          {...cellSelection.getTdProps(i, 9)}
          data-no-row-click="true"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            TINDAKAN_SHEET_CELL,
            "px-2 sm:px-2.5 py-1 text-center align-middle",
            "text-slate-800 dark:text-slate-100",
            cellSelection.isCellSelected(i, 9) && TINDAKAN_CELL_SELECTION_CLASS,
          )}
        >
          <EditableTextCell
            value={rec.keterangan || ""}
            placeholder="Keterangan..."
            onCommit={async (val) =>
              patchRowField(id, { keterangan: val || null })
            }
          />
        </td>

        {/* Alkes Order Link/Status */}
        <td className="p-3 text-xs align-middle min-w-[130px] max-w-[130px] border-r border-slate-100 dark:border-white/5">
          <AlkesStatusCell
            key={key}
            recordId={rec.id}
            rowsForPemakaianLink={rowsForPemakaianLink}
            pemakaianOrderByTindakanId={
              pemakaianOrderByTindakanId
            }
            setPemakaianModalRow={setPemakaianModalRow}
            rec={rec}
          />
        </td>
      </tr>

      {/* Expanded detail row */}
      {rowExpandedByKey[key] ? (
        <tr className="bg-slate-50/40 dark:bg-black/10 border-b border-slate-100 dark:border-white/5">
          <td colSpan={12} className="p-4">
            <div className="space-y-4 max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Identitas Pasien
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <span className="text-slate-400 dark:text-zinc-600">
                      Nama Pasien:
                    </span>
                    <span className="font-medium">
                      {namaForKet || "—"}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-600">
                      No. RM:
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {rmDisplayForKet || "—"}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-600">
                      NIK:
                    </span>
                    <span className="font-mono">
                      {displayNikPasien(raw) || "—"}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-600">
                      Tanggal Lahir:
                    </span>
                    <span>
                      {displayTglLahir(raw)
                        ? formatDateShort(
                            displayTglLahir(raw)!,
                          )
                        : "—"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Info Penjamin & Admisi
                  </h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                    <span className="text-slate-400 dark:text-zinc-600">
                      Penjamin:
                    </span>
                    <span className="font-medium">
                      {displayPenjamin(raw) || "—"}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-600">
                      No. Kartu:
                    </span>
                    <span className="font-mono">
                      {displayNokaPasien(raw) || "—"}
                    </span>
                    <span className="text-slate-400 dark:text-zinc-600">
                      No. SEP:
                    </span>
                    <span className="font-mono">
                      {displaySepPasien(raw) || "—"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                    Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                    <span className="text-slate-400 dark:text-zinc-600">
                      ID Tindakan:
                    </span>
                    <span className="font-mono text-[10px] break-all">
                      {rec.id || "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      ) : null}

      {/* RM History Row */}
      {rmHistoryOpenByRowKey[key] ? (
        <tr className="bg-amber-50/20 dark:bg-amber-950/5 border-b border-amber-100 dark:border-amber-950/20">
          <td colSpan={12} className="p-4">
            <div className="space-y-3 max-w-7xl">
              <div className="flex items-center gap-2 pb-1 border-b border-amber-200/40 dark:border-amber-950/20">
                <History
                  size={14}
                  className="text-amber-500"
                />
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Riwayat Tindakan untuk RM:{" "}
                  <span className="font-mono">
                    {rmDisplayForKet || "—"}
                  </span>
                </h4>
              </div>
              {priorList.length === 0 ? (
                <div className="text-xs text-amber-600/70 dark:text-amber-400/50 py-2 italic">
                  Tidak ada riwayat tindakan lain di system
                  untuk nomor RM ini.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="space-y-2">
                    {priorList.map((e, idx) => (
                      <div
                        key={e.id || idx}
                        className="p-3 rounded-lg border border-amber-200/55 bg-white/80 dark:bg-zinc-950/60 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                              {e.tanggal_masuk || "—"}{" "}
                              {e.waktu_masuk || ""}
                            </span>
                            <span className="text-slate-400 dark:text-zinc-500">
                              |
                            </span>
                            <span className="font-medium text-slate-700 dark:text-zinc-300">
                              {e.ruangan?.toUpperCase() || "—"}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-600 break-all">
                            ID: {e.id || "—"}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 leading-tight block">
                              Tindakan
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                              {e.tindakan || "—"}
                            </span>
                            {e.detail_tindakan && (
                              <span className="text-slate-500 dark:text-zinc-400 block mt-1 text-[11px] leading-relaxed italic border-l-2 border-slate-200 dark:border-zinc-800 pl-2">
                                {e.detail_tindakan}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 leading-tight block">
                              Dokter Operator
                            </span>
                            <span className="font-medium text-slate-800 dark:text-zinc-200">
                              {e.dokter || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-zinc-500 leading-tight block">
                              Keterangan
                            </span>
                            <span className="text-slate-600 dark:text-zinc-400 block whitespace-pre-wrap font-sans">
                              {e.keterangan || "—"}
                            </span>
                          </div>
                        </div>

                        {e.is_fast_track && (
                          <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5 dark:bg-red-950/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap
                                size={14}
                                className="text-red-500 animate-pulse"
                              />
                              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
                                Fast-Track STEMI / IGD
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <span className="text-[8px] font-mono uppercase text-red-500/70 leading-tight block">
                                  Datang IGD
                                </span>
                                <span className="text-xs font-bold text-red-900 dark:text-red-200">
                                  {e.pasien_datang_igd ||
                                    "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-mono uppercase text-red-500/70 leading-tight block">
                                  Door to Balloon
                                </span>
                                <span className="text-xs font-black text-red-600 dark:text-red-400">
                                  {e.door_to_balloon ||
                                    "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] font-mono uppercase text-red-500/70 leading-tight block">
                                  Total Waktu
                                </span>
                                <span className="text-xs font-bold text-red-900 dark:text-red-200">
                                  {e.total_waktu_fast_track ||
                                    "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {e.resume && (
                          <div className="mt-4 pt-3 border-t border-amber-400/20 dark:border-white/5">
                            <span className="text-[9px] font-mono uppercase text-amber-500/70 leading-tight block mb-1.5">
                              Resume Tindakan
                            </span>
                            <div className="rounded bg-black/5 dark:bg-white/5 p-3 text-xs leading-relaxed text-amber-950 dark:text-amber-50/90 whitespace-pre-wrap font-mono border border-amber-500/5">
                              {e.resume}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
});

TindakanTableRow.displayName = "TindakanTableRow";
