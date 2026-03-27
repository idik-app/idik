"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ClipboardList, Plus, Trash2 } from "lucide-react";

import { useNotification } from "@/app/contexts/NotificationContext";
import { useAppDialog } from "@/contexts/AppDialogContext";
import {
  PasienCombobox,
  formatPasienLabel,
  type PasienOption,
} from "@/components/ui/pasien-combobox";
import {
  DoctorCombobox,
  formatDoctorLabel,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";

import { useTindakanBridgeAdapter } from "../bridge/useTindakanBridgeAdapter";
import TableContainer from "../components/TableContainer";
import TableToolbar from "../components/TableToolbar";
import TablePagination from "../components/TablePagination";
import type { TindakanJoinResult } from "../bridge/mapping.types";
import {
  displayNamaPasien,
  displayRm,
  parsePasienAktifFilter,
  rowMatchesPasienAktifFilter,
} from "../lib/displayTindakanRow";
import { TINDAKAN_STATUS } from "../bridge/bridge.constants";

type Adapter = ReturnType<typeof useTindakanBridgeAdapter>;

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const maybe = err as Record<string, unknown>;
    const msg = maybe.message;
    if (typeof msg === "string" && msg.trim()) return msg;
    const details = maybe.details;
    if (typeof details === "string" && details.trim()) return details;
    const hint = maybe.hint;
    if (typeof hint === "string" && hint.trim()) return hint;
  }
  return "Terjadi kesalahan yang tidak diketahui.";
}

function recordSearchHaystack(r: TindakanJoinResult): string {
  try {
    return JSON.stringify(r).toLowerCase();
  } catch {
    return "";
  }
}

function normalizeIdikToken(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^rm/, "");
}

function rowMatchesPasienQueryFallback(
  row: TindakanJoinResult,
  pasienId: string,
  rmOrQuery: string,
): boolean {
  const raw = row as unknown as Record<string, unknown>;
  const tokens = [
    raw.pasien_id,
    raw.no_rm,
    raw.rm,
    raw.nomor_rm,
    raw.no_rm_pasien,
    raw.nama_pasien,
    raw.nama,
    raw.pasien_nama,
  ];
  const nId = normalizeIdikToken(pasienId);
  const nRm = normalizeIdikToken(rmOrQuery);

  if (nId && tokens.some((t) => normalizeIdikToken(t) === nId)) return true;
  if (nRm && tokens.some((t) => normalizeIdikToken(t).includes(nRm)))
    return true;
  return false;
}

function rowMatchesPasienDeepFallback(
  row: TindakanJoinResult,
  pasienId: string,
  rmOrQuery: string,
): boolean {
  const hay = normalizeIdikToken(JSON.stringify(row));
  const nId = normalizeIdikToken(pasienId);
  const nRm = normalizeIdikToken(rmOrQuery);
  if (!hay) return false;
  if (nId && hay.includes(nId)) return true;
  if (nRm && hay.includes(nRm)) return true;
  return false;
}

function pemakaianHrefForRow(rec: TindakanJoinResult): string {
  const id = String(rec.id ?? "").trim();
  const pid = rec.pasien_id ? String(rec.pasien_id).trim() : "";
  const rm = String(rec.no_rm ?? "").trim();
  const q = new URLSearchParams();
  if (pid) q.set("pasienId", pid);
  else if (rm) q.set("rm", rm);
  if (id) q.set("tindakanId", id);
  const s = q.toString();
  return s ? `/dashboard/pemakaian?${s}` : "/dashboard/pemakaian";
}

function mapApiPasienRow(r: Record<string, unknown>): PasienOption | null {
  const rawId = r.id;
  if (rawId == null || rawId === "") return null;
  const id = String(rawId);
  const nama = typeof r.nama === "string" ? r.nama : String(r.nama ?? "");
  const no_rm = r.no_rm == null || r.no_rm === "" ? null : String(r.no_rm);
  const ca = r.created_at;
  const created_at =
    typeof ca === "string"
      ? ca
      : ca instanceof Date
        ? ca.toISOString()
        : ca != null
          ? String(ca)
          : null;
  return { id, nama, no_rm, created_at };
}

