"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format, isValid, parse } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Filter,
  Hospital,
  Loader2,
  MessageCircle,
  Plus,
  Stethoscope,
  User,
  Wallet,
  X,
  Microscope,
  CalendarRange,
  Calendar as CalendarIcon,
  DoorOpen,
  RefreshCw,
  Trash2,
  Search,
  Activity,
  Phone,
  Bed,
  Archive,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { roomDisplayLabelFromSlug } from "@/lib/ruangan/slug";
import { UI_LAYERS, Z_INDEX_VALUES } from "@/lib/ui/layers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PasienFormFields from "@/app/dashboard/pasien/components/PasienFormFields";
import { pasienSchema } from "@/app/dashboard/pasien/data/pasienValidation";
import { normalizeNamaPasienInput } from "@/app/dashboard/pasien/utils/normalizeNamaPasien";
import { hitungUsia } from "@/app/dashboard/pasien/utils/formatUsia";
import {
  ICCU_ASAL_PRESETS,
  ICCU_CARA_KELUAR,
  ICCU_CARA_KELUAR_LABELS,
  ICCU_INVASIVE_KEYS,
  ICCU_INVASIVE_LABELS,
  ICCU_BED_OPTIONS,
  type IccuInvasiveKey,
} from "@/lib/iccu-register/constants";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export type IccuRegisterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomSlug: string;
  /** Dari master `ruangan.nama` (bila diisi, judul selaras dengan menu REGISTER [ruangan]). */
  roomDisplayName?: string;
  /** `register` = daftar aktif; `history` = riwayat (HISTORY PASIEN). */
  mode?: "register" | "history";
  /**
   * Dipanggil saat daftar pasien **aktif** unit berubah (arsip, hapus, tambah, kembalikan dari arsip).
   * Untuk memicu refresh panel pasien (sidebar) tanpa reload halaman.
   */
  onActiveRegisterListChanged?: () => void;
};

type IccuRow = {
  id: string;
  nama: string | null;
  no_rm: string | null;
  no_telp: string | null;
  jenis_kelamin: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  umur_tampilan: string | null;
  asal_pasien: string | null;
  diagnosa: string | null;
  dokter_dpjp_id: string | null;
  dokter_dpjp_nama?: string | null;
  jenis_pembiayaan: string | null;
  keterangan: string | null;
  periode_masuk: string | null;
  periode_keluar: string | null;
  los_hari: number | null;
  cara_keluar: string | null;
  pindah_ruangan_id: string | null;
  meninggal_within_48h: boolean | null;
  invasive_procedures: unknown;
  /** Kode/label posisi tempat tidur di unit (kolom BED). */
  bed?: string | null;
  created_at: string;
  archived_at?: string | null;
};

type DoctorOpt = { id: string; nama: string };
type RuangOpt = { id: string; nama: string };

function parseInvasive(raw: unknown): IccuInvasiveKey[] {
  if (!Array.isArray(raw)) return [];
  const out: IccuInvasiveKey[] = [];
  for (const x of raw) {
    const s = String(x);
    if ((ICCU_INVASIVE_KEYS as readonly string[]).includes(s)) {
      out.push(s as IccuInvasiveKey);
    }
  }
  return [...new Set(out)];
}

function isoFromDbDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return "";
}

/** Tampilan / tempel Indonesia: dd-mm-yyyy dari nilai ISO yyyy-mm-dd. */
function isoToDmyDisplay(iso: string): string {
  const s = isoFromDbDate(iso);
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
}

/** Terima dd-mm-yyyy, dd/mm/yyyy, atau yyyy-mm-dd → yyyy-mm-dd. */
function parseFlexibleDateToIso(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, "");
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const p = parse(t, "yyyy-MM-dd", new Date());
    return isValid(p) ? t : null;
  }
  const norm = t.replace(/\//g, "-");
  const m = norm.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    const parsed = parse(iso, "yyyy-MM-dd", new Date());
    if (isValid(parsed)) return iso;
  }
  return null;
}

function losFromPeriods(masuk: string, keluar: string): number | null {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(masuk) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(keluar)
  ) {
    return null;
  }
  const a = new Date(`${masuk}T12:00:00`);
  const b = new Date(`${keluar}T12:00:00`);
  const d = Math.round((b.getTime() - a.getTime()) / 86400000);
  if (!Number.isFinite(d) || d < 0) return null;
  return d + 1;
}

