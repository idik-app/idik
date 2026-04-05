"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ClipboardList,
  PackagePlus,
  PlusCircle,
  ScanLine,
  Search,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";

import {
  BarangVariantCombobox,
  rowMatchesBarangQuery,
  createBarangVariantIndex,
  useBarangVariantIndex,
  resolvePickRowFromIndexedOptions,
  resolvePickRowFromBarangInput,
  type MasterBarangPickRow,
  type BarangVariantIndex,
} from "@/components/ui/barang-variant-combobox";
import {
  DoctorCombobox,
  canonicalDoctorDisplayValue,
  formatDoctorLabel,
  resolveDoctorFromLooseInput,
  type DoctorOption,
} from "@/components/ui/doctor-combobox";
import {
  PasienCombobox,
  formatPasienLabel,
  type PasienOption,
} from "@/components/ui/pasien-combobox";
import {
  RuanganCombobox,
  type RuanganOption,
} from "@/components/ui/ruangan-combobox";
import { PrintIcon } from "@/components/icons/PrintIcon";
import { useAppDialog } from "@/contexts/AppDialogContext";
import {
  normalizeTemplateInputBarang,
  type TemplateInputBarangPayload,
} from "@/lib/pemakaian/templateInputBarang";
import {
  DISTRIBUTOR_PRODUK_KATEGORI,
  kategoriAlkesFromVariantPickRow,
  normalizeKategoriAlkesLine,
} from "@/lib/distributorCatalog";
import { runDeduped } from "@/lib/api/runDeduped";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  RincianBarangTemplateTabs,
  type RincianBarangTab,
} from "@/app/dashboard/pemakaian/components/RincianBarangTemplateTabs";
import {
  TEMPLATE_KOMPONEN,
  TEMPLATE_OBAT_ALKES,
} from "@/app/dashboard/pemakaian/data/templateInputBarangRows";

const DatetimeLocalPicker = dynamic(
  () =>
    import("@/components/ui/datetime-local-picker").then(
      (m) => m.DatetimeLocalPicker,
    ),
  { ssr: false },
);

const ScanBarcodeQRDialog = dynamic(
  () => import("@/app/dashboard/pemakaian/components/ScanBarcodeQRDialog"),
  { ssr: false },
);

type PemakaianLine = {
  lineId: string;
  barang: string;
  /** STENT | BALLON | WIRE | GUIDING | KATETER (mapping distributor). */
  kategori?: string;
  distributor?: string;
  qtyRencana: number;
  qtyDipakai: number;
  tipe: "N" | "R";
  lot?: string;
  ukuran?: string;
  ed?: string;
  harga?: number;
};

const DEFAULT_DRAWER_DEPO = "Depo Cathlab / Depo Farmasi";

const idrLineFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function formatHargaCell(harga: number | undefined): string {
  if (harga == null || Number.isNaN(harga)) return "—";
  return idrLineFormatter.format(harga);
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hargaFromPickRow(
  v: MasterBarangPickRow,
  options: MasterBarangPickRow[],
): number | undefined {
  if (v.harga_jual != null && Number.isFinite(Number(v.harga_jual))) {
    return Number(v.harga_jual);
  }
  const mid = v.master_barang_id;
  for (const r of options) {
    if (r.master_barang_id !== mid) continue;
    if (r.harga_jual != null && Number.isFinite(Number(r.harga_jual))) {
      return Number(r.harga_jual);
    }
  }
  return undefined;
}

function narrowByLineFields(
  candidates: MasterBarangPickRow[],
  line: Pick<PemakaianLine, "distributor" | "lot" | "ukuran" | "ed">,
): MasterBarangPickRow[] {
  if (candidates.length <= 1) return candidates;
  const L = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
  let filtered = candidates;
  const lot = L(line.lot);
  const uk = L(line.ukuran);
  const ed = L(line.ed);
  const dist = L(line.distributor);
  if (lot) {
    const f = filtered.filter((v) => L(v.lot) === lot);
    if (f.length) filtered = f;
  }
  if (uk) {
    const f = filtered.filter((v) => L(v.ukuran) === uk);
    if (f.length) filtered = f;
  }
  if (ed) {
    const f = filtered.filter((v) => L(v.ed) === ed);
    if (f.length) filtered = f;
  }
  if (dist) {
    const f = filtered.filter((v) => L(v.distributor_nama) === dist);
    if (f.length) filtered = f;
  }
  return filtered.length ? filtered : candidates;
}

function resolveHargaFromBarangInput(
  label: string,
  options: MasterBarangPickRow[],
  line?: Pick<PemakaianLine, "distributor" | "lot" | "ukuran" | "ed">,
  index?: BarangVariantIndex,
): number | undefined {
  const q = label.trim().toLowerCase();
  if (!q) return undefined;

  const row = index 
    ? resolvePickRowFromIndexedOptions(q, index, options, line)
    : resolvePickRowFromBarangInput(q, options, line);

  if (row) return hargaFromPickRow(row, options);
  return undefined;
}

function resolveDistributorFromBarangInput(
  label: string,
  options: MasterBarangPickRow[],
  line?: Pick<PemakaianLine, "distributor" | "lot" | "ukuran" | "ed">,
  index?: BarangVariantIndex,
): string | undefined {
  const q = label.trim().toLowerCase();
  if (!q) return undefined;

  const row = index 
    ? resolvePickRowFromIndexedOptions(q, index, options, line)
    : resolvePickRowFromBarangInput(q, options, line);

  if (row?.distributor_nama?.trim()) return row.distributor_nama.trim();
  return undefined;
}

function newDrawerLineId() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function orderTanggalToDatetimeLocal(tanggal: string): string {
  const t = tanggal.trim();
  if (!t) return toDatetimeLocalValue(new Date());
  const m = t.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})/);
  if (m) return `${m[1]}T${m[2]}:${m[3]}`;
  const dOnly = t.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dOnly) return `${dOnly[1]}T00:00`;
  try {
    const dt = new Date(t.replace(" ", "T"));
    if (!Number.isNaN(dt.getTime())) return toDatetimeLocalValue(dt);
  } catch {
    /* ignore */
  }
  return toDatetimeLocalValue(new Date());
}

function linesFromOrderItemsJson(raw: unknown): PemakaianLine[] {
  const out: PemakaianLine[] = [];
  if (!Array.isArray(raw)) return out;
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const lineId =
      typeof o.lineId === "string" && o.lineId.trim()
        ? o.lineId.trim()
        : newDrawerLineId();
    const barang =
      typeof o.barang === "string" ? o.barang : String(o.barang ?? "");
    if (!barang.trim()) continue;
    const hargaParsed = (() => {
      const h = o.harga;
      if (typeof h === "number" && Number.isFinite(h)) return h;
      if (typeof h === "string" && h.trim()) {
        const n = Number(h);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    })();
    const kategori = normalizeKategoriAlkesLine(o.kategori);
    out.push({
      lineId,
      barang,
      ...(kategori ? { kategori } : {}),
      distributor:
        typeof o.distributor === "string" ? o.distributor : undefined,
      qtyRencana:
        typeof o.qtyRencana === "number"
          ? o.qtyRencana
          : Number(o.qtyRencana) || 0,
      qtyDipakai:
        typeof o.qtyDipakai === "number"
          ? o.qtyDipakai
          : Number(o.qtyDipakai) || 0,
      tipe: (o.tipe === "R" || o.tipe === "REUSE") ? "R" : "N",
      lot: typeof o.lot === "string" ? o.lot : undefined,
      ukuran: typeof o.ukuran === "string" ? o.ukuran : undefined,
      ed: typeof o.ed === "string" ? o.ed : undefined,
      ...(hargaParsed !== undefined ? { harga: hargaParsed } : {}),
    });
  }
  return out;
}