function buildPasienLabelFromRow(raw: Record<string, unknown>): string {
  const nama = String(raw.nama_pasien ?? raw.nama ?? "").trim();
  const rm = String(raw.no_rm ?? raw.rm ?? raw.nomor_rm ?? "").trim();
  if (nama || rm) return formatPasienLabel({ nama, no_rm: rm || null });
  return "";
}

function resolvePasienFromLabel(
  options: PasienOption[],
  label: string,
): PasienOption | null {
  const t = label.trim();
  if (!t) return null;
  for (const p of options) {
    if (formatPasienLabel(p) === t) return p;
  }
  return null;
}

function resolvePasienFromRow(
  options: PasienOption[],
  raw: Record<string, unknown>,
): PasienOption | null {
  const pid = String(raw.pasien_id ?? "").trim();
  if (pid) {
    const hit = options.find((p) => String(p.id) === pid);
    if (hit) return hit;
  }
  const label = buildPasienLabelFromRow(raw);
  return label ? resolvePasienFromLabel(options, label) : null;
}

function extractRmFromLabel(label: string): string {
  const t = label.trim();
  if (!t) return "";
  const m = t.match(/\(([^)]+)\)\s*$/);
  if (!m) return "";
  return String(m[1] ?? "").trim();
}

function mapApiDoctorRow(r: Record<string, unknown>): DoctorOption | null {
  const rawId = r.id;
  if (rawId == null || rawId === "") return null;
  const id = String(rawId);
  const nama_dokter =
    typeof r.nama_dokter === "string"
      ? r.nama_dokter
      : typeof r.nama === "string"
        ? r.nama
        : String(r.nama_dokter ?? r.nama ?? "");
  const spesialis =
    r.spesialis == null || r.spesialis === "" ? null : String(r.spesialis);
  const aktif =
    r.aktif === false ? false : r.status === false ? false : (r.aktif as any);
  return {
    id,
    nama_dokter: String(nama_dokter).trim(),
    spesialis,
    aktif: aktif === false ? false : true,
  };
}

function resolveDoctorFromLabel(
  options: DoctorOption[],
  label: string,
): DoctorOption | null {
  const t = label.trim();
  if (!t) return null;
  // Exact label match first (Nama, Spesialis).
  for (const d of options) {
    if (formatDoctorLabel(d) === t) return d;
  }
  // Fallback: match by nama only.
  for (const d of options) {
    if (String(d.nama_dokter ?? "").trim() === t) return d;
  }
  return null;
}

function EditableInlineCell({
  value,
  placeholder = "—",
  onCommit,
}: {
  value: string;
  placeholder?: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value);
  }, [value, saving]);

  const commit = useCallback(async () => {
    if (saving) return;
    const next = draft.trim();
    const cur = value.trim();
    if (next === cur) return;
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(value);
  }, [draft, value, onCommit, saving]);

  return (
    <input
      disabled={saving}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
        }
      }}
      className="w-full rounded border border-cyan-700/50 bg-black/40 px-2 py-1 text-xs text-cyan-100 focus:outline-none"
    />
  );
}

function EditableDateCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value);
  }, [value, saving]);

  const commit = useCallback(async () => {
    if (saving) return;
    const next = draft.trim();
    const cur = value.trim();
    if (next === cur) return;
    // Terima YYYY-MM-DD atau kosong.
    if (next && !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      setDraft(value);
      return;
    }
    setSaving(true);
    const ok = await onCommit(next);
    setSaving(false);
    if (!ok) setDraft(value);
  }, [draft, value, onCommit, saving]);

  return (
    <input
      type="date"
      disabled={saving}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setDraft(value);
        }
      }}
      className="w-full min-w-[8.5rem] rounded border border-cyan-700/50 bg-black/40 px-2 py-1 text-xs text-cyan-100 focus:outline-none [color-scheme:dark]"
    />
  );
}

