"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  FolderPlus,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Plus,
  Stethoscope,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import ModalWrapper from "@/components/global/ModalWrapper";
import { useNotification } from "@/app/contexts/NotificationContext";
import { useAppDialog } from "@/contexts/AppDialogContext";
import {
  useMasterDoctors,
  useMasterPerawat,
  useMasterRuangan,
  useMasterTindakan,
} from "@/app/hooks/useMasterData";
import { useTindakanCrud } from "../hooks/useTindakanCrud";
import { useTindakanEventBridge } from "../bridge/useTindakanEventBridge";
import { todayWibYmd } from "../utils/tindakanHelpers";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";
import { formatKelasPerawatanDisplay } from "@/app/dashboard/pasien/utils/formatKelasPerawatan";
import type { Pasien } from "@/app/dashboard/pasien/types/pasien";
import type { DoctorOption } from "@/components/ui/doctor-combobox";
import type { MasterTindakanOption } from "@/components/ui/master-tindakan-combobox";
import type { RuanganOption } from "@/components/ui/ruangan-combobox";
import type { PerawatOption } from "@/components/ui/perawat-combobox";
import {
  EditableDateCell,
  EditableDokterCell,
  EditableMasterTindakanCell,
  EditablePerawatCell,
  EditableRuanganCell,
  EditableTextCell,
  JADWAL_ZOOM_CELL_CLASSES,
  JADWAL_ZOOM_INNER_CLASSES,
  extractCalendarDateKey,
} from "./cells/EditableCells";
import { mutate } from "swr";
import { buildJadwalElektifWhatsApp } from "../lib/buildJadwalElektifWhatsApp";
import {
  confirmDuplicateRmOnDate,
  hasDuplicateRmOnDate,
  listCathlabRuanganLabels,
  pickDefaultCathlabRuangan,
} from "../lib/tindakanRmDateDuplicate";
import JadwalRmRiwayatPopover from "./JadwalRmRiwayatPopover";
import TambahPasienQuickModal from "./TambahPasienQuickModal";
import FormatWaJadwalModal from "./FormatWaJadwalModal";

const BULAN_TAB = [
  { label: "JAN", month: 1 },
  { label: "FEB", month: 2 },
  { label: "MAR", month: 3 },
  { label: "APR", month: 4 },
  { label: "MEI", month: 5 },
  { label: "JUN", month: 6 },
  { label: "JUL", month: 7 },
  { label: "AGU", month: 8 },
  { label: "SEP", month: 9 },
  { label: "OKT", month: 10 },
  { label: "NOV", month: 11 },
  { label: "DES", month: 12 },
] as const;

type JadwalRow = {
  id: string;
  tanggal: string | null;
  no_rm: string | null;
  nama_pasien: string | null;
  kelas_pembiayaan: string | null;
  umur: string | number | null;
  ruangan: string | null;
  diagnosa: string | null;
  tindakan: string | null;
  dokter: string | null;
  hasil_lab_ppm: string | null;
  asisten: string | null;
  sirkuler: string | null;
  logger: string | null;
  keterangan: string | null;
  waktu: string | null;
  status: string | null;
  pasien_id: string | null;
  kategori: string | null;
};

function txt(v: unknown): string {
  return String(v ?? "").trim();
}