function cleanFormText(s: string): string {
  return s
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();
}

function LabeledField({
  label,
  children,
  errorMessage,
}: {
  label: string;
  children: React.ReactNode;
  /** Pesan validasi ringkas di bawah field (mis. wajib isi). */
  errorMessage?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-white/85">
      <span className="font-semibold text-white/90">{label}</span>
      {children}
      {errorMessage ? (
        <span
          className="text-[10px] font-medium text-amber-200 dark:text-amber-200"
          role="alert"
        >
          {errorMessage}
        </span>
      ) : null}
    </label>
  );
}

export type PemakaianAlkesModalProps = {
  open: boolean;
  onClose: () => void;
  pasienOptions: PasienOption[];
  doctorOptions: DoctorOption[];
  pasienLoading: boolean;
  doctorLoading: boolean;
  initialPasienLabel: string;
  initialDokter: string;
  initialRuangan: string;
  tindakanId?: string | null;
  /** Order terkait (dari `tindakan_id` atau fallback pasien+tanggal di tabel Tindakan). */
  initialPemakaianOrderId?: string | null;
  /** Dipanggil setelah POST/PATCH order berhasil (untuk refresh indeks di tabel Tindakan). */
  onSaved?: () => void;
};

export default function PemakaianAlkesModal({
  open,
  onClose,
  pasienOptions,
  doctorOptions,
  pasienLoading,
  doctorLoading,
  initialPasienLabel,
  initialDokter,
  initialRuangan,
  tindakanId,
  initialPemakaianOrderId,
  onSaved,
}: PemakaianAlkesModalProps) {
  const { alert: appAlert, confirm: appConfirm } = useAppDialog();

  const doctorOptionsRef = useRef(doctorOptions);
  doctorOptionsRef.current = doctorOptions;

  const [drawerPasien, setDrawerPasien] = useState("");
  const [drawerDokter, setDrawerDokter] = useState("");
  const [drawerDepo, setDrawerDepo] = useState(DEFAULT_DRAWER_DEPO);
  const [drawerRuangan, setDrawerRuangan] = useState("");
  const [drawerDateTime, setDrawerDateTime] = useState("");
  const [drawerLines, setDrawerLines] = useState<PemakaianLine[]>([]);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerFocusLineId, setDrawerFocusLineId] = useState<string | null>(
    null,
  );
  /** Highlight field wajib setelah submit gagal (header). */
  const [dokterFieldInvalid, setDokterFieldInvalid] = useState(false);
  const [ruanganFieldInvalid, setRuanganFieldInvalid] = useState(false);
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [editingTemplateInputBarang, setEditingTemplateInputBarang] =
    useState<TemplateInputBarangPayload>(() =>
      normalizeTemplateInputBarang(undefined),
    );
  const [rincianBarangTab, setRincianBarangTab] =
    useState<RincianBarangTab>("struk");

  const [ruanganList, setRuanganList] = useState<RuanganOption[]>([]);
  const [ruanganListLoading, setRuanganListLoading] = useState(false);

  const [barangVariantList, setBarangVariantList] = useState<
    MasterBarangPickRow[]
  >([]);
  const barangVariantIndex = useBarangVariantIndex(barangVariantList);
  const [barangVariantLoading, setBarangVariantLoading] = useState(false);
  const [barangPickerOpen, setBarangPickerOpen] = useState(false);
  const [barangPickerQuery, setBarangPickerQuery] = useState("");
  const [barangScanOpen, setBarangScanOpen] = useState(false);
  const [tambahProdukOpen, setTambahProdukOpen] = useState(false);
  const [tambahProdukDraft, setTambahProdukDraft] = useState("");

  const resetFormFromProps = useCallback(() => {
    const firstId = newDrawerLineId();
    setDrawerPasien(initialPasienLabel.trim());
    setDrawerDokter(initialDokter.trim());
    setDrawerRuangan(initialRuangan.trim());
    setDrawerDepo(DEFAULT_DRAWER_DEPO);
    setDrawerDateTime(toDatetimeLocalValue(new Date()));
    setDrawerLines([
      {
        lineId: firstId,
        barang: "",
        distributor: "",
        qtyRencana: 1,
        qtyDipakai: 0,
        tipe: "N",
      },
    ]);
    setDrawerFocusLineId(firstId);
    setDrawerSaving(false);
    setBarangPickerOpen(false);
    setBarangPickerQuery("");
    setBarangScanOpen(false);
    setTambahProdukOpen(false);
    setTambahProdukDraft("");
    setExistingOrderId(null);
    setEditingTemplateInputBarang(normalizeTemplateInputBarang(undefined));
    setRincianBarangTab("struk");
    setDokterFieldInvalid(false);
    setRuanganFieldInvalid(false);
  }, [initialPasienLabel, initialDokter, initialRuangan]);

  const bootstrapSeqRef = useRef(0);

  /** Jika master dokter termuat setelah form terisi (panggilan/singkat → nama lengkap). */
  useEffect(() => {
    if (!open || doctorOptions.length === 0) return;
    setDrawerDokter((prev) => {
      const t = prev.trim();
      if (!t) return prev;
      const next = canonicalDoctorDisplayValue(doctorOptions, t);
      return next !== t ? next : prev;
    });
  }, [open, doctorOptions]);

  useEffect(() => {
    if (!open) {
      setExistingOrderId(null);
      setEditingTemplateInputBarang(normalizeTemplateInputBarang(undefined));
      return;
    }

    const seq = ++bootstrapSeqRef.current;
    const tid = tindakanId?.trim() ?? "";
    const orderIdHint = initialPemakaianOrderId?.trim() ?? "";

    function hydrateFromOrderRecord(first: Record<string, unknown>) {
      const oid = typeof first.id === "string" ? first.id.trim() : "";
      if (!oid) return false;
      setDrawerPasien(String(first.pasien ?? "").trim());
      setDrawerDokter(
        canonicalDoctorDisplayValue(
          doctorOptionsRef.current,
          String(first.dokter ?? "").trim(),
        ),
      );
      setDrawerRuangan(String(first.ruangan ?? "").trim());
      setDrawerDepo(String(first.depo ?? "").trim() || DEFAULT_DRAWER_DEPO);
      setDrawerDateTime(
        orderTanggalToDatetimeLocal(String(first.tanggal ?? "")),
      );
      const parsed = linesFromOrderItemsJson(first.items);
      if (parsed.length > 0) {
        setDrawerLines(parsed);
        setDrawerFocusLineId(parsed[0].lineId);
      } else {
        const firstId = newDrawerLineId();
        setDrawerLines([
          {
            lineId: firstId,
            barang: "",
            distributor: "",
            qtyRencana: 1,
            qtyDipakai: 0,
            tipe: "N",
          },
        ]);
        setDrawerFocusLineId(firstId);
      }
      setEditingTemplateInputBarang(
        normalizeTemplateInputBarang(first.template_input_barang),
      );
      setRincianBarangTab("struk");
      setExistingOrderId(oid);
      setDrawerSaving(false);
      setBarangPickerOpen(false);
      setBarangPickerQuery("");
      setBarangScanOpen(false);
      return true;
    }

    const enrichFromTindakanApi = async () => {
      if (!tid) return;
      try {
        const j = await runDeduped(
          `GET:/api/tindakan/${encodeURIComponent(tid)}`,
          async () => {
            const res = await fetch(
              `/api/tindakan/${encodeURIComponent(tid)}`,
              {
                credentials: "include",
                cache: "no-store",
              },
            );
            return (await res.json()) as {
              ok?: boolean;
              data?: {
                dokter?: string | null;
                ruangan?: string | null;
                tindakan?: string | null;
                tanggal?: string | null;
                pasien_id?: string | null;
              };
            };
          },
        );
        if (seq !== bootstrapSeqRef.current || !j?.ok || !j.data) return;
        const d = j.data;
        setDrawerDokter((prev) =>
          prev.trim()
            ? prev
            : canonicalDoctorDisplayValue(
                doctorOptionsRef.current,
                String(d.dokter ?? "").trim(),
              ),
        );
        setDrawerRuangan((prev) =>
          prev.trim() ? prev : String(d.ruangan ?? "").trim(),
        );
        const pid =
          typeof d.pasien_id === "string" && d.pasien_id.trim()
            ? d.pasien_id.trim()
            : null;
        if (pid && pasienOptions.length > 0) {
          const p = pasienOptions.find((x) => x.id === pid);
          if (p) {
            setDrawerPasien((prev) =>
              prev.trim() ? prev : formatPasienLabel(p),
            );
          }
        }

        if (d.tanggal) {
          setDrawerDateTime(orderTanggalToDatetimeLocal(String(d.tanggal)));
        }
      } catch {
        /* ignore */
      }
    };

    void (async () => {
      if (orderIdHint) {
        try {
          const j = await runDeduped(
            `GET:/api/pemakaian-orders/${encodeURIComponent(orderIdHint)}`,
            async () => {
              const res = await fetch(
                `/api/pemakaian-orders/${encodeURIComponent(orderIdHint)}`,
                { credentials: "include", cache: "no-store" },
              );
              return (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                order?: Record<string, unknown>;
              };
            },
          );
          if (seq !== bootstrapSeqRef.current) return;
          const ord =
            j?.ok && j.order && typeof j.order === "object" ? j.order : null;
          if (ord && hydrateFromOrderRecord(ord)) return;
        } catch {
          /* lanjut */
        }
      }

      if (tid) {
        try {
          const j = await runDeduped(
            `GET:/api/pemakaian-orders?tindakanId=${encodeURIComponent(tid)}`,
            async () => {
              const res = await fetch(
                `/api/pemakaian-orders?tindakanId=${encodeURIComponent(tid)}`,
                { credentials: "include", cache: "no-store" },
              );
              return (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                orders?: Array<Record<string, unknown>>;
              };
            },
          );
          if (seq !== bootstrapSeqRef.current) return;
          const list = Array.isArray(j?.orders) ? j.orders : [];
          const first = list[0];
          if (
            first &&
            typeof first === "object" &&
            hydrateFromOrderRecord(first as Record<string, unknown>)
          ) {
            return;
          }
        } catch {
          /* lanjut mode baru */
        }
      }

      if (seq !== bootstrapSeqRef.current) return;
      resetFormFromProps();
      await enrichFromTindakanApi();
    })();
  }, [
    open,
    tindakanId,
    initialPemakaianOrderId,
    initialPasienLabel,
    initialDokter,
    initialRuangan,
    resetFormFromProps,
  ]);

  /** Isi label pasien dari `pasien_id` kasus setelah master pasien siap (mode baru tanpa order). */
  useEffect(() => {
    if (!open || !tindakanId?.trim() || existingOrderId) return;
    if (pasienOptions.length === 0) return;
    const tid = tindakanId.trim();
    let cancelled = false;
    void (async () => {
      try {
        const j = await runDeduped(
          `GET:/api/tindakan/${encodeURIComponent(tid)}`,
          async () => {
            const res = await fetch(
              `/api/tindakan/${encodeURIComponent(tid)}`,
              {
                credentials: "include",
                cache: "no-store",
              },
            );
            return (await res.json()) as {
              ok?: boolean;
              data?: { pasien_id?: string | null };
            };
          },
        );
        if (cancelled || !j?.ok || !j.data) return;
        const pid =
          typeof j.data.pasien_id === "string" && j.data.pasien_id.trim()
            ? j.data.pasien_id.trim()
            : null;
        if (!pid) return;
        const p = pasienOptions.find((x) => x.id === pid);
        if (p) {
          setDrawerPasien((prev) =>
            prev.trim() ? prev : formatPasienLabel(p),
          );
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tindakanId, existingOrderId, pasienOptions]);

  /** Satu gelombang paralel: ruangan + katalog variant (hindari dua effect terpisah mengantre). */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setRuanganListLoading(true);
    setBarangVariantLoading(true);
    void (async () => {
      const [ruOutcome, vrOutcome] = await Promise.allSettled([
        runDeduped("GET:/api/ruangan", async () => {
          const r = await fetch("/api/ruangan", {
            credentials: "include",
            cache: "no-store",
          });
          return r.json() as Promise<{
            ok?: boolean;
            ruangan?: RuanganOption[];
          }>;
        }),
        runDeduped("GET:/api/master-barang/variants", async () => {
          const r = await fetch("/api/master-barang/variants", {
            credentials: "include",
            cache: "no-store",
          });
          return r.json() as Promise<{
            ok?: boolean;
            items?: MasterBarangPickRow[];
          }>;
        }),
      ]);
      if (!alive) return;
      if (ruOutcome.status === "fulfilled") {
        const j = ruOutcome.value;
        if (j?.ok && Array.isArray(j.ruangan)) setRuanganList(j.ruangan);
        else setRuanganList([]);
      } else {
        setRuanganList([]);
      }
      if (vrOutcome.status === "fulfilled") {
        const j = vrOutcome.value;
        if (j?.ok && Array.isArray(j.items)) setBarangVariantList(j.items);
        else setBarangVariantList([]);
      } else {
        setBarangVariantList([]);
      }
    })().finally(() => {
      if (alive) {
        setRuanganListLoading(false);
        setBarangVariantLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [open]);

  function patchDrawerLine(lineId: string, patch: Partial<PemakaianLine>) {
    setDrawerLines((rows) =>
      rows.map((l) => {
        if (l.lineId !== lineId) return l;
        const next = { ...l, ...patch };
        if (!next.barang.trim()) return { ...next, harga: undefined };
        if (patch.harga !== undefined) return next;
        const h = resolveHargaFromBarangInput(
          next.barang,
          barangVariantList,
          next,
          barangVariantIndex,
        );
        if (h !== undefined) return { ...next, harga: h };
        return next;
      }),
    );
  }

  function removeDrawerLine(lineId: string) {
    setDrawerLines((rows) => {
      const next = rows.filter((l) => l.lineId !== lineId);
      return next.length > 0
        ? next
        : [
            {
              lineId: newDrawerLineId(),
              barang: "",
              distributor: "",
              qtyRencana: 1,
              qtyDipakai: 0,
              tipe: "N",
            },
          ];
    });
  }

  useEffect(() => {
    if (!open || barangVariantList.length === 0) return;
    setDrawerLines((rows) => {
      let changed = false;
      const next = rows.map((line) => {
        if (line.harga != null && Number.isFinite(line.harga)) return line;
        if (!line.barang.trim()) return line;
        const h = resolveHargaFromBarangInput(
          line.barang,
          barangVariantList,
          line,
          barangVariantIndex,
        );
        if (h === undefined) return line;
        changed = true;
        return { ...line, harga: h };
      });
      return changed ? next : rows;
    });
  }, [open, barangVariantList, barangVariantIndex]);

  const patchTemplateObatAlkes = useCallback((id: string, value: string) => {
    setEditingTemplateInputBarang((prev) => ({
      ...prev,
      obatAlkes: { ...prev.obatAlkes, [id]: value },
    }));
  }, []);

  const patchTemplateKomponen = useCallback((id: string, value: string) => {
    setEditingTemplateInputBarang((prev) => ({
      ...prev,
      komponen: { ...prev.komponen, [id]: value },
    }));
  }, []);

  const closeBarangPicker = useCallback(() => {
    setBarangPickerOpen(false);
    setBarangPickerQuery("");
    setBarangScanOpen(false);
  }, []);

  const openTambahProdukModal = useCallback((draft: string) => {
    setTambahProdukDraft(draft);
    // Tunda satu task agar mouseup/click tidak mengenai backdrop modal baru (z tinggi) dan langsung menutup.
    window.setTimeout(() => {
      setTambahProdukOpen(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (drawerSaving) return;
      if (barangScanOpen) {
        e.preventDefault();
        setBarangScanOpen(false);
        return;
      }
      if (tambahProdukOpen) {
        e.preventDefault();
        setTambahProdukOpen(false);
        return;
      }
      if (barangPickerOpen) {
        e.preventDefault();
        closeBarangPicker();
        return;
      }
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    open,
    drawerSaving,
    barangScanOpen,
    tambahProdukOpen,
    barangPickerOpen,
    closeBarangPicker,
    onClose,
  ]);

  function addEmptyLineFromPicker() {
    const suffix = Date.now().toString(36);
    const nextId = `draft-new-${suffix}`;
    setDrawerLines((rows) => [
      ...rows,
      {
        lineId: nextId,
        barang: "",
        distributor: "",
        qtyRencana: 1,
        qtyDipakai: 0,
        tipe: "N",
      },
    ]);
    setDrawerFocusLineId(nextId);
    closeBarangPicker();
  }

  function applyBarangPick(pick: MasterBarangPickRow) {
    const suffix = Date.now().toString(36);
    const hPick = hargaFromPickRow(pick, barangVariantList);
    const kCat = kategoriAlkesFromVariantPickRow(pick);
    const nextId = `draft-new-${suffix}`;
    const line: PemakaianLine = {
      lineId: nextId,
      barang: pick.nama.trim(),
      ...(kCat ? { kategori: kCat } : {}),
      distributor: pick.distributor_nama?.trim() || undefined,
      qtyRencana: 1,
      qtyDipakai: 0,
      tipe: "N",
      lot: pick.lot?.trim() || undefined,
      ukuran: pick.ukuran?.trim() || undefined,
      ed: pick.ed?.trim() || undefined,
      ...(hPick !== undefined ? { harga: hPick } : {}),
    };
    setDrawerLines((rows) => [...rows, line]);
    setDrawerFocusLineId(nextId);
    closeBarangPicker();
  }

  function handleBarangScanDecoded(text: string) {
    const raw = text.trim();
    if (!raw) return;
    setBarangScanOpen(false);
    const q = raw.toLowerCase();
    const byBarcode = barangVariantList.find(
      (v) => v.barcode?.trim().toLowerCase() === q,
    );
    if (byBarcode) {
      applyBarangPick(byBarcode);
      return;
    }
    const matches = barangVariantList.filter((v) =>
      rowMatchesBarangQuery(v, raw),
    );
    if (matches.length === 1) {
      applyBarangPick(matches[0]);
      return;
    }
    setBarangPickerQuery(raw);
  }

  const filteredBarangPicks = useMemo(() => {
    const raw = barangPickerQuery.trim();
    if (!raw) return barangVariantList;
    return barangVariantList.filter((v) => rowMatchesBarangQuery(v, raw));
  }, [barangPickerQuery, barangVariantList]);

  function handlePrint() {
    window.print();
  }

  const printOnlyUi = (
    <div className="hidden print:block print:fixed print:inset-0 print:z-[9999] print:bg-white print:text-black print:p-8 text-[12pt] print-area">
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Logo atau Identitas RS bisa ditambahkan di sini */}
          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              Instalasi Diagnostik Intervensi Kardiovaskular
            </h1>
            <h2 className="text-lg font-semibold uppercase">
              RSUD dr. M. Soewandhie - Surabaya
            </h2>
          </div>
        </div>
        <h3 className="text-md font-bold uppercase border-t-2 border-black pt-2 w-full mt-2">
          Catatan Pemakaian Alkes & Obat-Obatan
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-y-2 mb-6 text-sm">
        <div className="flex">
          <span className="w-32 font-semibold">Nama Pasien</span>
          <span className="mr-2">:</span>
          <span className="flex-1 border-b border-gray-300 min-h-[1.2rem]">
            {drawerPasien}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 font-semibold">Tanggal / Jam</span>
          <span className="mr-2">:</span>
          <span className="flex-1 border-b border-gray-300 min-h-[1.2rem]">
            {drawerDateTime
              ? new Date(drawerDateTime).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—"}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 font-semibold">Dokter Operator</span>
          <span className="mr-2">:</span>
          <span className="flex-1 border-b border-gray-300 min-h-[1.2rem]">
            {drawerDokter}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 font-semibold">Ruangan</span>
          <span className="mr-2">:</span>
          <span className="flex-1 border-b border-gray-300 min-h-[1.2rem]">
            {drawerRuangan}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 font-semibold">Depo</span>
          <span className="mr-2">:</span>
          <span className="flex-1 border-b border-gray-300 min-h-[1.2rem]">
            {drawerDepo}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-bold mb-2 uppercase text-xs tracking-wider border-b border-black pb-1">
          Daftar Barang Alkes
        </h3>
        <table className="w-full border-collapse border border-black text-[10pt]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black px-2 py-1 text-center w-8">
                No
              </th>
              <th className="border border-black px-2 py-1 text-left">
                Nama Barang
              </th>
              <th className="border border-black px-2 py-1 text-left">
                Kategori
              </th>
              <th className="border border-black px-2 py-1 text-left">
                LOT / Ukuran
              </th>
              <th className="border border-black px-2 py-1 text-center w-16">
                Resep
              </th>
              <th className="border border-black px-2 py-1 text-center w-16">
                Pakai
              </th>
              <th className="border border-black px-2 py-1 text-center w-20">
                Tipe
              </th>
            </tr>
          </thead>
          <tbody>
            {drawerLines
              .filter((l) => l.barang.trim())
              .map((line, idx) => (
                <tr key={line.lineId}>
                  <td className="border border-black px-2 py-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {line.barang}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {line.kategori || "—"}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {[
                      line.lot && `L:${line.lot}`,
                      line.ukuran && `U:${line.ukuran}`,
                    ]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </td>
                  <td className="border border-black px-2 py-1 text-center">
                    {line.qtyRencana}
                  </td>
                  <td className="border border-black px-2 py-1 text-center font-semibold">
                    {line.qtyDipakai}
                  </td>
                  <td className="border border-black px-2 py-1 text-center text-xs">
                    {line.tipe}
                  </td>
                </tr>
              ))}
            {drawerLines.filter((l) => l.barang.trim()).length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="border border-black px-2 py-4 text-center text-gray-500 italic"
                >
                  Tidak ada data barang terinput.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(() => {
        const hasObat = TEMPLATE_OBAT_ALKES.some(
          (row) =>
            (editingTemplateInputBarang.obatAlkes[row.id] || "")
              .replace(/\|/g, "")
              .trim().length > 0,
        );
        const hasKomponen = TEMPLATE_KOMPONEN.some(
          (row) =>
            (editingTemplateInputBarang.komponen[row.id] || "")
              .replace(/\|/g, "")
              .trim().length > 0,
        );

        if (!hasObat && !hasKomponen) return null;

        return (
          <div className="grid grid-cols-2 gap-4 mb-6">
            {hasObat && (
              <div>
                <h3 className="font-bold mb-2 uppercase text-[9pt] border-b border-black">
                  Obat / Alkes (Template)
                </h3>
                <table className="w-full border-collapse border border-black text-[9pt]">
                  <thead>
                    <tr className="bg-gray-50 text-[8pt]">
                      <th className="border border-black px-2 py-0.5 text-left">
                        Item
                      </th>
                      <th className="border border-black px-2 py-0.5 text-center w-16">
                        Jumlah
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEMPLATE_OBAT_ALKES.filter(
                      (row) =>
                        (editingTemplateInputBarang.obatAlkes[row.id] || "")
                          .replace(/\|/g, "")
                          .trim().length > 0,
                    ).map((row) => (
                      <tr key={row.id}>
                        <td className="border border-black px-2 py-0.5">
                          {row.label}
                        </td>
                        <td className="border border-black px-2 py-0.5 text-center">
                          {editingTemplateInputBarang.obatAlkes[row.id].replace(
                            /\|/g,
                            " / ",
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasKomponen && (
              <div>
                <h3 className="font-bold mb-2 uppercase text-[9pt] border-b border-black">
                  Komponen (Template)
                </h3>
                <table className="w-full border-collapse border border-black text-[9pt]">
                  <thead>
                    <tr className="bg-gray-50 text-[8pt]">
                      <th className="border border-black px-2 py-0.5 text-left">
                        Item
                      </th>
                      <th className="border border-black px-2 py-0.5 text-center w-16">
                        Jumlah
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {TEMPLATE_KOMPONEN.filter(
                      (row) =>
                        (editingTemplateInputBarang.komponen[row.id] || "")
                          .replace(/\|/g, "")
                          .trim().length > 0,
                    ).map((row) => (
                      <tr key={row.id}>
                        <td className="border border-black px-2 py-0.5">
                          {row.label}
                        </td>
                        <td className="border border-black px-2 py-0.5 text-center">
                          {editingTemplateInputBarang.komponen[row.id].replace(
                            /\|/g,
                            " / ",
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      <div className="mt-12 grid grid-cols-3 gap-8 text-center text-sm">
        <div>
          <p className="mb-16">Perawat / Petugas,</p>
          <div className="border-b border-black w-40 mx-auto"></div>
          <p className="mt-1 text-xs text-gray-500">( Nama Terang )</p>
        </div>
        <div></div>
        <div>
          <p className="mb-16">Dokter Operator,</p>
          <div className="border-b border-black w-40 mx-auto"></div>
          <p className="mt-1 font-semibold">
            {drawerDokter || "( Nama Terang )"}
          </p>
        </div>
      </div>

      <div className="fixed bottom-4 right-8 text-[8pt] italic text-gray-400 print:block hidden">
        Dicetak otomatis oleh Sistem IDIK Cathlab pada{" "}
        {new Date().toLocaleString("id-ID")}
      </div>
    </div>
  );

  async function submitDrawerPemakaian() {
    if (drawerSaving) return;
    setDokterFieldInvalid(false);
    setRuanganFieldInvalid(false);
    const pasien = cleanFormText(drawerPasien);
    const dokterRaw = cleanFormText(drawerDokter);
    const ruanganRaw = cleanFormText(drawerRuangan);
    const dokterResolved =
      doctorOptions.length > 0
        ? resolveDoctorFromLooseInput(doctorOptions, dokterRaw)
        : null;
    const dokter = dokterResolved
      ? String(dokterResolved.nama_dokter).trim()
      : dokterRaw;
    const dokterKonfirmasi = dokterResolved
      ? formatDoctorLabel(dokterResolved)
      : dokterRaw;
    let depo = cleanFormText(drawerDepo);
    if (!depo) depo = DEFAULT_DRAWER_DEPO;

    const missing: string[] = [];
    if (!pasien) missing.push("Pasien");
    if (!dokterRaw) missing.push("Dokter / Operator");
    if (!ruanganRaw) missing.push("Ruangan");
    if (!depo) missing.push("Depo");
    if (missing.length > 0) {
      setDokterFieldInvalid(!dokterRaw);
      setRuanganFieldInvalid(!ruanganRaw);
      void appAlert({
        variant: "warning",
        title: "Data belum lengkap",
        message:
          `Mohon isi: ${missing.join(", ")}.\n\n` +
          "Tips: teks yang terlihat di kolom harus Anda ketik atau pilih dari daftar (bukan hanya placeholder abu-abu).",
      });
      return;
    }

    const hasBarang = drawerLines.some(
      (l) => cleanFormText(l.barang).length > 0,
    );
    if (!hasBarang) {
      void appAlert({
        variant: "warning",
        message:
          "Tambah minimal satu baris dengan nama barang terisi di kolom Barang.",
      });
      return;
    }

    const nBarang = drawerLines.filter(
      (l) => cleanFormText(l.barang).length > 0,
    ).length;
    const ruangan = ruanganRaw;
    const isEdit = Boolean(existingOrderId?.trim());
    const konfirmasi = isEdit
      ? `Simpan perubahan order pemakaian?\n\n` +
        `• Pasien: ${pasien}\n` +
        `• Ruangan: ${ruangan}\n` +
        `• Dokter: ${dokterKonfirmasi}\n` +
        `• Depo: ${depo}\n` +
        `• ${nBarang} jenis barang`
      : `Kirim order ke Depo Farmasi?\n\n` +
        `• Pasien: ${pasien}\n` +
        `• Ruangan: ${ruangan}\n` +
        `• Dokter: ${dokterKonfirmasi}\n` +
        `• Depo: ${depo}\n` +
        `• ${nBarang} jenis barang\n\n` +
        `Order juga akan diteruskan ke distributor sesuai barang.\n` +
        `Status akan diset “menunggu validasi Depo”.`;
    const okSubmit = await appConfirm({
      title: isEdit ? "Simpan perubahan?" : "Kirim ke Depo + Distributor?",
      message: konfirmasi,
      confirmLabel: isEdit ? "Simpan" : "Simpan & kirim semua",
      cancelLabel: "Batal",
    });
    if (!okSubmit) return;

    const itemsPayload = drawerLines
      .filter((l) => cleanFormText(l.barang).length > 0)
      .map((line) => {
        const distributorManual = cleanFormText(line.distributor ?? "");
        const distributorResolved = distributorManual
          ? distributorManual
          : resolveDistributorFromBarangInput(
              line.barang,
              barangVariantList,
              {
                distributor: line.distributor,
                lot: line.lot,
                ukuran: line.ukuran,
                ed: line.ed,
              },
              barangVariantIndex,
            );
        return {
          ...line,
          distributor: distributorResolved || undefined,
        };
      });

    setDrawerSaving(true);
    try {
      if (isEdit && existingOrderId) {
        const res = await fetch(
          `/api/pemakaian-orders/${encodeURIComponent(existingOrderId)}`,
          {
            method: "PATCH",
            credentials: "include",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tanggal: drawerDateTime,
              pasien,
              ruangan,
              dokter,
              depo,
              items: itemsPayload,
              templateInputBarang: editingTemplateInputBarang,
            }),
          },
        );
        const j = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: string;
        };
        if (!res.ok || !j?.ok) {
          void appAlert({
            variant: "error",
            message:
              typeof j?.message === "string"
                ? j.message
                : `Gagal menyimpan (HTTP ${res.status}).`,
          });
          return;
        }
        onSaved?.();
        onClose();
        void appAlert({
          variant: "success",
          title: "Perubahan disimpan",
          message: `Order ${existingOrderId} telah diperbarui.`,
        });
        return;
      }

      const res = await fetch("/api/pemakaian-orders", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "PEMAKAIAN",
          tanggal: drawerDateTime,
          pasien,
          ruangan,
          dokter,
          depo,
          items: itemsPayload,
          ...(tindakanId?.trim() ? { tindakanId: tindakanId.trim() } : {}),
          templateInputBarang: editingTemplateInputBarang,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        order?: { id?: string };
      };
      if (!res.ok || !j?.ok) {
        void appAlert({
          variant: "error",
          message:
            typeof j?.message === "string"
              ? j.message
              : `Gagal menyimpan (HTTP ${res.status}).`,
        });
        return;
      }
      const oid = typeof j.order?.id === "string" ? j.order.id : "";
      onSaved?.();
      onClose();
      void appAlert({
        variant: "success",
        title: "Order tersimpan",
        message: oid
          ? `Order ${oid} dikirim ke Depo Farmasi dan distributor terkait barang (status: menunggu validasi).`
          : "Order dikirim ke Depo Farmasi dan distributor terkait barang (menunggu validasi).",
      });
    } catch (e) {
      void appAlert({
        variant: "error",
        message:
          e instanceof Error
            ? e.message
            : "Gagal menyimpan (jaringan atau server).",
      });
    } finally {
      setDrawerSaving(false);
    }
  }

  if (!open) return null;

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const modalUi = (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media print {
  @page { margin: 12mm; size: A4 landscape; }
  body * { visibility: hidden !important; background-color: transparent !important; }
  .print-area, .print-area * { visibility: visible !important; }
  .print-area { 
    display: block !important;
    position: fixed !important; 
    left: 0 !important; 
    top: 0 !important; 
    width: 100vw !important; 
    height: 100vh !important;
    background-color: white !important; 
    z-index: 999999 !important;
    margin: 0 !important;
    padding: 12mm !important;
    color: black !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`,
        }}
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] sm:p-4 print:hidden">
        <button
          suppressHydrationWarning
          type="button"
          className="absolute inset-0 bg-black/75 border-0 cursor-default p-0"
          aria-label="Tutup form"
          onClick={() => (!drawerSaving ? onClose() : undefined)}
        />
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-[min(42rem,calc(100vw-1rem))] lg:max-w-5xl max-h-[min(92dvh,calc(100vh-1rem))] sm:max-h-[90dvh] bg-[#050b14] border border-white/15 rounded-t-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-0 animate-in fade-in slide-in-from-bottom-6 duration-200"
        >
          <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-white/10 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between shrink-0 min-w-0">
            <div className="min-w-0 pr-6 sm:pr-0">
              <h3 className="text-sm font-semibold text-[#E8C547] flex items-center gap-2 flex-wrap">
                {existingOrderId ? (
                  <SquarePen className="h-4 w-4 shrink-0 opacity-90" />
                ) : (
                  <ClipboardList className="h-4 w-4 shrink-0 opacity-90" />
                )}
                {existingOrderId
                  ? "Edit Pemakaian Alkes"
                  : "Input Pemakaian Alkes"}
              </h3>
              <p className="text-[11px] text-white/85 mt-0.5">
                {existingOrderId
                  ? "Ubah barang & header order; simpan memperbarui data di Depo."
                  : "Dari kasus tindakan — simpan mengirim ke Depo Farmasi (menunggu validasi)."}
              </p>
            </div>
            <button
              suppressHydrationWarning
              type="button"
              disabled={drawerSaving}
              onClick={onClose}
              className="self-end sm:self-start shrink-0 text-xs text-white/85 hover:text-white disabled:opacity-50 -mt-1 sm:mt-0"
            >
              Tutup
            </button>
          </div>

          <div className="px-3 py-3 sm:px-4 space-y-3 overflow-y-auto overflow-x-hidden text-xs flex-1 min-h-0 min-w-0 overscroll-contain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
              <LabeledField label="Pasien">
                <PasienCombobox
                  listboxId="tindakan-pemakaian-modal-pasien"
                  value={drawerPasien}
                  onChange={setDrawerPasien}
                  options={pasienOptions}
                  loading={pasienLoading}
                />
              </LabeledField>
              <LabeledField
                label="Dokter / Operator"
                errorMessage={
                  dokterFieldInvalid
                    ? "Wajib diisi — ketik nama atau pilih dari daftar."
                    : undefined
                }
              >
                <DoctorCombobox
                  listboxId="tindakan-pemakaian-modal-doctor"
                  value={drawerDokter}
                  onChange={(v) => {
                    setDrawerDokter(v);
                    setDokterFieldInvalid(false);
                  }}
                  onInputBlur={(t) => {
                    const resolved =
                      doctorOptions.length > 0
                        ? resolveDoctorFromLooseInput(doctorOptions, t)
                        : null;
                    setDrawerDokter(
                      resolved ? formatDoctorLabel(resolved) : t.trim(),
                    );
                  }}
                  onSelectOption={(picked) => {
                    setDrawerDokter(formatDoctorLabel(picked));
                    setDokterFieldInvalid(false);
                  }}
                  options={doctorOptions}
                  loading={doctorLoading}
                  inputClassName={
                    dokterFieldInvalid
                      ? "border-amber-400/70 ring-1 ring-amber-400/40 focus:ring-amber-400/50"
                      : undefined
                  }
                />
              </LabeledField>
              <LabeledField
                label="Ruangan"
                errorMessage={
                  ruanganFieldInvalid
                    ? "Wajib diisi — ketik nama atau pilih dari daftar."
                    : undefined
                }
              >
                <RuanganCombobox
                  listboxId="tindakan-pemakaian-modal-ruangan"
                  value={drawerRuangan}
                  onChange={(v) => {
                    setDrawerRuangan(v);
                    setRuanganFieldInvalid(false);
                  }}
                  options={ruanganList}
                  loading={ruanganListLoading}
                  inputClassName={
                    ruanganFieldInvalid
                      ? "border-amber-400/70 ring-1 ring-amber-400/40 focus:ring-amber-400/50"
                      : undefined
                  }
                />
              </LabeledField>
              <LabeledField label="Depo">
                <input
                  value={drawerDepo}
                  onChange={(e) => setDrawerDepo(e.target.value)}
                  placeholder="Depo Cathlab"
                  className="w-full bg-black/40 border border-white/15 rounded-md px-2 py-1.5 text-[11px] text-white placeholder:text-white/90 focus:outline-none focus:ring-2 focus:ring-[#E8C547]/40"
                />
              </LabeledField>
              <div className="md:col-span-2">
                <LabeledField label="Tanggal & Jam">
                  <DatetimeLocalPicker
                    value={drawerDateTime}
                    onChange={setDrawerDateTime}
                  />
                </LabeledField>
              </div>
            </div>

            <div className="mt-2">
              <div className="text-[#E8C547] font-semibold mb-1 flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-w-0">
                <span className="text-xs shrink-0">Detail Barang Alkes</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-white/85 font-normal text-[10px]">
                    {drawerLines.length} jenis
                  </span>
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/30 px-2.5 py-1 text-[10px] font-semibold text-white/90 hover:border-[#E8C547]/45 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                    title="Cetak"
                  >
                    <PrintIcon size={12} className="text-[#E8C547]" />
                    Cetak
                  </button>
                  <button
                    suppressHydrationWarning
                    type="button"
                    onClick={() => {
                      setBarangPickerOpen(true);
                      setBarangPickerQuery("");
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-[#E8C547]/50 bg-[#E8C547]/10 px-2.5 py-1 text-[10px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20"
                  >
                    <PlusCircle className="h-3 w-3" aria-hidden />
                    Tambah
                  </button>
                </div>
              </div>
              <RincianBarangTemplateTabs
                tab={rincianBarangTab}
                onTabChange={setRincianBarangTab}
                rowsObatAlkes={TEMPLATE_OBAT_ALKES}
                rowsKomponen={TEMPLATE_KOMPONEN}
                obatAlkes={editingTemplateInputBarang.obatAlkes}
                komponen={editingTemplateInputBarang.komponen}
                onChangeObatAlkes={patchTemplateObatAlkes}
                onChangeKomponen={patchTemplateKomponen}
              >
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-white/85">
                    <span>
                      Total qty resep:{" "}
                      <span className="text-white/90 tabular-nums font-medium">
                        {drawerLines.reduce((a, l) => a + l.qtyRencana, 0)}
                      </span>
                    </span>
                    <span>
                      Total qty dipakai:{" "}
                      <span className="text-white/90 tabular-nums font-medium">
                        {drawerLines.reduce((a, l) => a + l.qtyDipakai, 0)}
                      </span>
                    </span>
                  </div>

                  <div className="rounded-xl border border-white/10 overflow-x-auto -mx-0.5 px-0.5 sm:mx-0 sm:px-0 touch-pan-x">
                    <table className="w-full text-[10px] min-w-[920px]">
                      <thead>
                        <tr className="bg-[#0a1628] text-white/90">
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[100px]">
                            Barang
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[5.5rem]">
                            Kategori
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[88px]">
                            Distributor
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[64px]">
                            Ukuran
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[56px]">
                            LOT
                          </th>
                          <th className="text-left font-semibold px-2 py-1.5 min-w-[52px]">
                            ED
                          </th>
                          <th className="text-right font-semibold px-2 py-1.5 whitespace-nowrap min-w-[6.5rem]">
                            Harga
                          </th>
                          <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap min-w-[4.25rem]">
                            Resep
                          </th>
                          <th className="text-center font-semibold px-2 py-1.5 whitespace-nowrap min-w-[3.5rem]">
                            Stok
                          </th>
                          <th className="text-center font-semibold px-1 py-1.5 w-[72px]">
                            Tipe
                          </th>
                          <th className="text-center font-semibold px-1 py-1.5 w-[1%] whitespace-nowrap">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {drawerLines.map((line) => (
                          <tr key={line.lineId} className="bg-black/20">
                            <td className="px-1.5 py-1 align-top">
                              <BarangVariantCombobox
                                variant="table"
                                listboxId={`tindakan-pemakaian-modal-barang-${line.lineId}`}
                                autoFocus={line.lineId === drawerFocusLineId}
                                value={line.barang}
                                blurResolveLine={{
                                  distributor: line.distributor,
                                  lot: line.lot,
                                  ukuran: line.ukuran,
                                  ed: line.ed,
                                }}
                                onChange={(nama) =>
                                  patchDrawerLine(line.lineId, { barang: nama })
                                }
                                onPickVariant={(v) => {
                                  const h = hargaFromPickRow(
                                    v,
                                    barangVariantList,
                                  );
                                  const kCat =
                                    kategoriAlkesFromVariantPickRow(v);
                                  patchDrawerLine(line.lineId, {
                                    barang: v.nama.trim(),
                                    ...(kCat ? { kategori: kCat } : {}),
                                    distributor:
                                      v.distributor_nama?.trim() || undefined,
                                    lot: v.lot?.trim() || undefined,
                                    ukuran: v.ukuran?.trim() || undefined,
                                    ed: v.ed?.trim() || undefined,
                                    ...(h !== undefined ? { harga: h } : {}),
                                  });
                                  setDrawerLines((rows) => {
                                    const idx = rows.findIndex(
                                      (r) => r.lineId === line.lineId,
                                    );
                                    if (idx === rows.length - 1) {
                                      const nextId = newDrawerLineId();
                                      setDrawerFocusLineId(nextId);
                                      return [
                                        ...rows,
                                        {
                                          lineId: nextId,
                                          barang: "",
                                          distributor: "",
                                          qtyRencana: 1,
                                          qtyDipakai: 0,
                                          tipe: "N",
                                        },
                                      ];
                                    }
                                    return rows;
                                  });
                                }}
                                options={barangVariantList}
                                loading={barangVariantLoading}
                                onRequestAddProduct={openTambahProdukModal}
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <select
                                suppressHydrationWarning
                                aria-label="Kategori alkes"
                                value={line.kategori ?? ""}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  patchDrawerLine(line.lineId, {
                                    kategori: v
                                      ? normalizeKategoriAlkesLine(v)
                                      : undefined,
                                  });
                                }}
                                className="w-full min-w-[5rem] bg-black/50 border border-white/15 rounded px-0.5 py-1 text-[9px] text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              >
                                <option value="">— Pilih —</option>
                                {DISTRIBUTOR_PRODUK_KATEGORI.map((k) => (
                                  <option key={k} value={k}>
                                    {k}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.distributor ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    distributor: e.target.value || undefined,
                                  })
                                }
                                className="w-full min-w-[76px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.ukuran ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    ukuran: e.target.value.trim() || undefined,
                                  })
                                }
                                placeholder="—"
                                className="w-full min-w-[56px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white placeholder:text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.lot ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    lot: e.target.value.trim() || undefined,
                                  })
                                }
                                placeholder="—"
                                className="w-full min-w-[52px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white placeholder:text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1 align-top">
                              <input
                                type="text"
                                value={line.ed ?? ""}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    ed: e.target.value.trim() || undefined,
                                  })
                                }
                                placeholder="MM-YYYY"
                                className="w-full min-w-[52px] bg-black/50 border border-white/15 rounded px-1.5 py-1 text-white placeholder:text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1.5 py-1.5 align-middle text-right tabular-nums text-white/90 text-[10px]">
                              {formatHargaCell(line.harga)}
                            </td>
                            <td className="px-1 py-1 align-top">
                              <input
                                type="number"
                                min={0}
                                value={line.qtyRencana}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    qtyRencana: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    ),
                                  })
                                }
                                className="w-full bg-black/50 border border-white/15 rounded px-1 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1 py-1 align-top">
                              <input
                                type="number"
                                min={0}
                                value={line.qtyDipakai}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    qtyDipakai: Math.max(
                                      0,
                                      Number(e.target.value) || 0,
                                    ),
                                  })
                                }
                                className="w-full bg-black/50 border border-white/15 rounded px-1 py-1 text-center tabular-nums text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              />
                            </td>
                            <td className="px-1 py-1 align-top">
                              <select
                                suppressHydrationWarning
                                value={line.tipe}
                                onChange={(e) =>
                                  patchDrawerLine(line.lineId, {
                                    tipe: e.target
                                      .value as PemakaianLine["tipe"],
                                  })
                                }
                                className="w-full bg-black/50 border border-white/15 rounded px-0.5 py-1 text-[9px] text-white focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                              >
                                <option value="N">N</option>
                                <option value="R">R</option>
                              </select>
                            </td>
                            <td className="px-1 py-1 align-middle text-center">
                              <button
                                suppressHydrationWarning
                                type="button"
                                onClick={() => removeDrawerLine(line.lineId)}
                                className="inline-flex items-center gap-0.5 rounded-lg border border-rose-500/50 bg-rose-950/50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-200 hover:bg-rose-900/60 focus:outline-none focus:ring-1 focus:ring-rose-400/50"
                                aria-label={`Hapus baris ${line.barang || line.lineId}`}
                                title="Hapus baris"
                              >
                                <Trash2
                                  className="h-3 w-3 shrink-0"
                                  aria-hidden
                                />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </RincianBarangTemplateTabs>
            </div>
          </div>

          <div className="px-3 py-3 sm:px-4 border-t border-white/10 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end shrink-0 min-h-[3.25rem]">
            <button
              suppressHydrationWarning
              type="button"
              onClick={onClose}
              disabled={drawerSaving}
              className="w-full sm:w-auto px-3 py-2.5 sm:py-1.5 rounded-full text-xs border border-white/20 text-white/85 hover:bg-white/5 disabled:opacity-50 min-h-[44px] sm:min-h-0"
            >
              Batal
            </button>
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => void submitDrawerPemakaian()}
              disabled={drawerSaving}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf] text-[#0a0f18] shadow-[0_0_18px_rgba(232,197,71,0.35)] hover:shadow-[0_0_22px_rgba(45,212,191,0.25)] disabled:opacity-60 disabled:pointer-events-none min-h-[44px] sm:min-h-0"
            >
              {drawerSaving
                ? "Menyimpan…"
                : existingOrderId
                  ? "Simpan perubahan"
                  : "Simpan & Kirim ke Depo + Distributor"}
            </button>
          </div>
        </div>
      </div>

      {barangPickerOpen ? (
        <div
          className={`fixed inset-0 ${UI_LAYERS.modalTop} flex items-end sm:items-center justify-center p-3 bg-black/80 print:hidden`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tindakan-pemakaian-barang-picker-title"
          onClick={closeBarangPicker}
        >
          <div
            className="w-full max-w-lg max-h-[min(420px,70vh)] flex flex-col rounded-2xl border border-white/15 bg-[#0a1628] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <h4
                id="tindakan-pemakaian-barang-picker-title"
                className="text-[11px] font-semibold text-[#E8C547]"
              >
                Cari &amp; tambah barang
              </h4>
              <button
                suppressHydrationWarning
                type="button"
                onClick={closeBarangPicker}
                className="rounded-lg p-1 text-white/85 hover:bg-white/10 hover:text-white"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 py-2 border-b border-white/10 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/85 pointer-events-none" />
                <input
                  type="search"
                  value={barangPickerQuery}
                  onChange={(e) => setBarangPickerQuery(e.target.value)}
                  placeholder="Nama, kode, barcode, LOT, ukuran, ED, distributor…"
                  className="w-full rounded-lg border border-white/15 bg-black/40 py-2 pl-8 pr-11 text-[11px] text-white placeholder:text-white/90 focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                  autoFocus
                />
                <button
                  suppressHydrationWarning
                  type="button"
                  onClick={() => setBarangScanOpen(true)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-teal-300/90 hover:bg-white/10 hover:text-[#E8C547] focus:outline-none focus:ring-1 focus:ring-[#E8C547]/50"
                  aria-label="Pindai barcode atau QR dengan kamera"
                  title="Pindai barcode / QR"
                >
                  <ScanLine className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {barangVariantLoading ? (
                <p className="px-3 py-6 text-center text-[11px] text-white/85">
                  Memuat katalog…
                </p>
              ) : filteredBarangPicks.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[11px] text-white/85 dark:text-white/90">
                    {barangVariantList.length === 0
                      ? "Belum ada data master / mapping distributor."
                      : "Tidak ada baris yang cocok dengan pencarian."}
                  </p>
                  <button
                    suppressHydrationWarning
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const d = barangPickerQuery.trim();
                      setTambahProdukDraft(d);
                      window.setTimeout(() => setTambahProdukOpen(true), 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      e.stopPropagation();
                      const d = barangPickerQuery.trim();
                      setTambahProdukDraft(d);
                      window.setTimeout(() => setTambahProdukOpen(true), 0);
                    }}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E8C547]/40 bg-[#E8C547]/10 px-3 py-2 text-[10px] font-semibold text-[#E8C547] hover:bg-[#E8C547]/20"
                  >
                    <PackagePlus className="h-3.5 w-3.5" aria-hidden />
                    Tambah produk
                  </button>
                </div>
              ) : (
                <ul className="py-1">
                  {filteredBarangPicks.map((v) => (
                    <li key={v.pickId}>
                      <button
                        suppressHydrationWarning
                        type="button"
                        onClick={() => applyBarangPick(v)}
                        className="w-full text-left px-3 py-2 hover:bg-[#E8C547]/15 focus:bg-[#E8C547]/20 focus:outline-none border-b border-white/[0.06] last:border-0"
                      >
                        <span className="block text-[11px] font-medium text-white/95">
                          {v.nama}
                        </span>
                        <span className="block text-[9px] text-white/85 mt-0.5 space-x-1">
                          {[v.kode && `Kode: ${v.kode}`, v.jenis]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        {(v.lot || v.ukuran || v.ed || v.distributor_nama) && (
                          <span className="block text-[9px] text-teal-200/90 mt-0.5">
                            {[
                              v.lot && `LOT ${v.lot}`,
                              v.ukuran && `Uk. ${v.ukuran}`,
                              v.ed && `ED ${v.ed}`,
                              v.distributor_nama && v.distributor_nama,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="px-3 py-2 border-t border-white/10 flex flex-wrap gap-2 justify-between items-center shrink-0">
              <button
                suppressHydrationWarning
                type="button"
                onClick={addEmptyLineFromPicker}
                className="text-[10px] text-white/85 hover:text-[#E8C547] underline underline-offset-2"
              >
                Baris kosong (isi manual)
              </button>
              <button
                suppressHydrationWarning
                type="button"
                onClick={closeBarangPicker}
                className="px-2.5 py-1 rounded-lg text-[10px] border border-white/20 text-white/85 hover:bg-white/5"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tambahProdukOpen ? (
        <div
          className={`fixed inset-0 ${UI_LAYERS.dialogOverlayTop} flex items-end sm:items-center justify-center p-3 bg-black/80 print:hidden`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tindakan-alkes-tambah-produk-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTambahProdukOpen(false);
          }}
        >
          <div
            className={`relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0a1628] shadow-2xl overflow-hidden ${UI_LAYERS.dialogContentTop}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
              <h4
                id="tindakan-alkes-tambah-produk-title"
                className="text-[11px] font-semibold text-[#E8C547]"
              >
                Tambah produk (master &amp; distributor)
              </h4>
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setTambahProdukOpen(false)}
                className="rounded-lg p-1 text-white/85 hover:bg-white/10 hover:text-white"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 py-3 space-y-2 text-[11px] text-white/90 dark:text-white">
              <p>
                Barang belum ada di katalog master / mapping distributor. Anda
                bisa menambahkannya di Master Barang, di panel distributor
                (produk &amp; stok), atau melanjutkan lewat pencarian &amp;
                baris manual.
              </p>
              {tambahProdukDraft.trim() ? (
                <p className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 font-mono text-[10px] text-white/90 break-all">
                  {tambahProdukDraft.trim()}
                </p>
              ) : null}
            </div>
            <div className="px-3 py-2.5 border-t border-white/10 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link
                href={
                  tambahProdukDraft.trim()
                    ? `/distributor/barang?nama=${encodeURIComponent(tambahProdukDraft.trim())}`
                    : "/distributor/barang"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-[#0ea5e9] via-[#22d3ee] to-[#2dd4bf] text-[#0a0f18] hover:opacity-95"
              >
                Tambah Produk Distributor
              </Link>
              <Link
                href="/dashboard/farmasi/master-barang"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-2 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-[#C9A227] via-[#E8C547] to-[#2dd4bf] text-[#0a0f18] hover:opacity-95"
              >
                Buka Master Barang
              </Link>
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => {
                  setBarangPickerQuery(tambahProdukDraft);
                  setTambahProdukOpen(false);
                  setBarangPickerOpen(true);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-lg text-[10px] border border-white/20 text-white/90 hover:bg-white/10"
              >
                Cari &amp; tambah barang (manual)
              </button>
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => setTambahProdukOpen(false)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg text-[10px] border border-white/20 text-white/85 hover:bg-white/5"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ScanBarcodeQRDialog
        open={barangScanOpen}
        onClose={() => setBarangScanOpen(false)}
        onDecoded={handleBarangScanDecoded}
      />
      {printOnlyUi}
    </>
  );

  return portalTarget ? createPortal(modalUi, portalTarget) : null;
}