function EditableStatusCell({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  return (
    <select
      disabled={saving}
      value={draft}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={async () => {
        const cur = value.trim();
        const next = draft.trim();
        if (next === cur || saving) return;
        setSaving(true);
        const ok = await onCommit(next);
        setSaving(false);
        if (!ok) setDraft(cur);
      }}
      onChange={async (e) => {
        const next = e.target.value.trim();
        setDraft(next);
        if (saving) return;
        setSaving(true);
        const ok = await onCommit(next);
        setSaving(false);
        if (!ok) setDraft(value.trim());
      }}
      className="w-full rounded border border-cyan-700/50 bg-black/40 px-2 py-1 text-xs text-cyan-100 focus:outline-none"
    >
      {!draft ? <option value="">Pilih status</option> : null}
      {TINDAKAN_STATUS.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

function EditableDokterCell({
  value,
  options,
  onCommit,
}: {
  value: string;
  options: string[];
  onCommit: (next: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.trim());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(value.trim());
  }, [value, saving]);

  return (
    <select
      disabled={saving}
      value={draft}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onBlur={async () => {
        const cur = value.trim();
        const next = draft.trim();
        if (next === cur || saving) return;
        setSaving(true);
        const ok = await onCommit(next);
        setSaving(false);
        if (!ok) setDraft(cur);
      }}
      onChange={async (e) => {
        const next = e.target.value.trim();
        setDraft(next);
        if (saving) return;
        setSaving(true);
        const ok = await onCommit(next);
        setSaving(false);
        if (!ok) setDraft(value.trim());
      }}
      className="w-full rounded border border-cyan-700/50 bg-black/40 px-2 py-1 text-xs text-cyan-100 focus:outline-none"
    >
      {!draft ? <option value="">Pilih dokter</option> : null}
      {options.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}

/**
 * Wireframe: **tabel ringkas** di layar utama → klik baris → **drawer bertab**
 * (6 segmen domain + jembatan Pemakaian). Tab domain **bukan** navigasi utama daftar.
 */
export default function TindakanTable({
  adapter,
  filterPasienId = "",
  filterRm = "",
}: {
  adapter: Adapter;
  filterPasienId?: string;
  filterRm?: string;
}) {
  const {
    tindakanList,
    openDetail,
    loading,
    refresh,
    deleteRecord,
    saveEditor,
    createRecord,
    error,
  } = adapter;
  const { show: notify } = useNotification();
  const { confirm: appConfirm } = useAppDialog();

  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cathlabFallbackRows, setCathlabFallbackRows] = useState<
    TindakanJoinResult[]
  >([]);
  const [page, setPage] = useState(1);
  const perPage = 15;
  const [filterDokter, setFilterDokter] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTanggalFrom, setFilterTanggalFrom] = useState("");
  const [filterTanggalTo, setFilterTanggalTo] = useState("");
  const [creatingForPasien, setCreatingForPasien] = useState(false);
  const [lastAutoCreateKey, setLastAutoCreateKey] = useState("");

  const [pasienOptions, setPasienOptions] = useState<PasienOption[]>([]);
  const [pasienLoading, setPasienLoading] = useState(false);
  const [pasienError, setPasienError] = useState<string | null>(null);
  const [pasienLabelByRowId, setPasienLabelByRowId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let cancelled = false;
    setPasienLoading(true);
    setPasienError(null);
    (async () => {
      try {
        const res = await fetch("/api/pasien", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          data?: unknown;
          error?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || "Gagal mengambil data pasien.");
        }
        const rows = Array.isArray(json.data) ? json.data : [];
        const mapped = rows
          .map((r) => (r && typeof r === "object" ? mapApiPasienRow(r as any) : null))
          .filter(Boolean) as PasienOption[];
        if (!cancelled) setPasienOptions(mapped);
      } catch (e) {
        if (!cancelled) {
          setPasienOptions([]);
          setPasienError(extractErrorMessage(e));
        }
      } finally {
        if (!cancelled) setPasienLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [doctorOptionsMaster, setDoctorOptionsMaster] = useState<DoctorOption[]>(
    [],
  );
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorLabelByRowId, setDoctorLabelByRowId] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let cancelled = false;
    setDoctorLoading(true);
    setDoctorError(null);
    (async () => {
      try {
        const res = await fetch("/api/doctors", {
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          doctors?: unknown;
          message?: string;
        };
        if (!res.ok || !json?.ok) {
          throw new Error(json?.message || "Gagal mengambil data dokter.");
        }
        const rows = Array.isArray(json.doctors) ? json.doctors : [];
        const mapped = rows
          .map((r) => (r && typeof r === "object" ? mapApiDoctorRow(r as any) : null))
          .filter((d): d is DoctorOption => Boolean(d && d.nama_dokter));
        if (!cancelled) setDoctorOptionsMaster(mapped);
      } catch (e) {
        if (!cancelled) {
          setDoctorOptionsMaster([]);
          setDoctorError(extractErrorMessage(e));
        }
      } finally {
        if (!cancelled) setDoctorLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dokterOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of tindakanList.length ? tindakanList : cathlabFallbackRows) {
      const d = String(r.dokter ?? "").trim();
      if (d) set.add(d);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [tindakanList, cathlabFallbackRows]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of tindakanList.length ? tindakanList : cathlabFallbackRows) {
      const s = String(r.status ?? "").trim();
      if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "id"));
  }, [tindakanList, cathlabFallbackRows]);

  useEffect(() => {
    const pasienActive = Boolean(filterPasienId.trim() || filterRm.trim());
    if (!pasienActive) {
      setCathlabFallbackRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams();
        if (filterPasienId.trim()) q.set("pasienId", filterPasienId.trim());
        if (filterRm.trim()) q.set("rm", filterRm.trim());
        const url = q.toString()
          ? `/api/cathlab/tindakan-hari-ini?${q.toString()}`
          : "/api/cathlab/tindakan-hari-ini";
        const res = await fetch(url, {
          credentials: "include",
        });
        const json = (await res.json().catch(() => ({}))) as {
          rows?: Array<Record<string, unknown>>;
          mode?: string;
          message?: string;
        };
        if (cancelled) return;
        const rows = Array.isArray(json?.rows) ? json.rows : [];
        setCathlabFallbackRows(
          rows.map((r) => ({
            id: String(r.id ?? ""),
            pasien_id: r.pasien_id != null ? String(r.pasien_id) : null,
            tanggal: r.tanggal != null ? String(r.tanggal) : null,
            waktu: r.waktu != null ? String(r.waktu) : null,
            no_rm: r.no_rm != null ? String(r.no_rm) : null,
            nama_pasien: r.nama_pasien != null ? String(r.nama_pasien) : null,
            dokter: r.dokter != null ? String(r.dokter) : null,
            tindakan:
              r.tindakan != null
                ? String(r.tindakan)
                : r.alkes_utama != null
                  ? String(r.alkes_utama)
                  : null,
            kategori: r.kategori != null ? String(r.kategori) : null,
            status: r.status != null ? String(r.status) : null,
            ruangan: r.ruangan != null ? String(r.ruangan) : null,
          })) as TindakanJoinResult[],
        );
      } catch {
        if (!cancelled) {
          setCathlabFallbackRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterPasienId, filterRm]);

  const filteredRecords = useMemo(() => {
    const merged = [
      ...(tindakanList as TindakanJoinResult[]),
      ...cathlabFallbackRows,
    ];
    const dedupByKey = new Map<string, TindakanJoinResult>();
    for (let idx = 0; idx < merged.length; idx += 1) {
      const row = merged[idx];
      const id = String(row.id ?? "").trim();
      const fallbackKey = [
        String(row.pasien_id ?? "").trim(),
        String(row.no_rm ?? "").trim(),
        String(row.tanggal ?? "").trim(),
        String(row.waktu ?? "").trim(),
        String(row.dokter ?? "").trim(),
        String(row.tindakan ?? "").trim(),
        String(row.status ?? "").trim(),
      ].join("|");
      const key = id || `noid:${fallbackKey || idx}`;
      if (!dedupByKey.has(key)) dedupByKey.set(key, row);
    }
    const fullList = Array.from(dedupByKey.values());
    let list = fullList;
    const pasienId = String(filterPasienId ?? "").trim();
    const rmOrQuery = String(filterRm ?? "").trim();
    const pasienParsed = parsePasienAktifFilter(filterRm);
    if (pasienId) {
      list = list.filter((r) => {
        const idMatch = String(r.pasien_id ?? "").trim() === pasienId;
        if (idMatch) return true;
        // Fallback untuk data legacy yang belum menyimpan pasien_id secara konsisten.
        if (pasienParsed.rm || pasienParsed.nama || pasienParsed.freeText) {
          return rowMatchesPasienAktifFilter(
            r as unknown as Record<string, unknown>,
            pasienParsed,
          );
        }
        return false;
      });
    }
    if (
      !pasienId &&
      (pasienParsed.rm || pasienParsed.nama || pasienParsed.freeText)
    ) {
      list = list.filter((r) =>
        rowMatchesPasienAktifFilter(
          r as unknown as Record<string, unknown>,
          pasienParsed,
        ),
      );
    }
    if (filterDokter) {
      list = list.filter((r) => String(r.dokter ?? "").trim() === filterDokter);
    }
    if (filterStatus) {
      list = list.filter((r) => String(r.status ?? "").trim() === filterStatus);
    }
    if (filterTanggalFrom.trim() || filterTanggalTo.trim()) {
      const from = filterTanggalFrom.trim();
      const to = filterTanggalTo.trim();
      list = list.filter((r) => {
        const t = String(r.tanggal ?? "").trim();
        if (!t) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
        return true;
      });
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => recordSearchHaystack(r).includes(q));
    }
    if ((pasienId || rmOrQuery) && list.length === 0) {
      // Fallback: schema/kolom tindakan antar environment kadang berbeda.
      // Tetap coba tampilkan baris pasien berdasarkan alias kolom umum.
      list = fullList.filter((r) =>
        rowMatchesPasienQueryFallback(r, pasienId, rmOrQuery),
      );
    }
    if ((pasienId || rmOrQuery) && list.length === 0) {
      // Fallback terdalam: cari token pasien di seluruh isi baris.
      list = fullList.filter((r) =>
        rowMatchesPasienDeepFallback(r, pasienId, rmOrQuery),
      );
    }
    return list;
  }, [
    tindakanList,
    filterPasienId,
    filterRm,
    filterDokter,
    filterStatus,
    filterTanggalFrom,
    filterTanggalTo,
    search,
    cathlabFallbackRows,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    search,
    filterPasienId,
    filterRm,
    filterDokter,
    filterStatus,
    filterTanggalFrom,
    filterTanggalTo,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / perPage));

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredRecords.slice(start, start + perPage);
  }, [filteredRecords, page, perPage]);

  const emptyMessage = useMemo(() => {
    const pasienActive = Boolean(filterPasienId.trim() || filterRm.trim());
    const hasAnySourceRows = tindakanList.length > 0 || cathlabFallbackRows.length > 0;
    if (!hasAnySourceRows) {
      return "Belum ada data tindakan di database.";
    }
    if (pasienActive) {
      return "Pasien ini belum memiliki data tindakan.";
    }
    return "Tidak ada baris untuk filter ini.";
  }, [filterPasienId, filterRm, tindakanList.length, cathlabFallbackRows.length]);

  const createDraftForPasien = useCallback(
    async (p: { pasienId: string; rm: string; nama: string }) => {
      const pasienId = String(p.pasienId ?? "").trim();
      const rmResolved = String(p.rm ?? "").trim();
      const namaResolved = String(p.nama ?? "").trim() || (rmResolved ? `Pasien ${rmResolved}` : "Pasien");
      const payload: Record<string, unknown> = {
        tanggal: new Date().toISOString().slice(0, 10),
        pasien_id: pasienId || null,
        no_rm: rmResolved || null,
        nama: namaResolved,
        nama_pasien: namaResolved,
        dokter: "Belum ditentukan",
        tindakan: "Belum diisi",
        status: "Menunggu",
        kategori: "Cathlab",
        ruangan: "Cathlab",
      };
      try {
        await createRecord(payload);
        notify({
          type: "success",
          message: "Pasien ditambahkan dan draft tindakan dibuat.",
          duration: 2800,
        });
      } catch (e) {
        notify({
          type: "error",
          message: extractErrorMessage(e),
          duration: 4200,
        });
      }
    },
    [createRecord, notify],
  );

  const handleCreateForActivePasien = useCallback(async () => {
    const pasienId = filterPasienId.trim();
    const rm = filterRm.trim();
    if (!pasienId && !rm) {
      notify({
        type: "warning",
        message: "Pilih pasien terlebih dahulu.",
        duration: 2500,
      });
      return;
    }
    const rmResolved = rm.trim();
    const namaResolved = rmResolved ? `Pasien ${rmResolved}` : "Pasien";
    const payload: Record<string, unknown> = {
      tanggal: new Date().toISOString().slice(0, 10),
      pasien_id: pasienId || null,
      no_rm: rmResolved || null,
      nama: namaResolved,
      nama_pasien: namaResolved,
      dokter: "Belum ditentukan",
      tindakan: "Belum diisi",
      status: "Menunggu",
      kategori: "Cathlab",
      ruangan: "Cathlab",
    };
    setCreatingForPasien(true);
    try {
      await createRecord(payload);
      notify({
        type: "success",
        message: "Draft tindakan untuk pasien aktif berhasil dibuat.",
        duration: 2800,
      });
    } catch (e) {
      notify({
        type: "error",
        message: extractErrorMessage(e),
        duration: 4200,
      });
    } finally {
      setCreatingForPasien(false);
    }
  }, [createRecord, filterPasienId, filterRm, notify]);

  useEffect(() => {
    const pasienId = filterPasienId.trim();
    const rm = filterRm.trim();
    const pasienActive = Boolean(pasienId || rm);
    if (!pasienActive) return;
    if (loading) return;
    if (creatingForPasien) return;
    if (filteredRecords.length > 0) return;

    const autoKey = `${pasienId}|${rm}`;
    if (!autoKey || autoKey === lastAutoCreateKey) return;
    setLastAutoCreateKey(autoKey);
    void handleCreateForActivePasien();
  }, [
    filterPasienId,
    filterRm,
    loading,
    creatingForPasien,
    filteredRecords.length,
    lastAutoCreateKey,
    handleCreateForActivePasien,
  ]);

  const handleDelete = useCallback(
    async (rowId: string) => {
      if (!rowId) return;
      const ok = await appConfirm({
        title: "Hapus kasus tindakan?",
        message:
          "Kasus ini akan dihapus permanen dari daftar. Data tidak dapat dikembalikan.",
        danger: true,
        confirmLabel: "Hapus",
        cancelLabel: "Batal",
      });
      if (!ok) return;
      setDeletingId(rowId);
      try {
        await deleteRecord(rowId);
        notify({
          type: "success",
          message: "Kasus tindakan dihapus.",
          duration: 2800,
        });
      } catch (e) {
        notify({
          type: "error",
          message:
            e instanceof Error ? e.message : "Gagal menghapus kasus tindakan.",
          duration: 4000,
        });
      } finally {
        setDeletingId(null);
      }
    },
    [appConfirm, deleteRecord, notify],
  );

  const patchRowField = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      if (!id) return false;
      try {
        await saveEditor(id, updates);
        notify({
          type: "success",
          message: "Perubahan tindakan disimpan.",
          duration: 2000,
        });
        return true;
      } catch (e) {
        notify({
          type: "error",
          message: extractErrorMessage(e),
          duration: 4000,
        });
        return false;
      }
    },
    [saveEditor, notify],
  );

  return (
    <TableContainer>
      <div className="flex h-full min-h-[70vh] flex-col">
      <TableToolbar
        onSearch={setSearch}
        onRefresh={refresh}
        onCreateDraftForPasien={createDraftForPasien}
        onFilter={(d, s, from, to) => {
          setFilterDokter(d);
          setFilterStatus(s);
          setFilterTanggalFrom(String(from ?? ""));
          setFilterTanggalTo(String(to ?? ""));
        }}
        onExport={() => {}}
        dokterOptions={dokterOptions}
        statusOptions={statusOptions}
      />

      {error ? (
        <div className="mb-3 rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-200">
          <div className="font-medium">Gagal memuat data tindakan</div>
          <div className="mt-0.5 text-[12px] text-red-200/80">
            {extractErrorMessage(error)}
          </div>
          <div className="mt-2 text-[11px] text-red-200/70 font-mono">
            Sumber: `GET /api/tindakan?limit=8000` (butuh login & Supabase service role).
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex-1 text-cyan-300 text-center py-10 px-6">
          Memuat tindakan…
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-[20rem] overflow-auto rounded-xl border border-cyan-900/35 bg-black/25">
            <table className="w-full min-w-[980px] text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-cyan-800/40 bg-black/80 text-left backdrop-blur">
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 whitespace-nowrap">
                    Tanggal
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 whitespace-nowrap">
                    RM
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 min-w-[10rem]">
                    Nama pasien
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 min-w-[10rem]">
                    Dokter
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 min-w-[10rem]">
                    Tindakan
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-cyan-500/90 whitespace-nowrap text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-cyan-500/70"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <span>{emptyMessage}</span>
                        {Boolean(filterPasienId.trim() || filterRm.trim()) ? (
                          <button
                            type="button"
                            onClick={() => void handleCreateForActivePasien()}
                            disabled={creatingForPasien}
                            className="inline-flex items-center gap-1.5 rounded-md border border-cyan-700/50 bg-cyan-950/30 px-3 py-1.5 text-xs text-cyan-200 transition hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Plus size={13} />
                            {creatingForPasien
                              ? "Membuat draft tindakan..."
                              : "Tambah tindakan pasien aktif"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((rec, i) => {
                    const raw = rec as unknown as Record<string, unknown>;
                    const id = String(raw.id ?? "");
                    const key = id || `row-${page}-${i}`;
                    return (
                      <tr
                        key={key}
                        onClick={(e) => {
                          if (!id) return;
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
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (id) openDetail(id);
                          }
                        }}
                        role={id ? "button" : undefined}
                        tabIndex={id ? 0 : undefined}
                        className={`group border-b border-cyan-900/25 transition-all duration-200 ${
                          id
                            ? "cursor-pointer hover:bg-cyan-950/30 hover:shadow-[inset_2px_0_0_rgba(34,211,238,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-500/50"
                            : "opacity-60"
                        }`}
                      >
                        <td className="px-2 sm:px-4 py-2.5 text-cyan-200/95 whitespace-nowrap font-mono text-xs">
                          <EditableDateCell
                            value={String(rec.tanggal ?? "")}
                            onCommit={async (next) =>
                              patchRowField(id, { tanggal: next || null })
                            }
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 text-cyan-100 font-mono text-xs">
                          {(() => {
                            const p = resolvePasienFromRow(pasienOptions, raw);
                            const rm = String(p?.no_rm ?? "").trim();
                            const labelRm = extractRmFromLabel(
                              pasienLabelByRowId[id] ?? "",
                            );
                            return rm || labelRm || displayRm(raw);
                          })()}
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 text-cyan-100 max-w-[18rem]">
                          <div
                            data-no-row-click="true"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-[10rem] sm:min-w-[14rem]"
                            title={pasienError ?? undefined}
                          >
                            <PasienCombobox
                              listboxId={`tindakan-row-${key}-pasien`}
                              value={
                                pasienLabelByRowId[id] ??
                                buildPasienLabelFromRow(raw) ??
                                ""
                              }
                              onChange={(label) => {
                                setPasienLabelByRowId((p) => ({
                                  ...p,
                                  [id]: label,
                                }));
                              }}
                              onSelectOption={(picked) => {
                                const canonical = formatPasienLabel(picked);
                                setPasienLabelByRowId((p) => ({
                                  ...p,
                                  [id]: canonical,
                                }));
                                void patchRowField(id, {
                                  pasien_id: picked.id,
                                  no_rm: picked.no_rm,
                                  nama_pasien: picked.nama,
                                });
                              }}
                              options={pasienOptions}
                              loading={pasienLoading}
                              className="max-w-[18rem]"
                            />
                            {!pasienLoading && pasienOptions.length === 0 ? (
                              <p className="mt-1 text-[10px] text-cyan-500/70">
                                {pasienError
                                  ? "Gagal memuat pasien."
                                  : "Belum ada pasien di database."}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 text-cyan-300/90 max-w-[14rem]">
                          <div
                            data-no-row-click="true"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                            className="min-w-[10rem] sm:min-w-[12rem]"
                            title={doctorError ?? undefined}
                          >
                            <DoctorCombobox
                              listboxId={`tindakan-row-${key}-doctor`}
                              value={doctorLabelByRowId[id] ?? String(rec.dokter ?? "")}
                              onChange={(label) => {
                                setDoctorLabelByRowId((p) => ({
                                  ...p,
                                  [id]: label,
                                }));
                              }}
                              onSelectOption={(picked) => {
                                const canonical = formatDoctorLabel(picked);
                                setDoctorLabelByRowId((p) => ({
                                  ...p,
                                  [id]: canonical,
                                }));
                                void patchRowField(id, {
                                  dokter: picked.nama_dokter || null,
                                });
                              }}
                              options={doctorOptionsMaster.length ? doctorOptionsMaster : dokterOptions.map((nama, idx) => ({
                                id: `local:${idx}`,
                                nama_dokter: nama,
                                spesialis: null,
                                aktif: true,
                              }))}
                              loading={doctorLoading}
                              className="max-w-[14rem]"
                            />
                            {!doctorLoading && doctorOptionsMaster.length === 0 ? (
                              <p className="mt-1 text-[10px] text-cyan-500/70">
                                {doctorError
                                  ? "Gagal memuat master dokter."
                                  : "Belum ada dokter di master."}
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 text-cyan-200/95 max-w-[14rem]">
                          <EditableInlineCell
                            value={String(rec.tindakan ?? "")}
                            onCommit={async (next) =>
                              patchRowField(id, { tindakan: next || null })
                            }
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2.5 text-cyan-400/95 whitespace-nowrap text-xs">
                          <EditableStatusCell
                            value={String(rec.status ?? "")}
                            onCommit={async (next) =>
                              patchRowField(id, { status: next || null })
                            }
                          />
                        </td>
                        <td
                          className="px-2 sm:px-4 py-2 align-middle"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            <Link
                              href={pemakaianHrefForRow(rec)}
                              className="inline-flex items-center gap-1 rounded-md border border-cyan-800/50 bg-cyan-950/40 px-2 py-1 text-[11px] font-medium text-cyan-200/95 transition-all hover:-translate-y-0.5 hover:border-cyan-600/40 hover:bg-cyan-900/35"
                              title="Input pemakaian barang"
                              aria-label="Pemakaian"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ClipboardList className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              <span className="hidden sm:inline">Pemakaian</span>
                            </Link>
                            <button
                              type="button"
                              disabled={!id || deletingId === id}
                              className="inline-flex items-center gap-1 rounded-md border border-red-900/45 bg-red-950/25 px-2 py-1 text-[11px] font-medium text-red-300/95 transition-all hover:-translate-y-0.5 hover:bg-red-950/45 disabled:pointer-events-none disabled:opacity-40"
                              title="Hapus kasus tindakan"
                              aria-label="Hapus"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDelete(id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 shrink-0 opacity-90" />
                              <span className="hidden sm:inline">Hapus</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="px-2 pt-2 text-[11px] text-cyan-600 font-mono">
            Klik baris → drawer detail (6 tab domain + jembatan Pemakaian).
            Pasien aktif difilter di toolbar daftar kasus.
          </p>

          {filteredRecords.length > perPage && (
            <TablePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
      </div>
    </TableContainer>
  );
}