function ymdParts(ymd: string) {
  const [y, m] = ymd.split("-").map(Number);
  return { year: y || new Date().getFullYear(), month: m || 1 };
}

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(last).padStart(2, "0")}`,
  };
}

/** Semua tanggal inklusif dari `from`…`to` (yyyy-MM-dd). */
function eachYmdInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function emptyDayPlaceholder(ymd: string): JadwalRow {
  return {
    id: `empty-day-${ymd}`,
    tanggal: ymd,
    no_rm: null,
    nama_pasien: null,
    kelas_pembiayaan: null,
    umur: null,
    ruangan: null,
    diagnosa: null,
    tindakan: null,
    dokter: null,
    hasil_lab_ppm: null,
    asisten: null,
    sirkuler: null,
    logger: null,
    keterangan: null,
    waktu: null,
    status: null,
    pasien_id: null,
    kategori: "Cathlab",
  };
}

function isEmptyDayId(id: string): boolean {
  return id.startsWith("empty-day-");
}

function isCathlabRow(row: JadwalRow): boolean {
  // Tampilkan seluruh data pasien/jadwal yang sudah ada di database
  return true;
}

function isPlaceholderNama(v: string): boolean {
  const s = v.trim().toLowerCase();
  return !s || s === "pasien" || s === "belum diisi";
}

function formatUmurDisplay(v: unknown): string {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return `${n} TH`;
  const s = String(v).trim();
  return s;
}

function mapApiRow(raw: Record<string, unknown>): JadwalRow {
  return {
    id: txt(raw.id),
    tanggal: txt(raw.tanggal) || null,
    no_rm: txt(raw.no_rm) || null,
    nama_pasien: txt(raw.nama_pasien) || txt(raw.nama) || null,
    kelas_pembiayaan: txt(raw.kelas_pembiayaan) || null,
    umur: (raw.umur as string | number | null) ?? null,
    ruangan: txt(raw.ruangan) || null,
    diagnosa: txt(raw.diagnosa) || null,
    tindakan: txt(raw.tindakan) || null,
    dokter: txt(raw.dokter) || null,
    hasil_lab_ppm: txt(raw.hasil_lab_ppm) || null,
    asisten: txt(raw.asisten) || null,
    sirkuler: txt(raw.sirkuler) || null,
    logger: txt(raw.logger) || null,
    keterangan: txt(raw.keterangan) || null,
    waktu: txt(raw.waktu) || null,
    status: txt(raw.status) || null,
    pasien_id: txt(raw.pasien_id) || null,
    kategori: txt(raw.kategori) || null,
  };
}

function kelasDariPasien(p: Pasien): string {
  const jenis = String(p.jenisPembiayaan ?? "").trim();
  const digit = formatKelasPerawatanDisplay(p.kelasPerawatan);
  if (jenis && digit && digit !== "—") return `${jenis} - ${digit}`;
  return jenis || "";
}

async function lookupPasienByRm(rm: string): Promise<Pasien | null> {
  const res = await fetch(`/api/pasien?noRm=${encodeURIComponent(rm)}`, {
    credentials: "include",
  });
  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    data?: Pasien | null;
  };
  if (json?.ok && json.data?.id) return json.data;
  return null;
}

// Styling Constants (Matching Laporan MUTU Theme)
const TH_BASE =
  "px-2 py-2 font-mono font-black text-[10px] uppercase tracking-wide text-white bg-[#1B2B44] border border-white/15 sticky top-0 z-20";
const TD_BASE = "border border-slate-200/80 px-1 py-1 align-middle min-w-0 text-slate-800 text-[11px]";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Sumber sama dengan tabel tindakan (adapter.tindakanList). */
  rowsSource?: Record<string, unknown>[];
  onCreateRecord?: (
    payload: Record<string, unknown>,
  ) => Promise<{ id?: string } | null | unknown>;
  onPatchRow?: (id: string, patch: Record<string, unknown>) => void;
  onDeleteRow?: (id: string) => Promise<void> | void;
  onSyncMainTable?: (opts?: { force?: boolean }) => Promise<void> | void;
  /** Fokus baris di tabel utama: set filter tanggal + cari RM + highlight. */
  onRevealInMainTable?: (
    row: JadwalRow,
    opts?: { silent?: boolean },
  ) => Promise<void> | void;
};

export default function JadwalCathModal({
  open,
  onClose,
  rowsSource,
  onCreateRecord,
  onPatchRow,
  onDeleteRow,
  onSyncMainTable,
  onRevealInMainTable,
}: Props) {
  const { show } = useNotification();
  const { confirm: appConfirm } = useAppDialog();
  const { createOne, updateOne, deleteOne, loading: crudLoading } =
    useTindakanCrud();
  const { emitOpenDetail } = useTindakanEventBridge();
  const { doctors, isLoading: doctorsLoading } = useMasterDoctors();
  const { masterTindakan, isLoading: tindakanLoading } = useMasterTindakan();
  const { ruangan, isLoading: ruanganLoading } = useMasterRuangan();
  const { perawat, isLoading: perawatLoading } = useMasterPerawat();

  const today = todayWibYmd();
  const todayParts = ymdParts(today);
  /** Tanggal untuk Salin WA + baris baru (date picker). */
  const [selectedDate, setSelectedDate] = useState(today);
  /** Default: seluruh tanggal bulan berjalan. */
  const [rangeMode, setRangeMode] = useState<"day" | "month">("month");
  const [filterYear, setFilterYear] = useState(todayParts.year);
  const [filterMonth, setFilterMonth] = useState(todayParts.month);
  const [draftByRowId, setDraftByRowId] = useState<
    Record<string, Partial<JadwalRow>>
  >({});
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [pinnedRows, setPinnedRows] = useState<JadwalRow[]>([]);
  const [newRowHighlightId, setNewRowHighlightId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [addPasienOpen, setAddPasienOpen] = useState(false);
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [pasienDefaultTanggal, setPasienDefaultTanggal] = useState(today);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { from, to } =
    rangeMode === "month"
      ? monthRange(filterYear, filterMonth)
      : { from: selectedDate, to: selectedDate };
  /** Tanggal kasus baru: date picker; di mode bulan tetap hari yang dipilih (default hari ini). */
  const newRowDate = selectedDate || today;

  /** Aktifkan tab bulan/tahun yang sesuai tanggal (JAN–DES, lintas tahun). */
  const syncFilterToYmd = useCallback((raw: string) => {
    const ymd =
      extractCalendarDateKey(String(raw ?? "").trim()) ||
      String(raw ?? "").trim();
    if (!ymd) return;
    const parts = ymdParts(ymd);
    setRangeMode("month");
    setFilterYear(parts.year);
    setFilterMonth(parts.month);
    setSelectedDate(ymd);
  }, []);

  const doctorOptions = useMemo<DoctorOption[]>(
    () =>
      (doctors as any[]).map((r) => ({
        id: String(r.id),
        nama_dokter: String(r.nama_dokter ?? r.nama ?? ""),
        spesialis: r.spesialis ?? null,
        aktif: r.aktif !== false,
      })),
    [doctors],
  );

  const tindakanOptions = useMemo<MasterTindakanOption[]>(
    () =>
      (masterTindakan as any[]).map((r) => ({
        id: String(r.id),
        nama: String(r.nama ?? r.nama_tindakan ?? ""),
        aktif: r.aktif !== false,
      })),
    [masterTindakan],
  );

  const ruanganOptions = useMemo<RuanganOption[]>(
    () => (Array.isArray(ruangan) ? (ruangan as RuanganOption[]) : []),
    [ruangan],
  );

  const defaultCathlabRuangan = useMemo(
    () => pickDefaultCathlabRuangan(ruanganOptions),
    [ruanganOptions],
  );

  const cathlabRuanganLabels = useMemo(
    () => listCathlabRuanganLabels(ruanganOptions),
    [ruanganOptions],
  );

  const perawatOptions = useMemo<PerawatOption[]>(
    () =>
      (perawat as any[]).map((r, i) => ({
        id: String(r.id ?? i),
        nama_perawat: String(r.nama_perawat ?? r.nama ?? ""),
        bidang: r.bidang ?? null,
        aktif: r.aktif !== false,
      })),
    [perawat],
  );

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void onSyncMainTable?.({ force: true });
    }, 500);
  }, [onSyncMainTable]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const markDirty = useCallback((id: string) => {
    setDirtyIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearDirty = useCallback((id: string) => {
    setDirtyIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDraftByRowId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const sourceMapped = useMemo(() => {
    const list = Array.isArray(rowsSource) ? rowsSource : [];
    return list.map((r) => mapApiRow(r as Record<string, unknown>)).filter((r) => r.id);
  }, [rowsSource]);

  const rows = useMemo(() => {
    const byId = new Map<string, JadwalRow>();
    for (const r of sourceMapped) {
      if (!isCathlabRow(r)) continue;
      const tKey = extractCalendarDateKey(txt(r.tanggal)) ?? txt(r.tanggal);
      if (tKey && (tKey < from || tKey > to)) continue;
      byId.set(r.id, r);
    }
    for (const p of pinnedRows) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    for (const [id, draft] of Object.entries(draftByRowId)) {
      const base = byId.get(id);
      if (base) byId.set(id, { ...base, ...draft });
      else if (dirtyIds.has(id)) {
        byId.set(id, { ...mapApiRow({ id }), ...draft } as JadwalRow);
      }
    }
    return Array.from(byId.values()).sort((a, b) => {
      const dateCmp = txt(a.tanggal).localeCompare(txt(b.tanggal));
      if (dateCmp !== 0) return dateCmp;
      return txt(a.waktu).localeCompare(txt(b.waktu));
    });
  }, [sourceMapped, from, to, pinnedRows, draftByRowId, dirtyIds]);

  /** Setiap hari di rentang filter; hari tanpa pasien = placeholder tampilan. */
  const displayRows = useMemo(() => {
    const byDay = new Map<string, JadwalRow[]>();
    for (const r of rows) {
      const key =
        extractCalendarDateKey(txt(r.tanggal)) ?? txt(r.tanggal);
      if (!key) continue;
      const list = byDay.get(key) ?? [];
      list.push(r);
      byDay.set(key, list);
    }
    const out: JadwalRow[] = [];
    for (const day of eachYmdInclusive(from, to)) {
      const dayRows = byDay.get(day);
      if (dayRows && dayRows.length > 0) {
        out.push(...dayRows);
      } else {
        out.push(emptyDayPlaceholder(day));
      }
    }
    return out;
  }, [rows, from, to]);

  const stats = useMemo(() => {
    let waiting = 0;
    let processing = 0;
    let done = 0;
    for (const r of rows) {
      const s = txt(r.status).toLowerCase();
      if (s === "selesai") done++;
      else if (s === "proses" || s === "sedang berjalan") processing++;
      else waiting++;
    }
    return { total: rows.length, waiting, processing, done };
  }, [rows]);

  useEffect(() => {
    if (!open) {
      setFullscreen(false);
      setDraftByRowId({});
      setDirtyIds(new Set());
      setNewRowHighlightId(null);
      setAddPasienOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (addPasienOpen) return;
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fullscreen, addPasienOpen]);

  const handleClose = useCallback(() => {
    if (addPasienOpen) return;
    void onSyncMainTable?.({ force: true });
    onClose();
  }, [addPasienOpen, onClose, onSyncMainTable]);

  const handleRevealInMainTable = useCallback(
    (row: JadwalRow) => {
      handleClose();
      void onRevealInMainTable?.(row);
    },
    [handleClose, onRevealInMainTable],
  );

  const openTambahPasien = useCallback(
    (tanggal?: string) => {
      const t = (tanggal || selectedDate || today).trim() || today;
      syncFilterToYmd(t);
      setPasienDefaultTanggal(t);
      setAddPasienOpen(true);
    },
    [selectedDate, syncFilterToYmd, today],
  );

  const patchField = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        if (isEmptyDayId(id) || id.startsWith("temp-draft-")) {
          const fromId = isEmptyDayId(id)
            ? id.replace(/^empty-day-/, "")
            : undefined;
          openTambahPasien(fromId);
          return false;
        }

        await updateOne(id, patch);
        setPinnedRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );
        setDraftByRowId((prev) => ({
          ...prev,
          [id]: { ...(prev[id] ?? {}), ...(patch as Partial<JadwalRow>) },
        }));
        onPatchRow?.(id, patch);
        clearDirty(id);
        scheduleSync();
        return true;
      } catch (e) {
        show({
          type: "error",
          message:
            e instanceof Error ? e.message : "Gagal menyimpan sel jadwal.",
        });
        return false;
      }
    },
    [clearDirty, onPatchRow, openTambahPasien, scheduleSync, show, updateOne],
  );

  const onRmCommit = useCallback(
    async (row: JadwalRow, nextRm: string) => {
      const rm = nextRm.trim();
      if (!rm) {
        return patchField(row.id, { no_rm: null });
      }
      try {
        const p = await lookupPasienByRm(rm);
        if (!p) {
          show({
            type: "warning",
            message: `RM ${rm} tidak ditemukan. Nama yang diketik tidak dihapus.`,
          });
          return patchField(row.id, { no_rm: rm });
        }
        const umurAngka = p.tanggalLahir
          ? hitungUsia(p.tanggalLahir).angka
          : null;
        const rowTanggal =
          extractCalendarDateKey(txt(row.tanggal)) ?? txt(row.tanggal);
        const dup = hasDuplicateRmOnDate(
          sourceMapped,
          rm,
          rowTanggal,
          row.id,
        );
        if (dup) {
          const ok = await confirmDuplicateRmOnDate({
            rm,
            tanggalKey: rowTanggal,
            showWarning: (message) =>
              show({ type: "warning", message }),
            confirm: appConfirm,
          });
          if (!ok) return false;
        }
        const keepNama = !isPlaceholderNama(txt(row.nama_pasien));
        const patch: Record<string, unknown> = {
          no_rm: p.noRM || rm,
          pasien_id: p.id,
          kelas_pembiayaan: kelasDariPasien(p) || null,
          umur: umurAngka && umurAngka > 0 ? umurAngka : null,
        };
        if (!keepNama) {
          patch.nama_pasien = p.nama;
          patch.nama = p.nama;
        }
        return patchField(row.id, patch);
      } catch (e) {
        show({
          type: "error",
          message: e instanceof Error ? e.message : "Gagal lookup RM.",
        });
        return false;
      }
    },
    [appConfirm, patchField, sourceMapped, show],
  );

  /** Buka form Tambah Pasien — jangan POST baris kosong. */
  const addJadwal = useCallback(() => {
    openTambahPasien(selectedDate);
  }, [openTambahPasien, selectedDate]);

  const handleSavedPasienFromJadwal = useCallback(
    async (
      patient: Pasien,
      opts?: { tanggal?: string; ruangan?: string },
    ) => {
      setCreating(true);
      try {
        const pasienId = String(patient.id ?? "").trim();
        const rm = String(patient.noRM ?? "").trim();
        const nama = String(patient.nama ?? "").trim();
        const tanggal =
          extractCalendarDateKey(String(opts?.tanggal ?? "").trim()) ||
          newRowDate;
        const tanggalKey = extractCalendarDateKey(tanggal) ?? tanggal;

        const dup = hasDuplicateRmOnDate(sourceMapped, rm, tanggalKey);
        if (dup) {
          const ok = await confirmDuplicateRmOnDate({
            rm,
            tanggalKey,
            showWarning: (message) =>
              show({ type: "warning", message }),
            confirm: appConfirm,
          });
          if (!ok) return;
        }

        const umurAngka = patient.tanggalLahir
          ? hitungUsia(patient.tanggalLahir).angka
          : null;
        const ruanganResolved =
          String(opts?.ruangan ?? "").trim() ||
          defaultCathlabRuangan ||
          null;
        const payload: Record<string, unknown> = {
          tanggal,
          pasien_id: pasienId || null,
          no_rm: rm || null,
          nama: nama || (rm ? `Pasien ${rm}` : "Pasien"),
          nama_pasien: nama || (rm ? `Pasien ${rm}` : "Pasien"),
          dokter: "Belum ditentukan",
          tindakan: "Belum diisi",
          status: "Menunggu",
          ruangan: ruanganResolved,
          kelas_pembiayaan: kelasDariPasien(patient) || null,
          umur: umurAngka && umurAngka > 0 ? umurAngka : null,
        };

        const created = onCreateRecord
          ? await onCreateRecord(payload)
          : await createOne(payload);
        const id = String((created as { id?: string } | null)?.id ?? "");
        if (!id) throw new Error("Draft jadwal tidak mengembalikan id.");

        syncFilterToYmd(tanggal);

        const local = mapApiRow({ id, ...payload });
        setPinnedRows((prev) => [local, ...prev.filter((r) => r.id !== id)]);
        setNewRowHighlightId(id);
        setTimeout(() => setNewRowHighlightId(null), 3000);
        void mutate("/api/pasien?compact=1&limit=5000&force=1");
        show({ type: "success", message: "Pasien & jadwal tersimpan." });

        void onSyncMainTable?.({ force: true });
      } catch (e) {
        show({
          type: "error",
          message:
            e instanceof Error ? e.message : "Gagal menambah jadwal pasien.",
        });
      } finally {
        setCreating(false);
        setAddPasienOpen(false);
      }
    },
    [
      appConfirm,
      createOne,
      defaultCathlabRuangan,
      newRowDate,
      onCreateRecord,
      onRevealInMainTable,
      onSyncMainTable,
      sourceMapped,
      show,
      syncFilterToYmd,
    ],
  );

  const removeDraft = useCallback(
    async (row: JadwalRow) => {
      if (row.id.startsWith("temp-draft-") || isEmptyDayId(row.id)) return;
      const ok = window.confirm(
        `Hapus baris jadwal ${row.nama_pasien || row.no_rm ? `pasien ${row.nama_pasien || row.no_rm}` : "ini"}? Baris akan dihapus dari jadwal dan tabel tindakan.`,
      );
      if (!ok) return;
      try {
        if (onDeleteRow) {
          await onDeleteRow(row.id);
        } else {
          await deleteOne(row.id);
        }
        setPinnedRows((prev) => prev.filter((r) => r.id !== row.id));
        clearDirty(row.id);
        void mutate((key) => typeof key === "string" && key.startsWith("/api/tindakan"));
        void mutate((key) => typeof key === "string" && key.startsWith("/api/pasien"));
        show({ type: "success", message: "Baris jadwal dihapus." });
        void onSyncMainTable?.({ force: true });
      } catch (e) {
        show({
          type: "error",
          message: e instanceof Error ? e.message : "Gagal menghapus baris jadwal.",
        });
      }
    },
    [clearDirty, deleteOne, onDeleteRow, onSyncMainTable, show],
  );

  const rowsForWaDay = useMemo(() => {
    const dayKey = extractCalendarDateKey(selectedDate) ?? selectedDate;
    return rows.filter((r) => {
      const t = extractCalendarDateKey(txt(r.tanggal)) ?? txt(r.tanggal);
      return t === dayKey;
    });
  }, [rows, selectedDate]);

  const copyWa = useCallback(async () => {
    const dayRows = rowsForWaDay;
    const hasRow = dayRows.some((r) => txt(r.nama_pasien) || txt(r.no_rm));
    if (!hasRow) {
      show({
        type: "warning",
        message: "Belum ada jadwal pada tanggal yang dipilih",
      });
      return;
    }
    const text = buildJadwalElektifWhatsApp({
      tanggalYmd: selectedDate,
      rows: dayRows.map((r) => ({
        nama_pasien: r.nama_pasien,
        no_rm: r.no_rm,
        kelas_pembiayaan: r.kelas_pembiayaan,
        diagnosa: r.diagnosa,
        tindakan: r.tindakan,
        dokter: r.dokter,
        hasil_lab_ppm: r.hasil_lab_ppm,
        waktu: r.waktu,
        ruangan: r.ruangan,
      })),
    });
    try {
      await navigator.clipboard.writeText(text);
      show({ type: "success", message: "Teks jadwal disalin" });
    } catch {
      show({ type: "error", message: "Gagal menyalin ke clipboard." });
    }
  }, [rowsForWaDay, selectedDate, show]);

  const waDisabled = !rowsForWaDay.some(
    (r) => txt(r.nama_pasien) || txt(r.no_rm),
  );
  const sourceLoading = rowsSource === undefined;

  const zoomTd = (
    origin: "left" | "center",
    children: ReactNode,
    extraTdClasses?: string,
    style?: CSSProperties,
    title?: string,
  ) => (
    <td
      className={cn(TD_BASE, JADWAL_ZOOM_CELL_CLASSES, extraTdClasses)}
      style={style}
      title={title}
    >
      <div
        className={cn(
          JADWAL_ZOOM_INNER_CLASSES,
          origin === "left" ? "origin-left" : "origin-center",
        )}
      >
        {children}
      </div>
    </td>
  );

  const tableBlock = (
    <div className="min-h-0 flex-1 overflow-auto bg-slate-50 p-2 sm:p-3 [scrollbar-width:thin] [scrollbar-color:#94A3B8_#E2E8F0] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
      {sourceLoading ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#1B2B44]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#1B2B44]">
            Memuat jadwal…
          </span>
        </div>
      ) : (
        <table className="w-full min-w-[1450px] table-fixed border-collapse text-xs text-slate-800">
          <thead>
            <tr>
              {/* Sticky Column 0: NO & Add button */}
              <th
                className={cn(TH_BASE, "left-0 z-30 border-r border-white/20 text-center")}
                style={{ left: 0, width: 52, minWidth: 52 }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>NO</span>
                  <button
                    type="button"
                    title="Tambah Baris Jadwal Baru"
                    onClick={() => addJadwal()}
                    disabled={creating || crudLoading}
                    className="inline-flex h-4 w-4 items-center justify-center rounded bg-white/20 text-white hover:bg-emerald-500 hover:text-white transition disabled:opacity-50"
                  >
                    {creating ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                  </button>
                </div>
              </th>

              {/* Sticky Column 1: HARI/TGL */}
              <th
                className={cn(TH_BASE, "left-[52px] z-30 border-r border-white/20 text-center")}
                style={{ left: 52, width: 115, minWidth: 115 }}
              >
                Hari/tgl
              </th>

              {/* Sticky Column 2: NO. RM */}
              <th
                className={cn(TH_BASE, "left-[167px] z-30 border-r border-white/20 text-center")}
                style={{ left: 167, width: 105, minWidth: 105 }}
              >
                No. RM
              </th>

              {/* Sticky Column 3: NAMA (dengan border & shadow pembatas) */}
              <th
                className={cn(
                  TH_BASE,
                  "left-[272px] z-30 border-r-2 border-slate-400/60 shadow-[4px_0_12px_-2px_rgba(15,23,42,0.15)] text-left",
                )}
                style={{ left: 272, width: 165, minWidth: 165 }}
              >
                Nama
              </th>

              {/* Non-sticky Columns */}
              <th className={cn(TH_BASE, "text-center")} style={{ width: 80, minWidth: 80 }}>Kelas</th>
              <th className={cn(TH_BASE, "text-center")} style={{ width: 45, minWidth: 45 }}>Umur</th>
              <th className={cn(TH_BASE, "text-center")} style={{ width: 70, minWidth: 70 }}>Jam</th>
              <th className={cn(TH_BASE, "text-center")} style={{ width: 95, minWidth: 95 }}>Ruangan</th>
              <th className={cn(TH_BASE, "text-left")} style={{ width: 140, minWidth: 140 }}>Diagnosa</th>
              <th className={cn(TH_BASE, "text-left")} style={{ width: 140, minWidth: 140 }}>Tindakan</th>
              <th className={cn(TH_BASE, "text-left")} style={{ width: 140, minWidth: 140 }}>Dokter</th>
              <th className={cn(TH_BASE, "text-left")} style={{ width: 180, minWidth: 180 }}>Hasil lab</th>
              <th className={cn(TH_BASE, "text-center")} style={{ width: 95, minWidth: 95 }}>Asisten</th>
              <th className={cn(TH_BASE, "text-center")} style={{ width: 95, minWidth: 95 }}>Sirkuler</th>
              <th className={cn(TH_BASE, "text-center")} style={{ width: 95, minWidth: 95 }}>Logger</th>
              <th className={cn(TH_BASE, "text-left")} style={{ width: 120, minWidth: 120 }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              let patientNo = 0;
              return displayRows.map((row) => {
              const isEmptyDay = isEmptyDayId(row.id);
              const isTemp = row.id.startsWith("temp-draft-");
              const isNew = row.id === newRowHighlightId;
              if (!isEmptyDay && !isTemp) patientNo += 1;
              const rowNum = isEmptyDay ? "·" : patientNo;
              const dayKey =
                extractCalendarDateKey(txt(row.tanggal)) ?? txt(row.tanggal);

              const openEmpty = () => {
                if (dayKey) openTambahPasien(dayKey);
                else openTambahPasien();
              };

              if (isEmptyDay) {
                return (
                  <tr
                    key={row.id}
                    className="group cursor-pointer bg-slate-50/60 hover:bg-[#EEF3FA] transition-colors duration-200"
                    onClick={openEmpty}
                    title="Klik untuk tambah pasien di tanggal ini"
                  >
                    <td
                      className={cn(
                        TD_BASE,
                        "sticky left-0 z-10 text-center font-mono text-slate-400 bg-slate-50/60 group-hover:bg-[#EEF3FA] border-r border-slate-200/80",
                      )}
                      style={{ left: 0, width: 52, minWidth: 52 }}
                    >
                      {rowNum}
                    </td>
                    {zoomTd(
                      "center",
                      <span className="block w-full px-1 text-center font-semibold text-[#1B2B44]">
                        {txt(row.tanggal)}
                      </span>,
                      "sticky left-[52px] z-10 bg-slate-50/60 group-hover:bg-[#EEF3FA] border-r border-slate-200/80",
                      { left: 52, width: 115, minWidth: 115 },
                    )}
                    <td
                      className={cn(
                        TD_BASE,
                        "sticky left-[167px] z-10 bg-slate-50/60 group-hover:bg-[#EEF3FA] border-r border-slate-200/80 text-slate-400",
                      )}
                      style={{ left: 167, width: 105, minWidth: 105 }}
                      colSpan={1}
                    />
                    <td
                      className={cn(
                        TD_BASE,
                        "sticky left-[272px] z-10 bg-slate-50/60 group-hover:bg-[#EEF3FA] border-r-2 border-slate-300 text-[10px] text-slate-400 italic",
                      )}
                      style={{ left: 272, width: 165, minWidth: 165 }}
                    >
                      + Tambah pasien…
                    </td>
                    <td className={TD_BASE} colSpan={12} />
                  </tr>
                );
              }

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "group transition-colors duration-200",
                    isNew
                      ? "bg-emerald-50/90 hover:bg-emerald-100/90"
                      : isTemp
                      ? "bg-white hover:bg-[#EEF3FA]"
                      : "odd:bg-white even:bg-slate-50/80 hover:bg-[#EEF3FA]",
                  )}
                  onDoubleClick={(e) => {
                    if (isTemp) return;
                    const t = e.target as HTMLElement;
                    if (t.closest("input,select,textarea,button")) return;
                    emitOpenDetail(row.id);
                  }}
                >
                  {/* Sticky TD Col 0: NO */}
                  <td
                    className={cn(
                      TD_BASE,
                      "sticky left-0 z-10 text-center font-mono font-bold bg-white group-hover:bg-[#EEF3FA] transition-colors border-r border-slate-200/80 px-0.5",
                    )}
                    style={{ left: 0, width: 68, minWidth: 68 }}
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-[11px]">{rowNum}</span>

                      {!isTemp && !isEmptyDayId(row.id) ? (
                        <>
                          <button
                            type="button"
                            title="Tambah / Tampilkan ke Kasus Tindakan"
                            onClick={() => {
                              if (onRevealInMainTable) {
                                void onRevealInMainTable(row as any);
                              } else {
                                emitOpenDetail(row.id, "tindakan");
                              }
                              show({
                                type: "success",
                                message: `Menambahkan baris jadwal ${txt(row.nama_pasien) || txt(row.no_rm) || ""} ke Kasus Tindakan...`,
                              });
                            }}
                            className="inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-300/80 bg-emerald-100/90 text-emerald-800 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors shadow-xs"
                          >
                            <FolderPlus size={11} />
                          </button>
                          <button
                            type="button"
                            title="Hapus baris jadwal"
                            onClick={() => void removeDraft(row)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-500/15 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>

                  {/* Sticky TD Col 1: HARI/TGL */}
                  {zoomTd(
                    "center",
                    <EditableDateCell
                      variant="table"
                      value={txt(row.tanggal)}
                      onDirty={() => markDirty(row.id)}
                      onCommit={(next) =>
                        patchField(row.id, { tanggal: next || null })
                      }
                    />,
                    "sticky left-[52px] z-10 bg-white group-hover:bg-[#EEF3FA] transition-colors border-r border-slate-200/80",
                    { left: 52, width: 115, minWidth: 115 },
                  )}

                  {/* Sticky TD Col 2: NO. RM */}
                  <td
                    className={cn(
                      TD_BASE,
                      JADWAL_ZOOM_CELL_CLASSES,
                      "sticky left-[167px] z-10 bg-white group-hover:bg-[#EEF3FA] transition-colors border-r border-slate-200/80 px-0.5",
                    )}
                    style={{ left: 167, width: 105, minWidth: 105 }}
                  >
                    <div
                      className={cn(
                        JADWAL_ZOOM_INNER_CLASSES,
                        "origin-center min-w-0 w-full flex items-center justify-between gap-0.5 px-0.5",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <EditableTextCell
                          variant="table"
                          value={txt(row.no_rm)}
                          placeholder=""
                          onDirty={() => markDirty(row.id)}
                          onCommit={(next) => onRmCommit(row, next)}
                        />
                      </div>
                      {!isTemp && txt(row.no_rm) ? (
                        <JadwalRmRiwayatPopover
                          rowId={row.id}
                          noRm={txt(row.no_rm)}
                          pasienId={row.pasien_id}
                          tanggal={row.tanggal}
                          waktu={row.waktu}
                          tindakan={row.tindakan}
                          onOpenDetail={emitOpenDetail}
                        />
                      ) : null}
                    </div>
                  </td>

                  {/* Sticky TD Col 3: NAMA (Floating border & shadow) */}
                  <td
                    className={cn(
                      TD_BASE,
                      JADWAL_ZOOM_CELL_CLASSES,
                      "sticky left-[272px] z-10 bg-white group-hover:bg-[#EEF3FA] transition-colors border-r-2 border-slate-300 shadow-[4px_0_12px_-2px_rgba(15,23,42,0.12)] px-1",
                    )}
                    style={{ left: 272, width: 165, minWidth: 165 }}
                  >
                    <div
                      className={cn(
                        JADWAL_ZOOM_INNER_CLASSES,
                        "origin-left min-w-0 w-full flex items-center justify-between gap-1",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <EditableTextCell
                          variant="table"
                          value={txt(row.nama_pasien)}
                          placeholder=""
                          onDirty={() => markDirty(row.id)}
                          onCommit={(next) =>
                            patchField(row.id, {
                              nama_pasien: next || null,
                              nama: next || null,
                            })
                          }
                        />
                      </div>
                      {!isTemp && !isEmptyDayId(row.id) ? (
                        <button
                          type="button"
                          title="Tambah / Buka Kasus Tindakan"
                          onClick={() => {
                            if (onRevealInMainTable) {
                              void onRevealInMainTable(row as any);
                            } else {
                              emitOpenDetail(row.id, "tindakan");
                            }
                            show({
                              type: "success",
                              message: `Menambahkan baris jadwal ${txt(row.nama_pasien) || txt(row.no_rm) || ""} ke Kasus Tindakan...`,
                            });
                          }}
                          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-emerald-300/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
                        >
                          <Stethoscope size={11} />
                        </button>
                      ) : null}
                    </div>
                  </td>

                  {/* Non-sticky Cells */}
                  {zoomTd(
                    "center",
                    <EditableTextCell
                      variant="table"
                      value={txt(row.kelas_pembiayaan)}
                      placeholder=""
                      onDirty={() => markDirty(row.id)}
                      onCommit={(next) =>
                        patchField(row.id, {
                          kelas_pembiayaan: next || null,
                        })
                      }
                    />,
                    undefined,
                    { width: 80, minWidth: 80 },
                  )}
                  <td className={cn(TD_BASE, "text-center text-slate-700 font-semibold")} style={{ width: 45, minWidth: 45 }}>
                    {formatUmurDisplay(row.umur)}
                  </td>
                  {zoomTd(
                    "center",
                    <EditableTextCell
                      variant="table"
                      value={txt(row.waktu)}
                      placeholder="08:00"
                      onDirty={() => markDirty(row.id)}
                      onCommit={(next) =>
                        patchField(row.id, { waktu: next || null })
                      }
                    />,
                    undefined,
                    { width: 70, minWidth: 70 },
                  )}
                  {zoomTd(
                    "center",
                    <EditableRuanganCell
                      value={txt(row.ruangan)}
                      ruanganMaster={ruanganOptions}
                      loading={ruanganLoading}
                      listboxId={`jadwal-ruang-${row.id}`}
                      onCommit={(next) => {
                        markDirty(row.id);
                        return patchField(row.id, { ruangan: next || null });
                      }}
                    />,
                    undefined,
                    { width: 95, minWidth: 95 },
                  )}
                  {zoomTd(
                    "left",
                    <EditableTextCell
                      variant="table"
                      value={txt(row.diagnosa)}
                      placeholder=""
                      onDirty={() => markDirty(row.id)}
                      onCommit={(next) =>
                        patchField(row.id, { diagnosa: next || null })
                      }
                    />,
                    undefined,
                    { width: 140, minWidth: 140 },
                  )}
                  {zoomTd(
                    "left",
                    <EditableMasterTindakanCell
                      value={txt(row.tindakan)}
                      masterOptions={tindakanOptions}
                      loading={tindakanLoading}
                      listboxId={`jadwal-tin-${row.id}`}
                      onCommit={(next) => {
                        markDirty(row.id);
                        return patchField(row.id, { tindakan: next || null });
                      }}
                    />,
                    undefined,
                    { width: 140, minWidth: 140 },
                  )}
                  {zoomTd(
                    "left",
                    <EditableDokterCell
                      value={txt(row.dokter)}
                      doctorOptionsMaster={doctorOptions}
                      dokterOptions={doctorOptions.map((d) => d.nama_dokter)}
                      loading={doctorsLoading}
                      listboxId={`jadwal-dok-${row.id}`}
                      onCommit={(next) => {
                        markDirty(row.id);
                        return patchField(row.id, { dokter: next || null });
                      }}
                    />,
                    undefined,
                    { width: 140, minWidth: 140 },
                  )}
                  {zoomTd(
                    "left",
                    <EditableTextCell
                      variant="table"
                      value={txt(row.hasil_lab_ppm)}
                      placeholder=""
                      onDirty={() => markDirty(row.id)}
                      onCommit={(next) =>
                        patchField(row.id, { hasil_lab_ppm: next || null })
                      }
                    />,
                    undefined,
                    { width: 180, minWidth: 180 },
                    txt(row.hasil_lab_ppm) || undefined,
                  )}
                  {zoomTd(
                    "center",
                    <EditablePerawatCell
                      value={txt(row.asisten)}
                      perawatMaster={perawatOptions}
                      loading={perawatLoading}
                      listboxId={`jadwal-as-${row.id}`}
                      onCommit={(next) => {
                        markDirty(row.id);
                        return patchField(row.id, { asisten: next || null });
                      }}
                    />,
                    undefined,
                    { width: 95, minWidth: 95 },
                  )}
                  {zoomTd(
                    "center",
                    <EditablePerawatCell
                      value={txt(row.sirkuler)}
                      perawatMaster={perawatOptions}
                      loading={perawatLoading}
                      listboxId={`jadwal-sk-${row.id}`}
                      onCommit={(next) => {
                        markDirty(row.id);
                        return patchField(row.id, { sirkuler: next || null });
                      }}
                    />,
                    undefined,
                    { width: 95, minWidth: 95 },
                  )}
                  {zoomTd(
                    "center",
                    <EditablePerawatCell
                      value={txt(row.logger)}
                      perawatMaster={perawatOptions}
                      loading={perawatLoading}
                      listboxId={`jadwal-lg-${row.id}`}
                      onCommit={(next) => {
                        markDirty(row.id);
                        return patchField(row.id, { logger: next || null });
                      }}
                    />,
                    undefined,
                    { width: 95, minWidth: 95 },
                  )}
                  {zoomTd(
                    "left",
                    <EditableTextCell
                      variant="table"
                      value={txt(row.keterangan)}
                      placeholder=""
                      onDirty={() => markDirty(row.id)}
                      onCommit={(next) =>
                        patchField(row.id, { keterangan: next || null })
                      }
                    />,
                    undefined,
                    { width: 120, minWidth: 120 },
                  )}
                </tr>
              );
            });
            })()}
          </tbody>
        </table>
      )}
      <div className="mt-3 flex items-center justify-center">
        <button
          type="button"
          onClick={() => addJadwal()}
          disabled={creating || crudLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#1B2B44] shadow-sm hover:bg-slate-100 disabled:opacity-50 transition"
        >
          {creating ? (
            <Loader2 size={14} className="animate-spin text-[#1B2B44]" />
          ) : (
            <Plus size={14} className="text-[#1B2B44]" />
          )}
          + Tambah Baris Jadwal Baru
        </button>
      </div>
    </div>
  );

  const shell = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-slate-50 text-slate-800 font-[family-name:Inter,ui-sans-serif,system-ui,sans-serif]",
        fullscreen &&
          cn("fixed inset-0 h-dvh w-screen", UI_LAYERS.fullscreen),
      )}
    >
      {/* Header — Tema Laporan MUTU (Navy Gradient) */}
      <header className="relative flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#1B2B44] to-[#2D4A6E] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300 border border-amber-300/30">
            <Calendar size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black tracking-tight text-white sm:text-lg">
              Jadwal Tindakan Cath Lab
            </h2>
            <p className="hidden sm:block truncate text-[11px] font-medium text-slate-200">
              Tabel sinkronisasi jadwal real-time · Klik 2x pada baris untuk membuka Detail Drawer Pasien
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!fullscreen ? (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white transition"
              title="Tutup Modal"
            >
              <X size={17} />
            </button>
          ) : null}
        </div>
      </header>

      {/* Sub-Header / Control Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2 sm:px-4">
        <input
          type="date"
          value={selectedDate}
          title="Tanggal untuk Salin WA & baris baru"
          onChange={(e) => {
            syncFilterToYmd(e.target.value || today);
          }}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
        <button
          type="button"
          title={
            rangeMode === "day"
              ? "Tampilkan seluruh bulan"
              : "Filter tabel ke tanggal yang dipilih"
          }
          onClick={() =>
            setRangeMode((m) => (m === "day" ? "month" : "day"))
          }
          className={cn(
            "h-8 rounded-lg border px-2.5 text-[11px] font-bold shadow-sm transition",
            rangeMode === "day"
              ? "border-indigo-500 bg-indigo-50 text-indigo-800"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {rangeMode === "day" ? "1 hari" : "Bulan"}
        </button>

        {/* Ringkasan Jumlah Jadwal */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
          <span>Total: <strong className="font-extrabold text-[#1B2B44]">{stats.total}</strong></span>
          <span className="text-slate-300">·</span>
          <span>Menunggu: <strong className="font-extrabold text-amber-700">{stats.waiting}</strong></span>
          {stats.processing > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>Proses: <strong className="font-extrabold text-cyan-700">{stats.processing}</strong></span>
            </>
          )}
          {stats.done > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>Selesai: <strong className="font-extrabold text-emerald-700">{stats.done}</strong></span>
            </>
          )}
        </div>

        {/* Indikator Petunjuk Scroll Horizontal */}
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
          <span>Gulir mendatar →</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            title="Format & Salin jadwal ke WhatsApp"
            aria-label="Format & Salin jadwal ke WhatsApp"
            onClick={() => setWaModalOpen(true)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-600/40 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm"
          >
            <MessageCircle size={15} />
            <span className="hidden sm:inline">Salin WA</span>
          </button>
          <button
            type="button"
            title={fullscreen ? "Keluar layar penuh" : "Layar penuh"}
            aria-label="Salin jadwal ke WhatsApp"
            onClick={() => setFullscreen((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main Table Block */}
      {tableBlock}

      {/* Footer Month Tabs — Soft Navy Gradient */}
      <footer className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-slate-300 bg-gradient-to-b from-[#E6ECF5] to-[#D3DFF0] px-3 py-2">
        <span className="shrink-0 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Filter Bulan:
        </span>
        {BULAN_TAB.map((tab) => {
          const active = rangeMode === "month" && filterMonth === tab.month;
          const selectedParts = ymdParts(selectedDate);
          const isNow =
            filterMonth === tab.month &&
            selectedParts.month === tab.month &&
            selectedParts.year === filterYear;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                if (dirtyIds.size > 0) {
                  const ok = window.confirm(
                    "Ada perubahan belum tersimpan di sel. Ganti filter bulan tetap lanjut?",
                  );
                  if (!ok) return;
                }
                setRangeMode("month");
                setFilterMonth(tab.month);
                // Jangan paksa selectedDate ke tanggal 1 — pertahankan hari jika memungkinkan.
                const dayNum = Math.min(
                  Number(selectedDate.split("-")[2] || "1") || 1,
                  new Date(filterYear, tab.month, 0).getDate(),
                );
                const mm = String(tab.month).padStart(2, "0");
                const dd = String(dayNum).padStart(2, "0");
                const nextDate = `${filterYear}-${mm}-${dd}`;
                if (ymdParts(selectedDate).month !== tab.month) {
                  setSelectedDate(nextDate);
                }
              }}
              className={cn(
                "relative h-7 shrink-0 rounded-md px-2.5 text-[10px] font-black uppercase tracking-wider transition",
                active
                  ? "bg-white text-[#1B2B44] shadow-sm border border-slate-300"
                  : "bg-white/40 text-slate-700 hover:bg-white hover:text-slate-900 border border-transparent",
              )}
            >
              {tab.label}
              {isNow && !active ? (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-indigo-600" />
              ) : null}
            </button>
          );
        })}
      </footer>
    </div>
  );

  if (!open) return null;

  const pasienModal = addPasienOpen ? (
    <TambahPasienQuickModal
      open={addPasienOpen}
      onClose={() => setAddPasienOpen(false)}
      onSaved={handleSavedPasienFromJadwal}
      defaultTanggal={pasienDefaultTanggal}
      entryPoint="jadwal"
      cathlabRuanganOptions={cathlabRuanganLabels}
    />
  ) : null;

  const waModal = waModalOpen ? (
    <FormatWaJadwalModal
      open={waModalOpen}
      onClose={() => setWaModalOpen(false)}
      initialDate={selectedDate}
      rows={rows}
    />
  ) : null;

  if (fullscreen && typeof document !== "undefined") {
    return createPortal(
      <>
        {shell}
        {pasienModal}
        {waModal}
      </>,
      document.body,
    );
  }

  return (
    <>
      <ModalWrapper
        onClose={handleClose}
        isWide
        solidBackdrop
        zIndex={130}
        className="h-[95vh] max-w-[98vw] overflow-hidden rounded-[1.5rem] border-slate-300 bg-slate-50 p-0 shadow-2xl sm:rounded-[2rem]"
      >
        {shell}
      </ModalWrapper>
      {pasienModal}
      {waModal}
    </>
  );
}
