"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import ModalWrapper from "@/components/global/ModalWrapper";
import { useNotification } from "@/app/contexts/NotificationContext";
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
} from "./cells/EditableCells";
import { buildJadwalElektifWhatsApp } from "../lib/buildJadwalElektifWhatsApp";
import JadwalRmRiwayatPopover from "./JadwalRmRiwayatPopover";

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

function isCathlabRow(row: JadwalRow): boolean {
  const blob = `${row.kategori ?? ""} ${row.ruangan ?? ""}`.toLowerCase();
  return blob.includes("cath");
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

const TH =
  "px-0.5 py-1 font-mono font-black text-[8px] uppercase tracking-wide text-violet-200 bg-zinc-900 sticky top-0";
const TD = "border border-white/10 px-0.5 py-0.5 align-middle min-w-0";

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

export default function JadwalCathModal({ open, onClose, onChanged }: Props) {
  const { show } = useNotification();
  const { createOne, updateOne, deleteOne, loading: crudLoading } =
    useTindakanCrud();
  const { emitRefresh, emitOpenDetail } = useTindakanEventBridge();
  const { doctors, isLoading: doctorsLoading } = useMasterDoctors();
  const { masterTindakan, isLoading: tindakanLoading } = useMasterTindakan();
  const { ruangan, isLoading: ruanganLoading } = useMasterRuangan();
  const { perawat, isLoading: perawatLoading } = useMasterPerawat();

  const today = todayWibYmd();
  const [selectedDate, setSelectedDate] = useState(today);
  const [rangeMode, setRangeMode] = useState<"day" | "month">("day");
  const [rows, setRows] = useState<JadwalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { year, month } = ymdParts(selectedDate);
  const { from, to } =
    rangeMode === "month"
      ? monthRange(year, month)
      : { from: selectedDate, to: selectedDate };

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

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const q = new URLSearchParams({
        from,
        to,
        limit: "500",
      });
      const res = await fetch(`/api/tindakan?${q.toString()}`, {
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: Record<string, unknown>[];
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        throw new Error(json.error || "Gagal memuat jadwal.");
      }
      const list = Array.isArray(json.data) ? json.data.map(mapApiRow) : [];
      setRows(
        list
          .filter((r) => r.id && isCathlabRow(r))
          .sort((a, b) => txt(a.tanggal).localeCompare(txt(b.tanggal))),
      );
    } catch (e) {
      setRows([]);
      setLoadError(e instanceof Error ? e.message : "Gagal memuat jadwal.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (!open) {
      setFullscreen(false);
      return;
    }
    void reload();
  }, [open, reload]);

  useEffect(() => {
    if (!open || !fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, fullscreen]);

  const bump = useCallback(() => {
    emitRefresh();
    onChanged?.();
  }, [emitRefresh, onChanged]);

  const patchField = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      try {
        await updateOne(id, patch);
        setRows((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        );
        bump();
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
    [bump, show, updateOne],
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
        const umurTeks = p.tanggalLahir
          ? hitungUsia(p.tanggalLahir).teks
          : "";
        const dup = rows.some(
          (r) => r.id !== row.id && txt(r.no_rm) === rm && txt(r.tanggal) === txt(row.tanggal),
        );
        if (dup) {
          show({
            type: "warning",
            message: "RM yang sama sudah ada di tanggal ini. Tetap disimpan.",
          });
        }
        const ok = await patchField(row.id, {
          no_rm: p.noRM || rm,
          nama_pasien: p.nama,
          nama: p.nama,
          pasien_id: p.id,
          kelas_pembiayaan: kelasDariPasien(p) || null,
          umur: umurTeks || null,
        });
        return ok;
      } catch (e) {
        show({
          type: "error",
          message: e instanceof Error ? e.message : "Gagal lookup RM.",
        });
        return false;
      }
    },
    [patchField, rows, show],
  );

  const addJadwal = useCallback(async () => {
    setCreating(true);
    try {
      const created = await createOne({
        tanggal: selectedDate,
        status: "Menunggu",
        kategori: "Cathlab",
        ruangan: "Cathlab",
        nama: "Pasien",
        nama_pasien: "Pasien",
        dokter: "Belum ditentukan",
        tindakan: "Belum diisi",
      });
      const id = String((created as { id?: string } | null)?.id ?? "");
      if (!id) throw new Error("Draft jadwal tidak mengembalikan id.");
      show({ type: "success", message: "Baris jadwal ditambahkan." });
      bump();
      await reload();
    } catch (e) {
      show({
        type: "error",
        message: e instanceof Error ? e.message : "Gagal menambah jadwal.",
      });
    } finally {
      setCreating(false);
    }
  }, [bump, createOne, reload, selectedDate, show]);

  const removeDraft = useCallback(
    async (row: JadwalRow) => {
      if (txt(row.status).toLowerCase() !== "menunggu") {
        show({
          type: "warning",
          message: "Hanya draft berstatus Menunggu yang boleh dihapus.",
        });
        return;
      }
      const ok = window.confirm(
        "Hapus baris jadwal kosong ini? Kasus yang sudah berjalan tidak dihapus.",
      );
      if (!ok) return;
      try {
        await deleteOne(row.id);
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        show({ type: "success", message: "Draft jadwal dihapus." });
        bump();
      } catch (e) {
        show({
          type: "error",
          message: e instanceof Error ? e.message : "Gagal menghapus draft.",
        });
      }
    },
    [bump, deleteOne, show],
  );

  const copyWa = useCallback(async () => {
    const text = buildJadwalElektifWhatsApp({
      tanggalYmd: rangeMode === "day" ? selectedDate : from,
      rows: rows.map((r) => ({
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
    const hasRow = rows.some(
      (r) => txt(r.nama_pasien) || txt(r.no_rm),
    );
    if (!hasRow) {
      show({ type: "warning", message: "Belum ada jadwal" });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      show({ type: "success", message: "Teks jadwal disalin" });
    } catch {
      show({ type: "error", message: "Gagal menyalin ke clipboard." });
    }
  }, [from, rangeMode, rows, selectedDate, show]);

  const waDisabled = !rows.some((r) => txt(r.nama_pasien) || txt(r.no_rm));

  const tableBlock = (
    <div className="min-h-0 flex-1 overflow-auto">
      {loading ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-zinc-400">
          <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            Memuat jadwal…
          </span>
        </div>
      ) : loadError ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm font-semibold text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
          >
            Coba lagi
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-zinc-400">
          <p className="text-sm font-semibold text-white">Belum ada jadwal</p>
          <p className="text-xs">Tambah Jadwal untuk baris draft.</p>
        </div>
      ) : (
        <table className="w-full min-w-0 table-fixed border-collapse text-[10px] text-white sm:text-[11px]">
          <thead>
            <tr>
              <th className={cn(TH, "w-[4%]")} style={{ width: "4%" } as CSSProperties}>
                No
              </th>
              <th className={cn(TH, "w-[8%]")}>Hari/tgl</th>
              <th className={cn(TH, "w-[7%]")}>No. RM</th>
              <th className={cn(TH, "w-[10%]")}>Nama</th>
              <th className={cn(TH, "w-[7%]")}>Kelas</th>
              <th className={cn(TH, "w-[4%]")}>Umur</th>
              <th className={cn(TH, "w-[7%]")}>Ruangan</th>
              <th className={cn(TH, "w-[8%]")}>Diagnosa</th>
              <th className={cn(TH, "w-[8%]")}>Tindakan</th>
              <th className={cn(TH, "w-[8%]")}>Dokter</th>
              <th className={cn(TH, "w-[8%]")}>Hasil lab</th>
              <th className={cn(TH, "w-[6%]")}>Asisten</th>
              <th className={cn(TH, "w-[6%]")}>Sirkuler</th>
              <th className={cn(TH, "w-[6%]")}>Logger</th>
              <th className={cn(TH, "w-[7%]")}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id}
                className="hover:bg-white/5"
                onDoubleClick={(e) => {
                  const t = e.target as HTMLElement;
                  if (t.closest("input,select,textarea,button")) return;
                  emitOpenDetail(row.id);
                }}
              >
                <td className={cn(TD, "text-center font-mono")}>
                  <div className="flex items-center justify-center gap-0.5">
                    <span>{i + 1}</span>
                    {txt(row.status).toLowerCase() === "menunggu" ? (
                      <button
                        type="button"
                        title="Hapus draft"
                        onClick={() => void removeDraft(row)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-red-500/20 hover:text-red-300"
                      >
                        <Trash2 size={12} />
                      </button>
                    ) : null}
                  </div>
                </td>
                <td className={TD}>
                  <EditableDateCell
                    value={txt(row.tanggal)}
                    onCommit={(next) =>
                      patchField(row.id, { tanggal: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <div className="flex min-w-0 items-center gap-0.5">
                    <div className="min-w-0 flex-1">
                      <EditableTextCell
                        value={txt(row.no_rm)}
                        placeholder="RM"
                        onCommit={(next) => onRmCommit(row, next)}
                      />
                    </div>
                    {txt(row.no_rm) ? (
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
                <td className={TD}>
                  <EditableTextCell
                    value={txt(row.nama_pasien)}
                    placeholder="Nama"
                    onCommit={(next) =>
                      patchField(row.id, {
                        nama_pasien: next || null,
                        nama: next || null,
                      })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditableTextCell
                    value={txt(row.kelas_pembiayaan)}
                    placeholder="NPBI - 1"
                    onCommit={(next) =>
                      patchField(row.id, {
                        kelas_pembiayaan: next || null,
                      })
                    }
                  />
                </td>
                <td className={cn(TD, "text-center text-white/90")}>
                  {txt(row.umur) || "—"}
                </td>
                <td className={TD}>
                  <EditableRuanganCell
                    value={txt(row.ruangan)}
                    ruanganMaster={ruanganOptions}
                    loading={ruanganLoading}
                    listboxId={`jadwal-ruang-${row.id}`}
                    onCommit={(next) =>
                      patchField(row.id, { ruangan: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditableTextCell
                    value={txt(row.diagnosa)}
                    placeholder="Diagnosa"
                    onCommit={(next) =>
                      patchField(row.id, { diagnosa: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditableMasterTindakanCell
                    value={txt(row.tindakan)}
                    masterOptions={tindakanOptions}
                    loading={tindakanLoading}
                    listboxId={`jadwal-tin-${row.id}`}
                    onCommit={(next) =>
                      patchField(row.id, { tindakan: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditableDokterCell
                    value={txt(row.dokter)}
                    doctorOptionsMaster={doctorOptions}
                    dokterOptions={doctorOptions.map((d) => d.nama_dokter)}
                    loading={doctorsLoading}
                    listboxId={`jadwal-dok-${row.id}`}
                    onCommit={(next) =>
                      patchField(row.id, { dokter: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditableTextCell
                    value={txt(row.hasil_lab_ppm)}
                    placeholder="Lab"
                    onCommit={(next) =>
                      patchField(row.id, { hasil_lab_ppm: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditablePerawatCell
                    value={txt(row.asisten)}
                    perawatMaster={perawatOptions}
                    loading={perawatLoading}
                    listboxId={`jadwal-as-${row.id}`}
                    onCommit={(next) =>
                      patchField(row.id, { asisten: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditablePerawatCell
                    value={txt(row.sirkuler)}
                    perawatMaster={perawatOptions}
                    loading={perawatLoading}
                    listboxId={`jadwal-sk-${row.id}`}
                    onCommit={(next) =>
                      patchField(row.id, { sirkuler: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditablePerawatCell
                    value={txt(row.logger)}
                    perawatMaster={perawatOptions}
                    loading={perawatLoading}
                    listboxId={`jadwal-lg-${row.id}`}
                    onCommit={(next) =>
                      patchField(row.id, { logger: next || null })
                    }
                  />
                </td>
                <td className={TD}>
                  <EditableTextCell
                    value={txt(row.keterangan)}
                    placeholder="Ket"
                    onCommit={(next) =>
                      patchField(row.id, { keterangan: next || null })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const shell = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-zinc-950 text-white",
        fullscreen &&
          cn(
            "fixed inset-0 h-dvh w-screen",
            UI_LAYERS.fullscreen,
          ),
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-5 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 sm:h-11 sm:w-11">
            <Calendar size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black tracking-tight sm:text-lg">
              Jadwal Tindakan Cath Lab
            </h2>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Input tabel · selaras drawer
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            title="Salin jadwal ke WhatsApp"
            aria-label="Salin jadwal ke WhatsApp"
            disabled={waDisabled}
            onClick={() => void copyWa()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"
          >
            <MessageCircle size={18} />
          </button>
          <button
            type="button"
            title={fullscreen ? "Keluar layar penuh" : "Layar penuh"}
            aria-label={fullscreen ? "Keluar layar penuh" : "Layar penuh"}
            onClick={() => setFullscreen((v) => !v)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15"
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          {!fullscreen ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 hover:bg-red-500/20 hover:text-red-300"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/5 px-3 py-2 sm:px-5">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            setRangeMode("day");
            setSelectedDate(e.target.value || today);
          }}
          className="h-11 min-h-11 rounded-lg border border-white/15 bg-zinc-900 px-2 text-sm text-white [color-scheme:dark]"
        />
        <button
          type="button"
          onClick={() => void addJadwal()}
          disabled={creating || crudLoading}
          className="inline-flex h-11 min-h-11 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-black uppercase tracking-wide hover:bg-violet-500 disabled:opacity-50"
        >
          {creating ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Tambah Jadwal
        </button>
      </div>

      {tableBlock}

      <footer className="flex shrink-0 gap-1 overflow-x-auto border-t border-white/5 px-2 py-2">
        {BULAN_TAB.map((tab) => {
          const active = rangeMode === "month" && month === tab.month;
          const isNow = month === tab.month && rangeMode === "day";
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setRangeMode("month");
                const mm = String(tab.month).padStart(2, "0");
                setSelectedDate(`${year}-${mm}-01`);
              }}
              className={cn(
                "relative h-11 shrink-0 rounded-lg px-3 text-[10px] font-black uppercase tracking-widest",
                active
                  ? "bg-white text-black"
                  : "bg-white/5 text-zinc-400 hover:text-white",
              )}
            >
              {tab.label}
              {isNow && !active ? (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
              ) : null}
            </button>
          );
        })}
      </footer>
    </div>
  );

  if (!open) return null;

  if (fullscreen && typeof document !== "undefined") {
    return createPortal(shell, document.body);
  }

  return (
    <ModalWrapper
      onClose={onClose}
      isWide
      zIndex={130}
      className="h-[95vh] max-w-[98vw] overflow-hidden rounded-[1.5rem] border-white/10 bg-zinc-950 p-0 shadow-2xl sm:rounded-[2rem]"
    >
      {shell}
    </ModalWrapper>
  );
}