export default function IccuRegisterModal({
  open,
  onOpenChange,
  roomSlug,
  roomDisplayName,
  mode = "register",
  onActiveRegisterListChanged,
}: IccuRegisterModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<IccuRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [listLoading, setListLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IccuRow | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<IccuRow | null>(null);
  const [archiveAck, setArchiveAck] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const isHistoryMode = mode === "history";

  const [patientForm, setPatientForm] = useState({
    noRM: "",
    nama: "",
    jenisKelamin: "L" as "L" | "P",
    tanggalLahir: "",
    alamat: "",
    noHP: "",
    jenisPembiayaan: "BPJS" as "BPJS" | "NPBI" | "Umum" | "Asuransi",
    kelasPerawatan: "Kelas 3" as "Kelas 1" | "Kelas 2" | "Kelas 3",
    asuransi: "",
  });
  const [patientSaving, setPatientSaving] = useState(false);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const registerModalUnitTitle = useMemo(
    () =>
      (
        roomDisplayName?.trim() || roomDisplayLabelFromSlug(roomSlug)
      ).toUpperCase(),
    [roomDisplayName, roomSlug],
  );

  const q = useMemo(
    () =>
      new URLSearchParams({
        roomSlug,
        page: String(page),
        pageSize: String(pageSize),
        listStatus: isHistoryMode ? "archived" : "active",
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
      }).toString(),
    [roomSlug, page, pageSize, dateFrom, dateTo, searchQ, isHistoryMode],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQ(searchInput), 420);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const searchQPrev = useRef<string | null>(null);
  useEffect(() => {
    if (searchQPrev.current === null) {
      searchQPrev.current = searchQ;
      return;
    }
    if (searchQPrev.current !== searchQ) {
      searchQPrev.current = searchQ;
      setPage(1);
    }
  }, [searchQ]);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`/api/iccu-register?${q}`);
      const json = await res.json();
      if (!json.ok) {
        toast.error(String(json.error ?? "Gagal memuat daftar"));
        return;
      }
      setRows(json.data ?? []);
      setTotal(Number(json.total ?? 0));
    } catch {
      toast.error("Gagal memuat daftar");
    } finally {
      setListLoading(false);
    }
  }, [q]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setAddPatientOpen(false);
      setDeleteTarget(null);
      setArchiveTarget(null);
      setArchiveAck(false);
      setSearchInput("");
      setSearchQ("");
      searchQPrev.current = null;
    }
  }, [open]);

  const handlePatientChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    const nextVal = name === "nama" ? normalizeNamaPasienInput(value) : value;
    setPatientForm((prev) => {
      const patched = {
        ...prev,
        [name]:
          name === "jenisKelamin" ? (value as "L" | "P") : (nextVal as string),
      };
      if (name === "jenisPembiayaan" && value === "BPJS") {
        return { ...patched, kelasPerawatan: "Kelas 3" };
      }
      if (name === "kelasPerawatan" && prev.jenisPembiayaan === "BPJS") {
        return { ...patched, kelasPerawatan: "Kelas 3" };
      }
      return patched;
    });
  };

  const submitNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = pasienSchema.safeParse(patientForm);
    if (!parsed.success) {
      toast.error("Lengkapi data pasien sesuai validasi");
      return;
    }
    setPatientSaving(true);
    try {
      const noRm = String(parsed.data.noRM ?? "").trim();
      let pasienId: string | null = null;
      let usedExistingMaster = false;

      if (noRm) {
        const lookupRes = await fetch(
          `/api/pasien?no_rm=${encodeURIComponent(noRm)}`,
        );
        const lookupJson = await lookupRes.json();
        if (!lookupJson.ok) {
          toast.error(String(lookupJson.error ?? "Gagal mengecek No. RM"));
          return;
        }
        if (lookupJson.data?.id) {
          pasienId = String(lookupJson.data.id);
          usedExistingMaster = true;
        }
      }

      if (!pasienId) {
        const res = await fetch("/api/pasien/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const json = await res.json();
        if (!json.ok || !json.data?.id) {
          toast.error(String(json.error ?? "Gagal menyimpan pasien"));
          return;
        }
        pasienId = String(json.data.id);
      }

      const reg = await fetch(
        `/api/iccu-register?roomSlug=${encodeURIComponent(roomSlug)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pasien_id: pasienId }),
        },
      );
      const regJson = await reg.json();
      if (!regJson.ok) {
        toast.error(String(regJson.error ?? "Gagal menambah ke daftar ICCU"));
        return;
      }
      if (regJson.alreadyRegistered) {
        toast.info("Pasien sudah ada di daftar ICCU unit ini");
      } else if (usedExistingMaster) {
        toast.success("Pasien dari master ditambahkan ke daftar ICCU");
      } else {
        toast.success("Pasien ditambahkan ke daftar ICCU");
      }
      setAddPatientOpen(false);
      setPatientForm({
        noRM: "",
        nama: "",
        jenisKelamin: "L",
        tanggalLahir: "",
        alamat: "",
        noHP: "",
        jenisPembiayaan: "BPJS",
        kelasPerawatan: "Kelas 3",
        asuransi: "",
      });
      await loadList();
      onActiveRegisterListChanged?.();
    } catch {
      toast.error("Kesalahan jaringan");
    } finally {
      setPatientSaving(false);
    }
  };

  const runDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/iccu-register/${encodeURIComponent(deleteTarget.id)}?roomSlug=${encodeURIComponent(roomSlug)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!json.ok) {
        toast.error(String(json.error ?? "Gagal menghapus"));
        return;
      }
      toast.success("Registrasi ICCU dihapus");
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
      await loadList();
      onActiveRegisterListChanged?.();
    } catch {
      toast.error("Kesalahan jaringan");
    }
  };

  const runArchive = async () => {
    if (!archiveTarget || !archiveAck) return;
    try {
      const res = await fetch(
        `/api/iccu-register/${encodeURIComponent(archiveTarget.id)}?roomSlug=${encodeURIComponent(roomSlug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived_at: new Date().toISOString() }),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        toast.error(String(json.error ?? "Gagal mengarsipkan"));
        return;
      }
      toast.success("Pasien dipindahkan ke HISTORY PASIEN");
      if (selectedId === archiveTarget.id) setSelectedId(null);
      setArchiveTarget(null);
      setArchiveAck(false);
      await loadList();
      onActiveRegisterListChanged?.();
    } catch {
      toast.error("Kesalahan jaringan");
    }
  };

  const rangeLabel = useMemo(() => {
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const unit = isHistoryMode ? "arsip" : "pasien";
    if (total === 0) return `Menampilkan 0 dari 0 ${unit}`;
    return `Menampilkan ${from.toLocaleString("id-ID")} – ${to.toLocaleString("id-ID")} dari ${total.toLocaleString("id-ID")} ${unit}`;
  }, [page, pageSize, total, isHistoryMode]);

  const tableGridClass = isHistoryMode
    ? "grid-cols-[2.5rem_3.25rem_5.5rem_minmax(10rem,1.2fr)_5.5rem_minmax(5.5rem,0.9fr)_minmax(6.5rem,1fr)_minmax(8rem,1.1fr)_2.75rem]"
    : "grid-cols-[2.5rem_3.25rem_5.5rem_minmax(10rem,1.2fr)_5.5rem_minmax(5.5rem,0.9fr)_minmax(6.5rem,1fr)_minmax(8rem,1.1fr)_minmax(4.5rem,4.5rem)]";

  if (!mounted) return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              key="iccu-backdrop"
              type="button"
              aria-label="Tutup overlay"
              style={{ zIndex: Z_INDEX_VALUES.intensiveIccuModalBackdrop }}
              className={cn(
                "fixed inset-0 bg-gradient-to-br from-sky-100/30 via-white/20 to-blue-100/25 backdrop-blur-sm",
                "dark:from-slate-950/25 dark:via-slate-950/15 dark:to-blue-950/20 dark:backdrop-blur-sm",
                UI_LAYERS.intensiveIccuModalBackdrop,
              )}
              onClick={() => onOpenChange(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            />

            <div
              key="iccu-dialog-stage"
              className={cn(
                "fixed inset-0 flex items-center justify-center p-3 sm:p-4",
                "pointer-events-none",
                UI_LAYERS.intensiveIccuModal,
              )}
              style={{ zIndex: Z_INDEX_VALUES.intensiveIccuModal }}
            >
              <motion.div
                key="iccu-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="iccu-register-title"
                className={cn(
                  "pointer-events-auto flex w-[min(98vw,80rem)] max-h-[min(90dvh,100%)] min-h-0 flex-col overflow-hidden",
                  "rounded-2xl border border-white/70 bg-gradient-to-b from-white/80 to-sky-50/50 text-slate-800 shadow-[0_12px_48px_rgba(37,99,235,0.14),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-2xl will-change-transform",
                  "dark:border-blue-500/25 dark:from-slate-800/75 dark:to-slate-800/50 dark:text-white dark:shadow-[0_16px_56px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.06)]",
                )}
                style={{ transformOrigin: "50% 50%" }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
              >
                {/* Jarvis HUD: ring halus + grid samar */}
                <div
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                  aria-hidden
                >
                  <div className="absolute -left-1/4 top-1/2 h-[120%] w-[120%] -translate-y-1/2 opacity-[0.07] [background:radial-gradient(circle,transparent_35%,#2563eb_36%,transparent_37%)] dark:opacity-[0.12]" />
                  <div className="absolute right-[-20%] top-[-15%] h-[min(60vw,24rem)] w-[min(60vw,24rem)] rounded-full border border-blue-400/12 dark:border-blue-400/20" />
                  <div className="absolute right-[-5%] top-[-5%] h-[min(45vw,18rem)] w-[min(45vw,18rem)] rounded-full border border-cyan-400/10 dark:border-cyan-300/15" />
                  <div className="absolute bottom-[-10%] left-[-5%] h-[14rem] w-[14rem] rounded-full border border-blue-500/8 dark:border-blue-400/12" />
                </div>

                <header className="relative z-[1] flex shrink-0 items-start justify-between gap-4 border-b border-blue-200/50 bg-white/50 px-6 py-5 backdrop-blur-sm dark:border-blue-500/20 dark:bg-white/5">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_0_16px_rgba(37,99,235,0.55)] animate-pulse" />
                    <div className="min-w-0">
                      <h2
                        id="iccu-register-title"
                        className="text-lg font-bold uppercase tracking-[0.18em] text-slate-800 dark:text-white"
                      >
                        {isHistoryMode
                          ? "History pasien"
                          : `Register ${registerModalUnitTitle}`}
                      </h2>
                      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs leading-relaxed text-slate-500 dark:text-white/85">
                        <span>
                          {isHistoryMode
                            ? "Riwayat observasi — kasus yang sudah diarsipkan"
                            : "Daftar pasien terdaftar"}
                        </span>
                        <span
                          className="text-slate-300 dark:text-white/40"
                          aria-hidden
                        >
                          ·
                        </span>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-md font-medium text-blue-600 transition hover:text-blue-700 hover:underline dark:text-sky-300 dark:hover:text-sky-200"
                          onClick={() => void loadList()}
                          title="Muat ulang data dari server (hanya saat diklik; tidak ada pembaruan otomatis di latar belakang)"
                        >
                          <RefreshCw
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              listLoading ? "animate-spin" : "",
                            )}
                            aria-hidden
                          />
                          <span>muat ulang daftar</span>
                        </button>
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full text-slate-500 shadow-sm ring-1 ring-slate-200/80 transition hover:bg-white/80 hover:text-blue-600 hover:ring-blue-200 dark:text-white dark:ring-white/10 dark:hover:bg-white/10 dark:hover:text-sky-300"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </header>

                <div className="relative z-[1] flex flex-col gap-3 border-b border-blue-200/40 bg-gradient-to-r from-white/50 to-sky-50/40 px-5 py-4 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center dark:border-blue-500/15 dark:from-slate-800/35 dark:to-slate-800/25">
                  <div className="flex flex-wrap items-center gap-2">
                    {!isHistoryMode ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-9 gap-1.5 rounded-lg border-0 bg-gradient-to-b from-sky-500 to-blue-600 px-4 text-white shadow-md shadow-blue-500/25 transition hover:from-sky-400 hover:to-blue-500 hover:shadow-lg dark:hover:brightness-110"
                        onClick={() => setAddPatientOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Tambah pasien
                      </Button>
                    ) : null}

                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 gap-1.5 rounded-lg border-slate-200/90 bg-white/90 text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-white hover:shadow dark:border-blue-500/40 dark:bg-white/5 dark:text-white dark:hover:border-sky-400/50"
                        >
                          <Filter className="h-4 w-4 text-blue-600 dark:text-sky-300" />
                          {dateFrom || dateTo
                            ? `${dateFrom ?? "…"} — ${dateTo ?? "…"}`
                            : "Filter tanggal"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className={cn(
                          "w-[min(100vw,18rem)] border-blue-200/60 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-blue-500/30 dark:bg-slate-800/95 dark:text-white",
                          UI_LAYERS.intensiveIccuModalPopover,
                        )}
                        style={{
                          zIndex: Z_INDEX_VALUES.intensiveIccuModalPopover,
                        }}
                        align="start"
                      >
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-white/90">
                          Filter tanggal buat (created)
                        </p>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] text-slate-500 dark:text-white/80">
                            Dari
                            <input
                              type="date"
                              className="mt-0.5 w-full rounded-md border border-blue-200/80 bg-white px-2 py-1.5 text-xs dark:border-blue-500/30 dark:bg-slate-900 dark:text-white"
                              value={dateFrom ?? ""}
                              onChange={(e) => {
                                setDateFrom(e.target.value || undefined);
                                setPage(1);
                              }}
                            />
                          </label>
                          <label className="text-[10px] text-slate-500 dark:text-white/80">
                            Sampai
                            <input
                              type="date"
                              className="mt-0.5 w-full rounded-md border border-blue-200/80 bg-white px-2 py-1.5 text-xs dark:border-blue-500/30 dark:bg-slate-900 dark:text-white"
                              value={dateTo ?? ""}
                              onChange={(e) => {
                                setDateTo(e.target.value || undefined);
                                setPage(1);
                              }}
                            />
                          </label>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 w-full dark:text-white"
                          onClick={() => {
                            setDateFrom(undefined);
                            setDateTo(undefined);
                            setPage(1);
                          }}
                        >
                          Hapus filter
                        </Button>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="relative min-w-[min(100%,16rem)] flex-1 sm:ml-auto sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/50" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Cari data pasien..."
                      className="h-10 rounded-xl border-blue-200/70 bg-white/90 pl-10 text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-blue-500/30 dark:border-blue-500/30 dark:bg-slate-900/60 dark:text-white dark:placeholder:text-white/90"
                      aria-label="Cari data pasien"
                    />
                  </div>
                </div>

                <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain px-4 py-5 [scrollbar-gutter:stable]">
                    {listLoading && rows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 dark:text-white/80">
                        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        <p className="text-sm">Memuat data…</p>
                      </div>
                    ) : null}

                    {rows.length === 0 && !listLoading ? (
                      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-blue-200/60 bg-white/30 py-20 text-center text-slate-600 backdrop-blur-sm dark:border-blue-500/30 dark:bg-white/5 dark:text-white/90">
                        <Hospital className="h-12 w-12 text-blue-500/80 dark:text-sky-400/90" />
                        <p className="text-sm font-medium">Belum ada data</p>
                        {!isHistoryMode ? (
                          <Button
                            type="button"
                            size="sm"
                            className="border-0 bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
                            onClick={() => setAddPatientOpen(true)}
                          >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Tambah pasien
                          </Button>
                        ) : (
                          <p className="max-w-sm text-xs text-slate-500 dark:text-white/85">
                            Belum ada kasus yang diarsipkan. Gunakan{" "}
                            <strong className="text-slate-700 dark:text-white">
                              Selesai &amp; arsip
                            </strong>{" "}
                            di detail pasien aktif.
                          </p>
                        )}
                      </div>
                    ) : null}

                    {rows.length > 0 ? (
                      <div className="w-full min-w-0 space-y-3 pb-2">
                        <div className="min-w-[820px] space-y-3">
                          <div
                            className={cn(
                              "sticky top-0 z-10 grid w-full min-w-[820px] gap-x-3 border-b border-blue-200/50 bg-sky-50/95 px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400 backdrop-blur-sm dark:border-blue-500/20 dark:bg-slate-800/90 dark:text-white/60",
                              tableGridClass,
                              UI_LAYERS.tableHeader,
                            )}
                          >
                            <span>No</span>
                            <span className="inline-flex items-center justify-center gap-0.5 text-center">
                              <Bed
                                className="h-3 w-3 opacity-60"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                              BED
                            </span>
                            <span>No. RM</span>
                            <span>Nama pasien</span>
                            <span>JK/umur</span>
                            <span>Alamat</span>
                            <span>Diagnosis (dx)</span>
                            <span>DPJP</span>
                            <span
                              className={cn(
                                "sticky right-0 z-20 -mr-px border-l border-blue-200/60 bg-sky-50/95 py-0.5 pl-1.5 text-center text-slate-500 shadow-[-6px_0_12px_-4px_rgba(15,23,42,0.12)] dark:border-blue-500/25 dark:bg-slate-800/95 dark:text-white/60 dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.4)]",
                                isHistoryMode ? "min-w-[2.75rem]" : "min-w-[4.5rem]",
                              )}
                            >
                              Aksi
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {listLoading ? (
                              <p className="px-1 text-center text-xs text-slate-400 dark:text-white/60">
                                Memperbarui…
                              </p>
                            ) : null}
                            {rows.map((r, i) => {
                              const idx = (page - 1) * pageSize + i + 1;
                              const jk =
                                (r.jenis_kelamin ?? "—").charAt(0) || "—";
                              return (
                                <div
                                  key={r.id}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setSelectedId(r.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setSelectedId(r.id);
                                    }
                                  }}
                                  className={cn(
                                    "w-full min-w-[820px] cursor-pointer rounded-xl border border-slate-200/80 bg-white/90 p-3.5 text-left shadow-sm transition",
                                    "hover:border-blue-200/80 hover:shadow-md dark:border-slate-600/50 dark:bg-slate-800/55 dark:hover:border-sky-500/35",
                                    selectedId === r.id
                                      ? "ring-2 ring-blue-400/40 dark:ring-sky-400/40"
                                      : "",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "grid w-full min-w-0 items-center gap-x-3 gap-y-1 text-[12px]",
                                      tableGridClass,
                                    )}
                                  >
                                    <span className="text-center text-xs font-medium text-slate-500 dark:text-white/80">
                                      {idx}
                                    </span>
                                    <div
                                      className="flex justify-center"
                                      title={
                                        r.bed?.trim()
                                          ? `Tempat tidur: ${r.bed.trim()}`
                                          : "Belum diisi — atur di detail pasien"
                                      }
                                    >
                                      {r.bed?.trim() ? (
                                        <span className="inline-flex min-h-[1.5rem] max-w-full items-center justify-center rounded-md border border-sky-200/90 bg-sky-50/95 px-1.5 py-0.5 text-center font-mono text-[11px] font-bold leading-tight text-sky-900 tabular-nums dark:border-sky-500/45 dark:bg-sky-950/60 dark:text-sky-200">
                                          {r.bed.trim()}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-white/50">—</span>
                                      )}
                                    </div>
                                    <span className="font-mono text-sm font-bold text-blue-600 tabular-nums dark:text-sky-300">
                                      {r.no_rm?.trim() ? r.no_rm : "—"}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="font-semibold leading-snug text-slate-900 dark:text-white">
                                        {r.nama?.trim() ? r.nama : "—"}
                                      </p>
                                      {isHistoryMode &&
                                      (isoFromDbDate(r.periode_keluar) ||
                                        r.cara_keluar) ? (
                                        <p className="mt-1 text-[10px] font-medium text-slate-500 dark:text-white/85">
                                          Keluar:{" "}
                                          {isoFromDbDate(r.periode_keluar) ||
                                            "—"}{" "}
                                          ·{" "}
                                          {r.cara_keluar &&
                                          (
                                            ICCU_CARA_KELUAR as readonly string[]
                                          ).includes(r.cara_keluar)
                                            ? ICCU_CARA_KELUAR_LABELS[
                                                r.cara_keluar as keyof typeof ICCU_CARA_KELUAR_LABELS
                                              ]
                                            : "—"}
                                        </p>
                                      ) : null}
                                      {r.no_telp ? (
                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-white/80">
                                          <Phone
                                            className="h-3 w-3 shrink-0 opacity-70"
                                            aria-hidden
                                          />
                                          {r.no_telp}
                                        </p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                      <span className="inline-flex w-max items-center justify-center rounded-md border border-slate-200/90 bg-slate-100/90 px-2 py-0.5 text-center text-[11px] font-semibold text-slate-600 dark:border-slate-500/50 dark:bg-slate-700/80 dark:text-white">
                                        {jk}
                                      </span>
                                      <span className="text-[11px] text-slate-500 dark:text-white/80">
                                        {r.umur_tampilan?.trim()
                                          ? r.umur_tampilan
                                          : "—"}
                                      </span>
                                    </div>
                                    <p
                                      className="line-clamp-2 text-slate-600 dark:text-white/85"
                                      title={r.alamat ?? undefined}
                                    >
                                      {r.alamat?.trim() ? r.alamat : "—"}
                                    </p>
                                    <div className="min-w-0">
                                      {r.diagnosa?.trim() ? (
                                        <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/95 px-2 py-1 text-[11px] font-medium text-rose-800 dark:border-rose-500/35 dark:bg-rose-950/50 dark:text-rose-100">
                                          <Activity
                                            className="h-3.5 w-3.5 shrink-0"
                                            aria-hidden
                                          />
                                          <span className="truncate">
                                            {r.diagnosa}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 dark:text-white/50">
                                          —
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-100/90 text-sky-700 dark:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-200">
                                        <User className="h-4 w-4" aria-hidden />
                                      </span>
                                      <span
                                        className="truncate text-slate-700 dark:text-white/90"
                                        title={r.dokter_dpjp_nama ?? undefined}
                                      >
                                        {r.dokter_dpjp_nama?.trim()
                                          ? r.dokter_dpjp_nama
                                          : "—"}
                                      </span>
                                    </div>
                                    <div
                                      className={cn(
                                        "sticky right-0 z-10 -mr-px flex shrink-0 items-center justify-center gap-0.5 self-stretch border-l border-slate-200/90 bg-white/95 pl-0.5 shadow-[-6px_0_12px_-4px_rgba(15,23,42,0.1)] dark:border-slate-600/55 dark:bg-slate-800/90 dark:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.35)]",
                                        isHistoryMode
                                          ? "min-w-[2.75rem] max-w-[2.75rem]"
                                          : "min-w-[4.5rem] max-w-[4.5rem]",
                                        selectedId === r.id
                                          ? "dark:bg-slate-800/95"
                                          : "",
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {isHistoryMode ? (
                                        <span className="text-[10px] font-medium text-slate-400 dark:text-white/50">
                                          —
                                        </span>
                                      ) : (
                                        <>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 rounded-lg text-slate-600 hover:bg-sky-50 hover:text-blue-700 dark:text-sky-300 dark:hover:bg-sky-950/40 dark:hover:text-sky-200"
                                            title="Selesai & arsip"
                                            aria-label={`Arsip ${r.nama?.trim() || "pasien"}`}
                                            onClick={() => setArchiveTarget(r)}
                                          >
                                            <Archive
                                              className="h-4 w-4"
                                              strokeWidth={2.25}
                                            />
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                                            title="Hapus registrasi"
                                            aria-label={`Hapus ${r.nama?.trim() || "pasien"}`}
                                            onClick={() => setDeleteTarget(r)}
                                          >
                                            <Trash2
                                              className="h-4 w-4"
                                              strokeWidth={2.25}
                                            />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <footer className="relative z-[1] flex shrink-0 flex-col gap-3 rounded-b-2xl border-t border-blue-200/50 bg-white/50 px-5 py-3.5 text-[11px] text-slate-600 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between dark:border-blue-500/20 dark:bg-white/5 dark:text-white/90">
                  <span className="text-[11px] leading-snug text-slate-600 tabular-nums dark:text-white/90">
                    {rangeLabel}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-white/60">
                      Per hal:
                    </span>
                    {[25, 50, 100].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={pageSize === n ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "h-8 min-w-[2.25rem] rounded-lg px-2.5 text-[11px] font-semibold shadow-sm transition",
                          pageSize === n
                            ? "border-0 bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-blue-500/30"
                            : "border-slate-200/90 bg-white/80 hover:border-blue-200 hover:shadow dark:border-blue-500/40 dark:bg-white/5 dark:text-white",
                        )}
                        onClick={() => {
                          setPageSize(n);
                          setPage(1);
                        }}
                      >
                        {n}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-slate-200/80 bg-white/80 shadow-sm dark:border-blue-500/40 dark:bg-white/5 dark:text-white"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-full bg-sky-100/90 px-3 py-1 text-center text-[11px] font-semibold tabular-nums text-blue-800 dark:bg-sky-950/50 dark:text-sky-100">
                      {page} / {Math.max(1, Math.ceil(total / pageSize))}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-lg border-slate-200/80 bg-white/80 shadow-sm dark:border-blue-500/40 dark:bg-white/5 dark:text-white"
                      disabled={page >= Math.ceil(total / pageSize)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </footer>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && selected ? (
          <motion.div
            key={selected.id}
            className={cn(
              "fixed inset-0",
              UI_LAYERS.intensiveIccuDrawerBackdrop,
            )}
            style={{ zIndex: Z_INDEX_VALUES.intensiveIccuDrawerBackdrop }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
          >
            <IccuRegisterDrawer
              roomSlug={roomSlug}
              row={selected}
              onClose={() => setSelectedId(null)}
              onPatched={() => void loadList()}
              readOnly={isHistoryMode}
              onActiveRegisterListChanged={
                isHistoryMode ? onActiveRegisterListChanged : undefined
              }
              onRequestArchive={
                isHistoryMode
                  ? undefined
                  : () => {
                      if (selected) setArchiveTarget(selected);
                    }
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {open && addPatientOpen && !isHistoryMode ? (
        <>
          <button
            type="button"
            aria-label="Tutup form pasien"
            style={{ zIndex: Z_INDEX_VALUES.intensiveIccuNestedModalBackdrop }}
            className={cn(
              "fixed inset-0 bg-slate-900/15 backdrop-blur-sm dark:bg-slate-950/20",
              UI_LAYERS.intensiveIccuNestedModalBackdrop,
            )}
            onClick={() => !patientSaving && setAddPatientOpen(false)}
          />
          <div
            style={{ zIndex: Z_INDEX_VALUES.intensiveIccuNestedModal }}
            className={cn(
              "fixed left-1/2 top-1/2 w-[min(100vw,32rem)] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/60 bg-gradient-to-b from-white/90 to-sky-50/80 p-6 shadow-[0_20px_50px_rgba(37,99,235,0.18)] backdrop-blur-2xl dark:border-blue-500/25 dark:from-slate-800/90 dark:to-slate-800/70 dark:shadow-[0_24px_60px_rgba(37,99,235,0.25)]",
              UI_LAYERS.intensiveIccuNestedModal,
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-800 dark:text-white">
                Tambah pasien
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-slate-600 hover:text-blue-600 dark:text-white"
                disabled={patientSaving}
                onClick={() => setAddPatientOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form
              onSubmit={submitNewPatient}
              className="space-y-4 text-sm text-slate-800 dark:text-white"
            >
              <PasienFormFields
                form={patientForm}
                handleChange={handlePatientChange}
                variant="frost"
              />
              <div className="flex justify-end gap-2 border-t border-blue-200/40 pt-4 dark:border-blue-500/20">
                <Button
                  type="button"
                  variant="outline"
                  className="border-blue-200/80 shadow-sm dark:border-blue-500/40"
                  disabled={patientSaving}
                  onClick={() => setAddPatientOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={patientSaving}
                  className="border-0 bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/30"
                >
                  {patientSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </>
      ) : null}

      <AlertDialog
        open={!!deleteTarget && open}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent
          overlayClassName={cn(
            UI_LAYERS.intensiveIccuAlertBackdrop,
            "bg-sky-100/25 backdrop-blur-md dark:bg-slate-950/50",
          )}
          overlayStyle={{ zIndex: Z_INDEX_VALUES.intensiveIccuAlertBackdrop }}
          className={cn(
            UI_LAYERS.intensiveIccuAlert,
            "w-[min(95%,28rem)] max-w-[calc(100vw-2rem)] overflow-hidden p-0",
            "rounded-2xl border border-white/80 bg-gradient-to-b from-white/95 via-sky-50/50 to-white/90",
            "text-slate-800 shadow-[0_20px_50px_rgba(37,99,235,0.18),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-2xl",
            "ring-1 ring-blue-500/10 dark:border-blue-500/30 dark:from-slate-800/95 dark:via-slate-800/80 dark:to-slate-800/90 dark:text-white dark:shadow-[0_24px_60px_rgba(37,99,235,0.2)]",
          )}
          style={{ zIndex: Z_INDEX_VALUES.intensiveIccuAlert }}
        >
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-2xl"
              aria-hidden
            >
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-blue-400/10" />
              <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full border border-cyan-400/10" />
            </div>
            <div className="relative px-6 pb-1 pt-6">
              <div className="flex gap-3">
                <div
                  className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_0_14px_rgba(37,99,235,0.45)]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-200/80 bg-rose-50/90 text-rose-600 shadow-sm dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300">
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </span>
                    <AlertDialogTitle className="!m-0 !p-0 !text-base !font-bold !uppercase !tracking-[0.14em] !text-slate-800 dark:!text-white">
                      Hapus registrasi ICCU?
                    </AlertDialogTitle>
                  </div>
                  <AlertDialogDescription className="!mt-3 text-left text-sm leading-relaxed !text-slate-600 dark:!text-white/90">
                    Pembatalan registrasi dari daftar aktif (bukan arsip kasus).
                    Master pasien tidak dihapus. Untuk menutup observasi dan
                    menyimpan riwayat gunakan{" "}
                    <strong className="text-slate-900 dark:text-white">
                      Selesai &amp; arsip
                    </strong>
                    . Baris yang dihapus:{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {deleteTarget?.nama ?? "pasien"}
                    </span>
                    .
                  </AlertDialogDescription>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="mt-0 flex flex-col-reverse gap-2 border-t border-blue-200/50 bg-white/50 px-6 py-4 backdrop-blur-sm sm:flex-row sm:justify-end dark:border-blue-500/20 dark:bg-slate-800/50">
            <Button
              type="button"
              variant="outline"
              className="w-full border-blue-200/90 bg-white/90 shadow-sm transition hover:border-blue-300 hover:bg-white hover:shadow-md sm:w-auto dark:border-blue-500/40 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-800"
              onClick={() => setDeleteTarget(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void runDelete()}
              className="w-full border-0 bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-md shadow-rose-600/30 transition hover:from-rose-500 hover:to-rose-600 hover:shadow-lg sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4 opacity-90" />
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!archiveTarget && open && !isHistoryMode}
        onOpenChange={(next) => {
          if (!next) {
            setArchiveTarget(null);
            setArchiveAck(false);
          }
        }}
      >
        <AlertDialogContent
          overlayClassName={cn(
            UI_LAYERS.intensiveIccuAlertBackdrop,
            "bg-sky-100/25 backdrop-blur-md dark:bg-slate-950/50",
          )}
          overlayStyle={{ zIndex: Z_INDEX_VALUES.intensiveIccuAlertBackdrop }}
          className={cn(
            UI_LAYERS.intensiveIccuAlert,
            "w-[min(95%,28rem)] max-w-[calc(100vw-2rem)] overflow-hidden p-0",
            "rounded-2xl border border-white/80 bg-gradient-to-b from-white/95 via-sky-50/50 to-white/90",
            "text-slate-800 shadow-[0_20px_50px_rgba(37,99,235,0.18),0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-2xl",
            "ring-1 ring-blue-500/10 dark:border-blue-500/30 dark:from-slate-800/95 dark:via-slate-800/80 dark:to-slate-800/90 dark:text-white dark:shadow-[0_24px_60px_rgba(37,99,235,0.2)]",
          )}
          style={{ zIndex: Z_INDEX_VALUES.intensiveIccuAlert }}
        >
          <div className="relative px-6 pb-1 pt-6">
            <div className="flex gap-3">
              <div
                className="mt-0.5 h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 shadow-[0_0_14px_rgba(37,99,235,0.45)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50/90 text-sky-700 shadow-sm dark:border-sky-500/30 dark:bg-sky-950/40 dark:text-sky-200">
                    <Archive className="h-4 w-4" aria-hidden />
                  </span>
                  <AlertDialogTitle className="!m-0 !p-0 !text-base !font-bold !uppercase !tracking-[0.14em] !text-slate-800 dark:!text-white">
                    Selesai observasi &amp; arsip
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription
                  asChild
                  className="!mt-3 space-y-3 text-left text-sm leading-relaxed !text-slate-600 dark:!text-white/90"
                >
                  <div>
                    <p>
                      Pasien{" "}
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {archiveTarget?.nama ?? "—"}
                      </span>{" "}
                      akan dipindahkan ke{" "}
                      <strong className="text-slate-900 dark:text-white">
                        HISTORY PASIEN
                      </strong>
                      . Data observasi tidak dihapus.
                    </p>
                    {(() => {
                      const ck = archiveTarget?.cara_keluar;
                      const caraLabel =
                        ck &&
                        (ICCU_CARA_KELUAR as readonly string[]).includes(ck)
                          ? ICCU_CARA_KELUAR_LABELS[
                              ck as keyof typeof ICCU_CARA_KELUAR_LABELS
                            ]
                          : "—";
                      const keluarIso = isoFromDbDate(
                        archiveTarget?.periode_keluar ?? null,
                      );
                      const keluarParsed = keluarIso
                        ? parse(keluarIso, "yyyy-MM-dd", new Date())
                        : null;
                      const keluarCantik =
                        keluarParsed && isValid(keluarParsed)
                          ? format(keluarParsed, "d MMMM yyyy", {
                              locale: localeId,
                            })
                          : null;
                      return (
                        <div
                          className="mt-3 rounded-xl border border-blue-200/70 bg-gradient-to-br from-white/90 to-sky-50/40 p-3 shadow-sm dark:border-blue-500/25 dark:from-slate-900/50 dark:to-slate-950/40"
                          role="group"
                          aria-label="Ringkasan data keluar"
                        >
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex min-w-0 gap-2.5 rounded-lg border border-blue-200/40 bg-white/80 px-2.5 py-2 dark:border-blue-500/20 dark:bg-slate-950/45">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-200/60 bg-sky-50/90 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-200">
                                <DoorOpen
                                  className="h-4 w-4"
                                  aria-hidden
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/85">
                                  Cara keluar
                                </p>
                                <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                                  {caraLabel}
                                </p>
                                {ck === "meninggal" ? (
                                  <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-slate-600 dark:text-white/90">
                                    <Clock
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600 dark:text-sky-300"
                                      aria-hidden
                                    />
                                    <span>
                                      <span className="font-medium text-slate-700 dark:text-white">
                                        Waktu meninggal:
                                      </span>{" "}
                                      {archiveTarget?.meninggal_within_48h ===
                                      false
                                        ? "lebih dari 48 jam"
                                        : "kurang dari 48 jam"}
                                    </span>
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex min-w-0 gap-2.5 rounded-lg border border-blue-200/40 bg-white/80 px-2.5 py-2 dark:border-blue-500/20 dark:bg-slate-950/45">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-200/60 bg-sky-50/90 text-sky-700 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-200">
                                <CalendarIcon
                                  className="h-4 w-4"
                                  aria-hidden
                                />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/85">
                                  Tanggal keluar
                                </p>
                                <p className="mt-0.5 text-sm font-semibold capitalize leading-snug text-slate-900 dark:text-white">
                                  {keluarCantik ?? (keluarIso || "—")}
                                </p>
                                {keluarCantik && keluarIso ? (
                                  <p className="mt-1 font-mono text-[10px] tabular-nums text-slate-500 dark:text-white/75">
                                    {keluarIso}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    {!(
                      archiveTarget?.cara_keluar &&
                      isoFromDbDate(archiveTarget?.periode_keluar ?? null)
                    ) ? (
                      <p className="text-amber-800 dark:text-amber-200">
                        Lengkapi{" "}
                        <strong className="text-slate-900 dark:text-white">
                          cara keluar
                        </strong>{" "}
                        dan{" "}
                        <strong className="text-slate-900 dark:text-white">
                          tanggal keluar
                        </strong>{" "}
                        di detail pasien sebelum mengarsipkan.
                      </p>
                    ) : null}
                    <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-blue-200/50 bg-white/50 px-2 py-2 dark:border-blue-500/25 dark:bg-slate-900/30">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600"
                        checked={archiveAck}
                        onChange={(e) => setArchiveAck(e.target.checked)}
                      />
                      <span>
                        Saya mengonfirmasi data keluar sudah sesuai sebelum
                        mengarsipkan.
                      </span>
                    </label>
                  </div>
                </AlertDialogDescription>
              </div>
            </div>
          </div>
          <AlertDialogFooter className="mt-0 flex flex-col-reverse gap-2 border-t border-blue-200/50 bg-white/50 px-6 py-4 backdrop-blur-sm sm:flex-row sm:justify-end dark:border-blue-500/20 dark:bg-slate-800/50">
            <Button
              type="button"
              variant="outline"
              className="w-full border-blue-200/90 bg-white/90 shadow-sm transition hover:border-blue-300 hover:bg-white hover:shadow-md sm:w-auto dark:border-blue-500/40 dark:bg-slate-800/80 dark:text-white dark:hover:bg-slate-800"
              onClick={() => {
                setArchiveTarget(null);
                setArchiveAck(false);
              }}
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={
                !archiveAck ||
                !archiveTarget?.cara_keluar ||
                !isoFromDbDate(archiveTarget?.periode_keluar ?? null)
              }
              onClick={() => void runArchive()}
              className="w-full border-0 bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-md shadow-blue-500/30 transition hover:from-sky-400 hover:to-blue-500 hover:shadow-lg sm:w-auto dark:hover:brightness-110"
            >
              <Archive className="mr-2 h-4 w-4 opacity-90" />
              Konfirmasi &amp; arsip
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>,
    document.body,
  );
}

function PeriodeDateField({
  label,
  valueIso,
  textValue,
  onTextChange,
  onCommitIso,
  readOnly,
  inputId,
  showPasteHint = false,
}: {
  label: string;
  valueIso: string;
  textValue: string;
  onTextChange: (s: string) => void;
  onCommitIso: (iso: string) => void;
  readOnly: boolean;
  inputId?: string;
  showPasteHint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [navMonth, setNavMonth] = useState<Date>(() => new Date());
  const yearNow = new Date().getFullYear();

  const safeSelected = useMemo(() => {
    if (!valueIso || !/^\d{4}-\d{2}-\d{2}$/.test(valueIso)) return undefined;
    const d = parse(valueIso, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [valueIso]);

  useEffect(() => {
    if (!open) return;
    setNavMonth(safeSelected ?? new Date());
  }, [open, safeSelected]);

  const onBlurInput = () => {
    if (readOnly) return;
    const raw = textValue.trim();
    if (raw === "") {
      if (valueIso) onCommitIso("");
      return;
    }
    const iso = parseFlexibleDateToIso(raw);
    if (iso) {
      if (iso !== valueIso) onCommitIso(iso);
      else onTextChange(isoToDmyDisplay(iso));
    } else {
      toast.error("Format tanggal tidak dikenali (contoh: 25-10-1987)");
      onTextChange(isoToDmyDisplay(valueIso));
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/90">
        {label}
      </div>
      <Popover open={open && !readOnly} onOpenChange={setOpen}>
        <div className="flex gap-2">
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="dd-mm-yyyy"
            disabled={readOnly}
            className="min-w-0 flex-1 rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
            value={textValue}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={onBlurInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text");
              const iso = parseFlexibleDateToIso(t);
              if (iso) {
                e.preventDefault();
                onCommitIso(iso);
              }
            }}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={readOnly}
              className="h-9 w-9 shrink-0 rounded-md border-cyan-500/30 bg-white shadow-sm dark:border-cyan-500/40 dark:bg-slate-900 dark:text-white"
              aria-label={`Buka kalender ${label}`}
            >
              <CalendarIcon className="h-4 w-4" aria-hidden />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent
          className={cn(
            "w-auto max-w-[min(100vw-2rem,320px)] border-blue-200/80 bg-white p-2 dark:border-blue-500/30 dark:bg-slate-950 dark:text-white",
            UI_LAYERS.intensiveIccuDrawerPopover,
          )}
          style={{ zIndex: Z_INDEX_VALUES.intensiveIccuDrawerPopover }}
          align="start"
          side="bottom"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DayPicker
            mode="single"
            selected={safeSelected}
            month={navMonth}
            onMonthChange={setNavMonth}
            onSelect={(d) => {
              if (!d) return;
              onCommitIso(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }}
            locale={localeId}
            captionLayout="dropdown"
            fromYear={1990}
            toYear={yearNow + 5}
            className={cn(
              "rdp-root text-[12px] text-slate-900 dark:text-white",
              "[&_.rdp-month_grid]:table-fixed [&_.rdp-month_grid]:w-full",
            )}
            classNames={{
              month_caption:
                "flex items-center justify-between gap-2 text-slate-800 dark:text-white",
              caption_label: "font-semibold text-slate-800 dark:text-white",
              weekdays: "text-slate-600 dark:text-white/85",
              weekday: "font-semibold",
              day_button:
                "h-9 w-9 rounded-md text-slate-800 hover:bg-slate-100 dark:text-white dark:hover:bg-cyan-950/60",
              selected:
                "bg-cyan-600 text-white hover:bg-cyan-600 dark:bg-cyan-500 dark:text-white",
              today:
                "font-bold ring-1 ring-cyan-500/50 text-cyan-700 dark:text-white",
              outside: "text-slate-400 dark:text-white/40",
            }}
          />
        </PopoverContent>
      </Popover>
      {showPasteHint ? (
        <p className="text-[10px] leading-snug text-slate-500 dark:text-white/80">
          Tempel <span className="font-mono">dd-mm-yyyy</span> atau gunakan ikon
          kalender.
        </p>
      ) : null}
    </div>
  );
}

function IccuRegisterDrawer({
  roomSlug,
  row,
  onClose,
  onPatched,
  readOnly = false,
  onRequestArchive,
  onActiveRegisterListChanged,
}: {
  roomSlug: string;
  row: IccuRow;
  onClose: () => void;
  onPatched: () => void;
  readOnly?: boolean;
  onRequestArchive?: () => void;
  onActiveRegisterListChanged?: () => void;
}) {
  type Tab = "pasien" | "dokter" | "bayar" | "invasive" | "periode" | "keluar";
  const [tab, setTab] = useState<Tab>("pasien");
  const [doctors, setDoctors] = useState<DoctorOpt[]>([]);
  const [ruangan, setRuangan] = useState<RuangOpt[]>([]);

  const [draft, setDraft] = useState(() => ({
    nama: row.nama ?? "",
    bed: row.bed ?? "",
    no_telp: row.no_telp ?? "",
    jenis_kelamin: (row.jenis_kelamin === "P" ? "P" : "L") as "L" | "P",
    tanggal_lahir: isoFromDbDate(row.tanggal_lahir),
    alamat: row.alamat ?? "",
    asal_pasien: row.asal_pasien ?? "",
    diagnosa: row.diagnosa ?? "",
    dokter_dpjp_id: row.dokter_dpjp_id ?? "",
    jenis_pembiayaan: row.jenis_pembiayaan ?? "Umum",
    keterangan: row.keterangan ?? "",
    periode_masuk: isoFromDbDate(row.periode_masuk),
    periode_keluar: isoFromDbDate(row.periode_keluar),
    los_hari: row.los_hari != null ? String(row.los_hari) : "",
    cara_keluar: (row.cara_keluar ?? "") as string,
    pindah_ruangan_id: row.pindah_ruangan_id ?? "",
    meninggal_within_48h: row.meninggal_within_48h,
    invasive: parseInvasive(row.invasive_procedures),
  }));

  const [periodeMasukText, setPeriodeMasukText] = useState(() =>
    isoToDmyDisplay(isoFromDbDate(row.periode_masuk)),
  );
  const [periodeKeluarText, setPeriodeKeluarText] = useState(() =>
    isoToDmyDisplay(isoFromDbDate(row.periode_keluar)),
  );

  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowIdRef = useRef(row.id);

  useEffect(() => {
    rowIdRef.current = row.id;
    setDraft({
      nama: row.nama ?? "",
      bed: row.bed ?? "",
      no_telp: row.no_telp ?? "",
      jenis_kelamin: (row.jenis_kelamin === "P" ? "P" : "L") as "L" | "P",
      tanggal_lahir: isoFromDbDate(row.tanggal_lahir),
      alamat: row.alamat ?? "",
      asal_pasien: row.asal_pasien ?? "",
      diagnosa: row.diagnosa ?? "",
      dokter_dpjp_id: row.dokter_dpjp_id ?? "",
      jenis_pembiayaan: row.jenis_pembiayaan ?? "Umum",
      keterangan: row.keterangan ?? "",
      periode_masuk: isoFromDbDate(row.periode_masuk),
      periode_keluar: isoFromDbDate(row.periode_keluar),
      los_hari: row.los_hari != null ? String(row.los_hari) : "",
      cara_keluar: (row.cara_keluar ?? "") as string,
      pindah_ruangan_id: row.pindah_ruangan_id ?? "",
      meninggal_within_48h: row.meninggal_within_48h,
      invasive: parseInvasive(row.invasive_procedures),
    });
    setPeriodeMasukText(isoToDmyDisplay(isoFromDbDate(row.periode_masuk)));
    setPeriodeKeluarText(isoToDmyDisplay(isoFromDbDate(row.periode_keluar)));
  }, [row]);

  useEffect(() => {
    setPeriodeMasukText(isoToDmyDisplay(draft.periode_masuk));
  }, [draft.periode_masuk]);

  useEffect(() => {
    setPeriodeKeluarText(isoToDmyDisplay(draft.periode_keluar));
  }, [draft.periode_keluar]);

  useEffect(() => {
    void (async () => {
      try {
        const [dRes, rRes] = await Promise.all([
          fetch("/api/doctors"),
          fetch("/api/ruangan"),
        ]);
        const dJson = await dRes.json();
        const rJson = await rRes.json();
        if (dJson.ok && Array.isArray(dJson.doctors)) {
          setDoctors(
            dJson.doctors.map(
              (x: { id: string; nama_dokter?: string; nama?: string }) => ({
                id: x.id,
                nama: String(x.nama_dokter ?? x.nama ?? "").trim(),
              }),
            ),
          );
        }
        if (rJson.ok && Array.isArray(rJson.ruangan)) {
          setRuangan(
            rJson.ruangan.map((x: { id: string; nama: string }) => ({
              id: x.id,
              nama: x.nama,
            })),
          );
        }
      } catch {
        /* noop */
      }
    })();
  }, []);

  const umurAuto = useMemo(() => {
    if (!draft.tanggal_lahir) return "—";
    return hitungUsia(draft.tanggal_lahir).teks;
  }, [draft.tanggal_lahir]);

  const flushPatch = useCallback(
    async (body: Record<string, unknown>) => {
      if (readOnly) return;
      try {
        const res = await fetch(
          `/api/iccu-register/${encodeURIComponent(rowIdRef.current)}?roomSlug=${encodeURIComponent(roomSlug)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        const json = await res.json();
        if (!json.ok) {
          toast.error(String(json.error ?? "Gagal menyimpan"));
          return;
        }
        onPatched();
      } catch {
        toast.error("Gagal menyimpan");
      }
    },
    [roomSlug, onPatched, readOnly],
  );

  const schedulePatch = useCallback(
    (body: Record<string, unknown>) => {
      if (readOnly) return;
      if (patchTimer.current) clearTimeout(patchTimer.current);
      patchTimer.current = setTimeout(() => void flushPatch(body), 450);
    },
    [flushPatch, readOnly],
  );

  const restoreToActive = async () => {
    try {
      const res = await fetch(
        `/api/iccu-register/${encodeURIComponent(rowIdRef.current)}?roomSlug=${encodeURIComponent(roomSlug)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived_at: null }),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        toast.error(String(json.error ?? "Gagal mengembalikan"));
        return;
      }
      toast.success("Pasien dikembalikan ke daftar aktif");
      onPatched();
      onActiveRegisterListChanged?.();
      onClose();
    } catch {
      toast.error("Gagal mengembalikan");
    }
  };

  useEffect(() => {
    return () => {
      if (patchTimer.current) clearTimeout(patchTimer.current);
    };
  }, []);

  const copyIdentity = () => {
    const t = [row.no_rm, row.nama, row.no_telp].filter(Boolean).join(" · ");
    void navigator.clipboard.writeText(t);
    toast.message("Disalin");
  };

  const openWa = () => {
    const digits = String(draft.no_telp ?? "").replace(/\D/g, "");
    if (digits.length < 9) {
      toast.error("Nomor tidak cukup untuk WhatsApp");
      return;
    }
    const n = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
    window.open(`https://wa.me/${n}`, "_blank");
  };

  const headerTime = format(new Date(), "EEEE, d MMMM yyyy HH:mm:ss", {
    locale: localeId,
  });

  const tabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "pasien", icon: <User className="h-4 w-4" />, label: "Pasien" },
    {
      id: "dokter",
      icon: <Stethoscope className="h-4 w-4" />,
      label: "Dokter & Dx",
    },
    { id: "bayar", icon: <Wallet className="h-4 w-4" />, label: "Pembayaran" },
    {
      id: "invasive",
      icon: <Microscope className="h-4 w-4" />,
      label: "Invasif",
    },
    {
      id: "periode",
      icon: <CalendarRange className="h-4 w-4" />,
      label: "Periode",
    },
    { id: "keluar", icon: <DoorOpen className="h-4 w-4" />, label: "Keluar" },
  ];

  const updateLosFromDates = (
    masuk: string,
    keluar: string,
    currentLos: string,
  ) => {
    const auto = losFromPeriods(masuk, keluar);
    if (auto != null) return String(auto);
    return currentLos;
  };

  const commitPeriodeMasuk = useCallback(
    (iso: string) => {
      if (readOnly) return;
      const periode_masuk = iso.trim() === "" ? "" : iso.trim();
      setDraft((d) => {
        const los = updateLosFromDates(
          periode_masuk,
          d.periode_keluar,
          d.los_hari,
        );
        const payload: Record<string, unknown> = {
          periode_masuk: periode_masuk || null,
        };
        const auto = losFromPeriods(periode_masuk, d.periode_keluar);
        if (auto != null) payload.los_hari = auto;
        schedulePatch(payload);
        return { ...d, periode_masuk, los_hari: los };
      });
      setPeriodeMasukText(isoToDmyDisplay(periode_masuk));
    },
    [readOnly, schedulePatch],
  );

  const commitPeriodeKeluar = useCallback(
    (iso: string) => {
      if (readOnly) return;
      const periode_keluar = iso.trim() === "" ? "" : iso.trim();
      setDraft((d) => {
        const los = updateLosFromDates(
          d.periode_masuk,
          periode_keluar,
          d.los_hari,
        );
        const payload: Record<string, unknown> = {
          periode_keluar: periode_keluar || null,
        };
        const auto = losFromPeriods(d.periode_masuk, periode_keluar);
        if (auto != null) payload.los_hari = auto;
        schedulePatch(payload);
        return { ...d, periode_keluar, los_hari: los };
      });
      setPeriodeKeluarText(isoToDmyDisplay(periode_keluar));
    },
    [readOnly, schedulePatch],
  );

  return (
    <>
      <button
        type="button"
        aria-label="Tutup detail registrasi"
        className="absolute inset-0 bg-slate-900/12 backdrop-blur-sm dark:bg-slate-950/22"
        onClick={onClose}
      />
      <div
        className="absolute inset-0 z-[1] flex min-h-0 items-center justify-center p-3 sm:p-4"
        style={{ pointerEvents: "none" }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="iccu-register-detail-title"
          className={cn(
            "pointer-events-auto flex w-[min(100vw,50rem)] max-w-[min(100%,95vw)] max-h-[min(90dvh,100%)] min-h-0 flex-col overflow-hidden",
            "rounded-2xl border border-white/60 bg-gradient-to-b from-white/85 to-sky-50/50 text-slate-800 shadow-[0_16px_48px_rgba(37,99,235,0.14)] backdrop-blur-2xl",
            "dark:border-blue-500/25 dark:from-slate-800/85 dark:to-slate-800/55 dark:text-white dark:shadow-[0_20px_56px_rgba(37,99,235,0.2)]",
            UI_LAYERS.intensiveIccuDrawer,
          )}
          style={{
            zIndex: Z_INDEX_VALUES.intensiveIccuDrawer,
            transformOrigin: "50% 50%",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
        >
          <header className="flex shrink-0 flex-wrap items-center gap-2 rounded-t-2xl border-b border-blue-200/50 bg-white/60 px-4 py-3 backdrop-blur-sm dark:border-blue-500/20 dark:bg-white/5">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-500 dark:text-white/90">
                {headerTime}
              </p>
              <p
                id="iccu-register-detail-title"
                className="truncate font-bold uppercase tracking-[0.08em] text-slate-800 dark:text-white"
              >
                {draft.nama || row.nama || "—"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-blue-200/80 shadow-sm dark:border-blue-500/40 dark:text-white"
              onClick={() => setTab("dokter")}
            >
              Diagnosa
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={copyIdentity}
              aria-label="Salin"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Tutup"
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div className="flex min-h-0 flex-1">
            <nav
              aria-label="Bagian formulir"
              className="flex min-h-0 w-[11.25rem] shrink-0 flex-col gap-1 overflow-y-auto border-r border-blue-200/40 bg-sky-50/40 px-2 py-3 dark:border-blue-500/20 dark:bg-slate-800/40 sm:w-48"
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium leading-tight text-slate-700 transition-colors sm:text-xs dark:text-white",
                    tab === t.id
                      ? "border-blue-500/50 bg-white shadow-sm shadow-blue-500/10 dark:border-sky-500/50 dark:bg-slate-800/80"
                      : "border-transparent hover:bg-white/60 dark:hover:bg-white/5",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-blue-200/50 bg-white/80 dark:border-blue-500/25 dark:bg-slate-900/50">
                    {t.icon}
                  </span>
                  <span className="min-w-0 flex-1 break-words">{t.label}</span>
                </button>
              ))}
            </nav>

            <div className="min-w-0 flex-1 overflow-y-auto p-3 text-[12px]">
              {readOnly ? (
                <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-[11px] font-medium text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-100">
                  Mode arsip — observasi ditutup. Perubahan dinonaktifkan.
                </div>
              ) : null}
              <fieldset
                disabled={readOnly}
                className="min-h-0 min-w-0 border-0 p-0 [&:disabled_*]:cursor-not-allowed"
              >
              {tab === "pasien" ? (
                <div className="space-y-3">
                  <FieldLabel> Nama pasien </FieldLabel>
                  <input
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 font-mono text-slate-900 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                    value={draft.nama}
                    onChange={(e) => {
                      const nama = e.target.value;
                      setDraft((d) => ({ ...d, nama }));
                      schedulePatch({ nama: nama.trim() || undefined });
                    }}
                  />
                  <FieldLabel> BED (posisi tempat tidur) </FieldLabel>
                  <select
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 font-mono text-sm text-slate-900 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                    value={
                      (ICCU_BED_OPTIONS as readonly string[]).includes(
                        draft.bed.trim(),
                      )
                        ? draft.bed.trim()
                        : draft.bed.trim()
                          ? `__legacy__:${draft.bed.trim()}`
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v.startsWith("__legacy__:")) return;
                      setDraft((d) => ({ ...d, bed: v }));
                      schedulePatch({ bed: v.trim() || null });
                    }}
                  >
                    <option value="">Pilih BED</option>
                    {draft.bed.trim() &&
                    !(ICCU_BED_OPTIONS as readonly string[]).includes(
                      draft.bed.trim(),
                    ) ? (
                      <option
                        value={`__legacy__:${draft.bed.trim()}`}
                        disabled
                      >
                        {draft.bed.trim()} (nilai lama — pilih ganti)
                      </option>
                    ) : null}
                    {ICCU_BED_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  <FieldLabel> No. telp / WhatsApp </FieldLabel>
                  <div className="flex gap-2">
                    <input
                      inputMode="numeric"
                      className="flex-1 rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 font-mono dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                      value={draft.no_telp}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setDraft((d) => ({ ...d, no_telp: v }));
                        schedulePatch({ no_telp: v || null });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={openWa}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <FieldLabel> Jenis kelamin </FieldLabel>
                  <select
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                    value={draft.jenis_kelamin}
                    onChange={(e) => {
                      const jenis_kelamin = e.target.value as "L" | "P";
                      setDraft((d) => ({ ...d, jenis_kelamin }));
                      schedulePatch({ jenis_kelamin });
                    }}
                  >
                    <option value="L">L</option>
                    <option value="P">P</option>
                  </select>
                  <FieldLabel> Tgl lahir </FieldLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 font-mono dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                      value={draft.tanggal_lahir}
                      onChange={(e) => {
                        const tanggal_lahir = e.target.value;
                        setDraft((d) => ({
                          ...d,
                          tanggal_lahir,
                          umur_tampilan: hitungUsia(tanggal_lahir).teks,
                        }));
                        schedulePatch({
                          tanggal_lahir: tanggal_lahir || null,
                          umur_tampilan: tanggal_lahir
                            ? hitungUsia(tanggal_lahir).teks
                            : null,
                        });
                      }}
                    />
                    <span className="text-slate-600 dark:text-white/85">
                      Umur: {umurAuto}
                    </span>
                  </div>
                  <FieldLabel> Alamat </FieldLabel>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                    value={draft.alamat}
                    onChange={(e) => {
                      const alamat = e.target.value;
                      setDraft((d) => ({ ...d, alamat }));
                      schedulePatch({ alamat: alamat || null });
                    }}
                  />
                  <FieldLabel> Asal pasien </FieldLabel>
                  <select
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                    value={
                      [...ICCU_ASAL_PRESETS].includes(
                        draft.asal_pasien as (typeof ICCU_ASAL_PRESETS)[number],
                      )
                        ? draft.asal_pasien
                        : draft.asal_pasien
                          ? "__custom__"
                          : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__custom__") return;
                      setDraft((d) => ({ ...d, asal_pasien: v }));
                      schedulePatch({ asal_pasien: v || null });
                    }}
                  >
                    <option value="">—</option>
                    {ICCU_ASAL_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="__custom__">
                      RAWAT INAP / lainnya (ketik)
                    </option>
                  </select>
                  <input
                    className="mt-1 w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                    placeholder="Asal lain / ruangan"
                    value={
                      [...ICCU_ASAL_PRESETS].includes(
                        draft.asal_pasien as (typeof ICCU_ASAL_PRESETS)[number],
                      )
                        ? ""
                        : draft.asal_pasien
                    }
                    onChange={(e) => {
                      const asal_pasien = e.target.value;
                      setDraft((d) => ({ ...d, asal_pasien }));
                      schedulePatch({ asal_pasien: asal_pasien || null });
                    }}
                  />
                  <p className="text-[10px] text-slate-500 dark:text-white/80">
                    RAWAT INAP: pilih dari master ruangan di bawah jika perlu.
                  </p>
                  <select
                    className="w-full rounded-md border border-cyan-500/20 bg-white px-2 py-1 text-[11px] dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                    value=""
                    onChange={(e) => {
                      const ru = ruangan.find((x) => x.id === e.target.value);
                      if (!ru) return;
                      const asal_pasien = `RI: ${ru.nama}`;
                      setDraft((d) => ({ ...d, asal_pasien }));
                      schedulePatch({ asal_pasien });
                    }}
                  >
                    <option value="">Pilih ruangan (isi asal)</option>
                    {ruangan.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {tab === "dokter" ? (
                <div className="space-y-3">
                  <FieldLabel> Dokter DPJP </FieldLabel>
                  <select
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                    value={draft.dokter_dpjp_id}
                    onChange={(e) => {
                      const dokter_dpjp_id = e.target.value;
                      setDraft((d) => ({ ...d, dokter_dpjp_id }));
                      schedulePatch({ dokter_dpjp_id: dokter_dpjp_id || null });
                    }}
                  >
                    <option value="">—</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                  <FieldLabel> Diagnosa </FieldLabel>
                  <textarea
                    rows={4}
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                    value={draft.diagnosa}
                    onChange={(e) => {
                      const diagnosa = e.target.value;
                      setDraft((d) => ({ ...d, diagnosa }));
                      schedulePatch({ diagnosa: diagnosa || null });
                    }}
                  />
                </div>
              ) : null}

              {tab === "bayar" ? (
                <div className="space-y-3">
                  <FieldLabel> Jenis pembiayaan </FieldLabel>
                  <select
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                    value={draft.jenis_pembiayaan}
                    onChange={(e) => {
                      const jenis_pembiayaan = e.target.value;
                      setDraft((d) => ({ ...d, jenis_pembiayaan }));
                      schedulePatch({
                        jenis_pembiayaan: jenis_pembiayaan || null,
                      });
                    }}
                  >
                    <option value="Umum">Umum</option>
                    <option value="BPJS">BPJS / PBI</option>
                    <option value="NPBI">NPBI</option>
                    <option value="Asuransi">Asuransi</option>
                  </select>
                  <FieldLabel> Keterangan </FieldLabel>
                  <textarea
                    rows={3}
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                    value={draft.keterangan}
                    onChange={(e) => {
                      const keterangan = e.target.value;
                      setDraft((d) => ({ ...d, keterangan }));
                      schedulePatch({ keterangan: keterangan || null });
                    }}
                  />
                </div>
              ) : null}

              {tab === "invasive" ? (
                <div className="grid grid-cols-2 gap-2">
                  {ICCU_INVASIVE_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-cyan-500/20 px-2 py-1.5 dark:border-cyan-500/25"
                    >
                      <input
                        type="checkbox"
                        checked={draft.invasive.includes(key)}
                        onChange={(e) => {
                          const on = e.target.checked;
                          const invasive = on
                            ? [...draft.invasive, key]
                            : draft.invasive.filter((k) => k !== key);
                          setDraft((d) => ({ ...d, invasive }));
                          schedulePatch({ invasive_procedures: invasive });
                        }}
                      />
                      <span className="text-[11px] font-mono text-slate-800 dark:text-white">
                        {ICCU_INVASIVE_LABELS[key]}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}

              {tab === "periode" ? (
                <div className="space-y-3">
                  <PeriodeDateField
                    label="Masuk"
                    inputId="iccu-periode-masuk"
                    valueIso={draft.periode_masuk}
                    textValue={periodeMasukText}
                    onTextChange={setPeriodeMasukText}
                    onCommitIso={commitPeriodeMasuk}
                    readOnly={readOnly}
                    showPasteHint
                  />
                  <PeriodeDateField
                    label="Keluar"
                    inputId="iccu-periode-keluar"
                    valueIso={draft.periode_keluar}
                    textValue={periodeKeluarText}
                    onTextChange={setPeriodeKeluarText}
                    onCommitIso={commitPeriodeKeluar}
                    readOnly={readOnly}
                  />
                  <FieldLabel> Total hari (LOS) </FieldLabel>
                  <input
                    className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 font-mono dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white dark:placeholder:text-white/90"
                    value={draft.los_hari}
                    onChange={(e) => {
                      const los_hari = e.target.value.replace(/\D/g, "");
                      setDraft((d) => ({ ...d, los_hari }));
                      if (los_hari === "") {
                        schedulePatch({ los_hari: null });
                      } else {
                        schedulePatch({ los_hari: Number(los_hari) });
                      }
                    }}
                  />
                </div>
              ) : null}

              {tab === "keluar" ? (
                <div className="space-y-3">
                  {ICCU_CARA_KELUAR.map((ck) => (
                    <label
                      key={ck}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-cyan-500/20 px-2 py-2 dark:border-cyan-500/25"
                    >
                      <input
                        type="radio"
                        name="cara_keluar"
                        checked={draft.cara_keluar === ck}
                        onChange={() => {
                          setDraft((d) => {
                            const today = format(new Date(), "yyyy-MM-dd");
                            const needsKeluar =
                              ck === "meninggal" &&
                              !isoFromDbDate(d.periode_keluar);
                            const nextKeluar = needsKeluar
                              ? today
                              : d.periode_keluar;
                            const nextMeninggal48 =
                              ck === "meninggal"
                                ? (d.meninggal_within_48h ?? true)
                                : null;
                            const losStr = updateLosFromDates(
                              d.periode_masuk,
                              nextKeluar,
                              d.los_hari,
                            );

                            const payload: Record<string, unknown> = {
                              cara_keluar: ck,
                            };
                            if (ck !== "pindah_ruangan")
                              payload.pindah_ruangan_id = null;
                            if (ck !== "meninggal") {
                              payload.meninggal_within_48h = null;
                            } else {
                              payload.meninggal_within_48h = nextMeninggal48;
                            }
                            if (needsKeluar) {
                              payload.periode_keluar = today;
                              const auto = losFromPeriods(
                                d.periode_masuk,
                                today,
                              );
                              if (auto != null) payload.los_hari = auto;
                            }

                            void flushPatch(payload);

                            return {
                              ...d,
                              cara_keluar: ck,
                              pindah_ruangan_id:
                                ck === "pindah_ruangan"
                                  ? d.pindah_ruangan_id
                                  : "",
                              meninggal_within_48h: nextMeninggal48,
                              periode_keluar: nextKeluar,
                              los_hari: losStr,
                            };
                          });
                        }}
                      />
                      <span className="text-slate-800 dark:text-white">
                        {ICCU_CARA_KELUAR_LABELS[ck]}
                      </span>
                    </label>
                  ))}
                  {draft.cara_keluar === "pindah_ruangan" ? (
                    <>
                      <FieldLabel> Ruangan tujuan </FieldLabel>
                      <select
                        className="w-full rounded-md border border-cyan-500/30 bg-white px-2 py-1.5 dark:border-cyan-500/25 dark:bg-zinc-900 dark:text-white"
                        value={draft.pindah_ruangan_id}
                        onChange={(e) => {
                          const pindah_ruangan_id = e.target.value;
                          setDraft((d) => ({ ...d, pindah_ruangan_id }));
                          schedulePatch({
                            pindah_ruangan_id: pindah_ruangan_id || null,
                          });
                        }}
                      >
                        <option value="">—</option>
                        {ruangan.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : null}
                  {draft.cara_keluar === "meninggal" ? (
                    <div className="flex flex-col gap-2 pl-6">
                      <p className="text-[10px] leading-snug text-slate-500 dark:text-white/85">
                        Bila tanggal keluar masih kosong, sistem mengisi{" "}
                        <strong className="text-slate-700 dark:text-white">
                          hari ini
                        </strong>{" "}
                        agar arsip dapat dilanjutkan; ubah di tab{" "}
                        <strong className="text-slate-700 dark:text-white">
                          Periode
                        </strong>{" "}
                        bila tanggal meninggal berbeda.
                      </p>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="meninggal_48"
                          checked={draft.meninggal_within_48h === true}
                          onChange={() => {
                            setDraft((d) => ({
                              ...d,
                              meninggal_within_48h: true,
                            }));
                            schedulePatch({ meninggal_within_48h: true });
                          }}
                        />
                        <span className="dark:text-white">&lt; 48 jam</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="meninggal_48"
                          checked={draft.meninggal_within_48h === false}
                          onChange={() => {
                            setDraft((d) => ({
                              ...d,
                              meninggal_within_48h: false,
                            }));
                            schedulePatch({ meninggal_within_48h: false });
                          }}
                        />
                        <span className="dark:text-white">&gt; 48 jam</span>
                      </label>
                    </div>
                  ) : null}
                </div>
              ) : null}
              </fieldset>
            </div>
          </div>

          <footer className="shrink-0 border-t border-blue-200/50 bg-white/50 px-4 py-2.5 text-[10px] text-slate-500 backdrop-blur-sm dark:border-blue-500/20 dark:bg-white/5 dark:text-white/85">
            {readOnly ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="dark:text-white/85">
                  Riwayat tersimpan. Dokumentasi flowsheet tetap dapat diakses.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="dark:border-blue-500/40 dark:text-white"
                  onClick={() => void restoreToActive()}
                >
                  Kembalikan ke daftar aktif
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="dark:text-white/85">
                  Perubahan disimpan otomatis (senyap). Tombol tutup tidak
                  mengembalikan riwayat edit.
                </span>
                {onRequestArchive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1 border-slate-200/90 dark:border-blue-500/40 dark:text-white"
                    onClick={() => onRequestArchive()}
                  >
                    <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Selesai &amp; arsip…
                  </Button>
                ) : null}
              </div>
            )}
          </footer>
        </motion.div>
      </div>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-white/90">
      {children}
    </div>
  );
}
