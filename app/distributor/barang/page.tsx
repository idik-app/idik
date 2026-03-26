"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Printer, ScanLine, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DISTRIBUTOR_PRODUK_KATEGORI,
  distributorEdToFormValue,
  distributorHargaToFormValue,
  formatDistributorEdDisplay,
  formatDistributorHargaDisplay,
  parseDistributorEdForSubmit,
  formatDistributorHargaInputValue,
  parseDistributorHargaForSubmit,
  parseDistributorKemasanBarcodeTemplate,
  normalizeDistributorLotAutoValue,
  suggestSupraflexLotFromBarcode,
} from "@/lib/distributorCatalog";

type Row = {
  id: string;
  distributor_id?: string;
  /** Diisi API untuk admin — nama PT distributor baris ini. */
  distributor_nama_pt?: string | null;
  kode_distributor: string | null;
  harga_jual: number | null;
  min_stok: number | null;
  is_active: boolean | null;
  barcode: string | null;
  kategori: string | null;
  lot: string | null;
  ukuran: string | null;
  ed: string | null;
  master_barang_id: string;
  stok_cathlab: number;
  inventaris_lines?: { id: string; nama: string | null; stok: number }[];
  master_barang: {
    id: string;
    kode: string;
    nama: string;
    kategori: string | null;
    satuan: string | null;
    jenis: string;
  } | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format yang diinginkan untuk BarcodeDetector (barcode linear + QR & sejenisnya). */
const CAMERA_BARCODE_FORMATS_WANTED = [
  "qr_code",
  "aztec",
  "data_matrix",
  "pdf417",
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
] as const;

function pickBarcodeDetectorFormats(): string[] {
  if (typeof window === "undefined") return [...CAMERA_BARCODE_FORMATS_WANTED];
  const BD = (
    window as unknown as {
      BarcodeDetector?: { getSupportedFormats?: () => string[] };
    }
  ).BarcodeDetector;
  if (typeof BD?.getSupportedFormats !== "function") {
    return [...CAMERA_BARCODE_FORMATS_WANTED];
  }
  const supported = BD.getSupportedFormats();
  if (!supported?.length) return [...CAMERA_BARCODE_FORMATS_WANTED];
  const ok = new Set(supported);
  const picked = CAMERA_BARCODE_FORMATS_WANTED.filter((f) => ok.has(f));
  if (picked.length > 0) return picked;
  const minimal = ["qr_code", "code_128"].filter((f) => ok.has(f));
  return minimal.length > 0 ? minimal : ["qr_code", "code_128"];
}

function printDaftarBarang(
  rows: Row[],
  meta: { title: string; generatedAt: string; showDistributorColumn?: boolean },
) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Tidak bisa membuka jendela cetak. Izinkan pop-up untuk halaman ini.");
    return;
  }
  const showDist = Boolean(meta.showDistributorColumn);
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr>
          ${showDist ? `<td>${escapeHtml(r.distributor_nama_pt?.trim() || "—")}</td>` : ""}
          <td>${escapeHtml(r.master_barang?.nama ?? "-")}</td>
          <td>${escapeHtml(r.master_barang?.kode ?? "-")}</td>
          <td>${escapeHtml(r.barcode ?? "—")}</td>
          <td>${escapeHtml(r.kategori ?? "—")}</td>
          <td>${escapeHtml(r.lot ?? "—")}</td>
          <td>${escapeHtml(r.ukuran ?? "—")}</td>
          <td>${escapeHtml(formatDistributorEdDisplay(r.ed))}</td>
          <td class="num">${r.stok_cathlab ?? 0}</td>
          <td class="num">${escapeHtml(formatDistributorHargaDisplay(r.harga_jual))}</td>
        </tr>`,
    )
    .join("");
  const headDist = showDist ? "<th>Distributor</th>" : "";
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${escapeHtml(meta.title)}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;font-size:11px;padding:16px;color:#111}
h1{font-size:16px;margin:0 0 8px}
.meta{color:#555;font-size:10px;margin-bottom:12px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#f0f0f0;font-size:10px}
.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
</style></head><body>
<h1>${escapeHtml(meta.title)}</h1>
<div class="meta">${escapeHtml(meta.generatedAt)} · ${rows.length} baris (sesuai filter)</div>
<table>
<thead><tr>
${headDist}
<th>Nama</th><th>Kode</th><th>Barcode</th><th>Kategori</th><th>LOT</th><th>Ukuran</th><th>ED</th><th>Stok Cathlab</th><th>Harga</th>
</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</body></html>`);
  w.document.close();
  w.focus();
  window.setTimeout(() => {
    w.print();
    w.close();
  }, 150);
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function DistributorBarangPageContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";

  const [q, setQ] = useState("");
  const [allRows, setAllRows] = useState<Row[]>([]);
  const [filterKategori, setFilterKategori] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [loadingModal, setLoadingModal] = useState(false);
  const [adminView, setAdminView] = useState(false);

  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeHint, setBarcodeHint] = useState<string | null>(null);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<Row | null>(null);
  const [formKodeDistributor, setFormKodeDistributor] = useState("");
  const [formKategoriAlkes, setFormKategoriAlkes] = useState("");
  const [formLot, setFormLot] = useState("");
  const [formUkuran, setFormUkuran] = useState("");
  const [formEd, setFormEd] = useState("");
  const [formHargaJual, setFormHargaJual] = useState<string>("");
  /** Hanya mode edit: delta inventaris Cathlab (+/−), kosong = tidak ubah inventaris. */
  const [formStokDelta, setFormStokDelta] = useState<string>("");
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  /** Nama barang master di mode edit (read-only; sumber kebenaran tetap master_barang_id). */
  const [selectedMasterLabel, setSelectedMasterLabel] = useState("");
  const [formNamaMasterBaru, setFormNamaMasterBaru] = useState("");
  const [formKodeMasterBaru, setFormKodeMasterBaru] = useState("");

  const [keluarkanTarget, setKeluarkanTarget] = useState<Row | null>(null);
  const [keluarkanQty, setKeluarkanQty] = useState("1");
  const [keluarkanLoading, setKeluarkanLoading] = useState(false);
  const [hapusTarget, setHapusTarget] = useState<Row | null>(null);
  const [hapusLoading, setHapusLoading] = useState(false);

  const closeProductModal = useCallback(() => {
    setModalOpen(false);
    setCameraScanOpen(false);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/distributor/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setAdminView(j?.mode === "admin_view");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const applyBarcodeTemplateFields = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      const parsed = parseDistributorKemasanBarcodeTemplate(raw);
      const lot = normalizeDistributorLotAutoValue(
        suggestSupraflexLotFromBarcode(formNamaMasterBaru, v) ?? v,
      );
      const vKey = v.toUpperCase();
      setFormLot((prev) => {
        const p = prev.trim();
        if (p === "" || p.toUpperCase() === vKey) return lot;
        return prev;
      });
      if (parsed.ukuran) {
        setFormUkuran((prev) => (prev.trim() === "" ? parsed.ukuran! : prev));
      }
      if (parsed.ed) {
        setFormEd((prev) => (prev.trim() === "" ? parsed.ed! : prev));
      }
    },
    [formNamaMasterBaru],
  );

  useEffect(() => {
    if (!modalOpen || editing) return;
    const v = barcodeInput.trim();
    if (!v) return;
    const sup = suggestSupraflexLotFromBarcode(formNamaMasterBaru, v);
    if (!sup) return;
    const lot = normalizeDistributorLotAutoValue(sup);
    const vKey = v.toUpperCase();
    setFormLot((prev) => {
      const p = prev.trim();
      if (p === "" || p.toUpperCase() === vKey) return lot;
      return prev;
    });
  }, [modalOpen, editing, formNamaMasterBaru, barcodeInput]);

  const applyByBarcode = useCallback(async (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setLoadingModal(true);
    setBarcodeHint(null);
    try {
      const res = await fetch(
        `/api/distributor/produk/catalog?barcode=${encodeURIComponent(v)}`,
        { cache: "no-store" },
      );
      const j = await res.json();
      const list = (j?.data ?? []) as { nama?: string; kode?: string }[];
      if (!j?.ok) {
        setBarcodeHint(j?.message ?? "Gagal mencari barcode");
        return;
      }
      if (list.length === 0) {
        const t = parseDistributorKemasanBarcodeTemplate(v);
        applyBarcodeTemplateFields(v);
        const supLot = suggestSupraflexLotFromBarcode(formNamaMasterBaru, v);
        const autoBit = supLot
          ? " LOT SupraFlex diisi sebagai batch (10) dari barcode — periksa sebelum menyimpan."
          : t.ukuran != null || t.ed != null
            ? " LOT & kolom lain diisi otomatis dari pola barcode bila bisa — silakan periksa sebelum menyimpan."
            : " LOT diisi otomatis sama dengan barcode — lengkapi ukuran/ED jika perlu.";
        setBarcodeHint(
          `Tidak ada master dengan barcode ini. Lanjut isi nama barang baru di bawah, atau koordinasikan dengan administrator RS jika barang sudah terdaftar di master.${autoBit}`,
        );
        return;
      }
      if (list.length === 1) {
        const item = list[0];
        setBarcodeInput((prev) =>
          prev.trim() ? prev.trim() : String(v).trim(),
        );
        setBarcodeHint(
          `Master: ${item.nama ?? "?"} (${item.kode ?? "—"}). Untuk menautkan produk distributor ke barang yang sudah ada, koordinasikan dengan administrator RS — form ini hanya untuk barang baru.`,
        );
        return;
      }
      setBarcodeHint(
        "Beberapa barang cocok di master. Koordinasikan dengan administrator RS untuk memilih dan menautkan.",
      );
    } finally {
      setLoadingModal(false);
    }
  }, [applyBarcodeTemplateFields, formNamaMasterBaru]);

  useEffect(() => {
    if (!cameraScanOpen) return;
    const video = videoRef.current;
    if (!video) return;

    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    const hasDetector =
      typeof window !== "undefined" && "BarcodeDetector" in window;

    void (async () => {
      if (!hasDetector) {
        setBarcodeHint(
          "Browser tidak mendukung scan kamera untuk barcode/QR (Chrome/Edge disarankan). Gunakan scanner USB di kolom ini.",
        );
        return;
      }
      try {
        const Detector = (
          window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (v: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
            };
          }
        ).BarcodeDetector;
        const formats = pickBarcodeDetectorFormats();
        let detector: InstanceType<typeof Detector>;
        try {
          detector = new Detector({ formats });
        } catch {
          try {
            detector = new Detector({ formats: ["qr_code", "code_128"] });
          } catch {
            setBarcodeHint(
              "Browser tidak bisa mengaktifkan pemindaian barcode/QR di kamera. Gunakan Chrome/Edge atau scanner USB.",
            );
            return;
          }
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (cancelled) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (cancelled) return;
          if (video.readyState < 2) {
            raf = requestAnimationFrame(() => void tick());
            return;
          }
          try {
            const codes = await detector.detect(video);
            const raw = codes[0]?.rawValue?.trim();
            if (raw) {
              cancelled = true;
              cancelAnimationFrame(raf);
              stream?.getTracks().forEach((t) => t.stop());
              video.srcObject = null;
              setCameraScanOpen(false);
              setBarcodeInput(raw);
              await applyByBarcode(raw);
              return;
            }
          } catch {
            /* frame */
          }
          raf = requestAnimationFrame(() => void tick());
        };
        raf = requestAnimationFrame(() => void tick());
      } catch {
        setBarcodeHint(
          "Akses kamera ditolak atau tidak tersedia. Pakai scanner USB.",
        );
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (video.srcObject) video.srcObject = null;
    };
  }, [cameraScanOpen, applyByBarcode]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (distributorIdParam) params.set("distributor_id", distributorIdParam);
      const paramsWithBust = new URLSearchParams(params);
      paramsWithBust.set("_", String(Date.now()));
      const res = await fetch(
        `/api/distributor/produk?${paramsWithBust.toString()}`,
        {
          cache: "no-store",
        },
      );
      const json = await res.json();
      const all = (json?.data ?? []) as Row[];
      setAllRows(all);
    } finally {
      setLoading(false);
    }
  }, [distributorIdParam]);

  const filteredRows = useMemo(() => {
    let list = allRows;
    const q2 = q.trim().toLowerCase();
    if (q2) {
      list = list.filter((r) => {
        const name = r.master_barang?.nama?.toLowerCase() ?? "";
        const kode = r.master_barang?.kode?.toLowerCase() ?? "";
        const kategori = r.kategori?.toLowerCase() ?? "";
        const barcode = r.barcode?.toLowerCase() ?? "";
        const distName = r.distributor_nama_pt?.toLowerCase() ?? "";
        return (
          name.includes(q2) ||
          kode.includes(q2) ||
          kategori.includes(q2) ||
          barcode.includes(q2) ||
          distName.includes(q2)
        );
      });
    }
    if (filterKategori.trim()) {
      const fk = filterKategori.trim();
      list = list.filter((r) => (r.kategori ?? "") === fk);
    }
    return list;
  }, [allRows, q, filterKategori]);

  const kpi = useMemo(() => {
    const totalSku = filteredRows.length;
    const totalStok = filteredRows.reduce(
      (s, r) => s + Math.max(0, Number(r.stok_cathlab ?? 0)),
      0,
    );
    return { totalSku, totalStok };
  }, [filteredRows]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pageSize) || 1,
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, filterKategori]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const title = useMemo(() => `Barang (Cathlab)`, []);

  /** Admin/superadmin: mode "Semua Distributor" — daftar gabungan semua PT. */
  const showAdminAllDistributors = adminView && !distributorIdParam;
  const tableColSpan = showAdminAllDistributors ? 11 : 10;

  const confirmKeluarkanKePanel = async () => {
    if (!keluarkanTarget) return;
    const max = Math.max(0, Number(keluarkanTarget.stok_cathlab ?? 0));
    const n = Number(keluarkanQty);
    if (!Number.isFinite(n) || n < 1 || n > max) {
      alert(`Isi jumlah 1–${max} (stok Cathlab saat ini).`);
      return;
    }
    setKeluarkanLoading(true);
    try {
      const body: Record<string, unknown> = {
        distributor_barang_id: keluarkanTarget.id,
        qty: n,
      };
      const distForApi =
        distributorIdParam || keluarkanTarget.distributor_id?.trim() || "";
      if (adminView && distForApi) {
        body.distributor_id = distForApi;
      }
      const res = await fetch("/api/distributor/retur-staging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        alert(
          typeof j?.message === "string"
            ? j.message
            : "Gagal menambahkan ke panel retur.",
        );
        return;
      }
      setKeluarkanTarget(null);
      setKeluarkanQty("1");
      void load();
    } catch (e) {
      alert(
        e instanceof Error ? e.message : "Gagal menjangkau server. Coba lagi.",
      );
    } finally {
      setKeluarkanLoading(false);
    }
  };

  const confirmHapusProduk = async () => {
    if (!hapusTarget) return;
    setHapusLoading(true);
    try {
      const res = await fetch(
        `/api/distributor/produk/${encodeURIComponent(hapusTarget.id)}`,
        { method: "DELETE" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        alert(
          typeof j?.message === "string"
            ? j.message
            : "Gagal menghapus produk distributor.",
        );
        return;
      }
      if (editing?.id === hapusTarget.id) closeProductModal();
      setHapusTarget(null);
      await load();
    } catch (e) {
      alert(
        e instanceof Error ? e.message : "Gagal menjangkau server. Coba lagi.",
      );
    } finally {
      setHapusLoading(false);
    }
  };

  const submitProductModal = async () => {
    const edParsed = parseDistributorEdForSubmit(formEd);
    if (!edParsed.ok) {
      alert(edParsed.message);
      return;
    }
    if (!editing && !formNamaMasterBaru.trim()) {
      alert("Isi nama barang untuk master baru");
      return;
    }
    setLoadingModal(true);
    try {
      if (editing) {
        const patchRes = await fetch(
          `/api/distributor/produk/${encodeURIComponent(editing.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kode_distributor: formKodeDistributor,
              harga_jual: parseDistributorHargaForSubmit(formHargaJual),
              is_active: formIsActive,
              barcode: barcodeInput.trim() || null,
              kategori: formKategoriAlkes || null,
              lot: formLot.trim() || null,
              ukuran: formUkuran.trim() || null,
              ed: edParsed.value,
            }),
          },
        );
        const patchJ = await patchRes.json().catch(() => ({}));
        if (!patchRes.ok) {
          alert(
            typeof patchJ?.message === "string"
              ? patchJ.message
              : "Gagal menyimpan data produk",
          );
          return;
        }
        const deltaRaw = formStokDelta
          .trim()
          .replace(/\s/g, "")
          .replace(",", ".");
        if (deltaRaw !== "") {
          const deltaNum = Number(deltaRaw);
          if (!Number.isFinite(deltaNum) || deltaNum === 0) {
            alert(
              "Penyesuaian inventaris harus angka tidak nol, atau kosongkan.",
            );
            return;
          }
          const deltaBody: Record<string, unknown> = {
            distributor_barang_id: editing.id,
            delta: deltaNum,
          };
          const distForApi =
            distributorIdParam || editing.distributor_id?.trim() || "";
          if (adminView && distForApi) {
            deltaBody.distributor_id = distForApi;
          }
          const dRes = await fetch("/api/distributor/stok-cathlab-delta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(deltaBody),
          });
          const dJ = await dRes.json().catch(() => ({}));
          if (!dRes.ok || dJ?.ok === false) {
            alert(
              typeof dJ?.message === "string"
                ? dJ.message
                : "Data produk tersimpan, tetapi penyesuaian inventaris gagal.",
            );
            closeProductModal();
            await load();
            return;
          }
        }
      } else {
        const payload: Record<string, unknown> = {
          kode_distributor: formKodeDistributor ? formKodeDistributor : null,
          harga_jual: parseDistributorHargaForSubmit(formHargaJual),
          min_stok: 0,
          is_active: formIsActive,
          barcode: barcodeInput.trim() || null,
          kategori: formKategoriAlkes || null,
          lot: formLot.trim() || null,
          ukuran: formUkuran.trim() || null,
          ed: edParsed.value,
        };
        payload.nama_master_baru = formNamaMasterBaru.trim();
        if (formKodeMasterBaru.trim())
          payload.kode_master_baru = formKodeMasterBaru.trim();
        /** Modul Cathlab distributor: master baru selalu ALKES. */
        payload.jenis_master = "ALKES";
        if (distributorIdParam) payload.distributor_id = distributorIdParam;
        const res = await fetch(`/api/distributor/produk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const j = await res.json();
        if (!res.ok || !j?.ok) {
          alert(
            typeof j?.message === "string"
              ? j.message
              : "Gagal menyimpan produk",
          );
          return;
        }
      }
      closeProductModal();
      await load();
    } finally {
      setLoadingModal(false);
    }
  };

  const openEditRow = (r: Row) => {
    setEditing(r);
    setSelectedMasterLabel(r.master_barang?.nama ?? "");
    setFormKodeDistributor(r.kode_distributor ?? "");
    setBarcodeInput(r.barcode ?? "");
    setFormKategoriAlkes(r.kategori ?? "");
    setFormLot(normalizeDistributorLotAutoValue(r.lot ?? ""));
    setFormUkuran(r.ukuran ?? "");
    setFormEd(distributorEdToFormValue(r.ed));
    setFormHargaJual(distributorHargaToFormValue(r.harga_jual));
    setFormStokDelta("");
    setFormIsActive(Boolean(r.is_active));
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">{title}</h1>
        <p className="text-[12px] text-cyan-300/70">
          {showAdminAllDistributors
            ? "Ringkasan produk semua distributor Cathlab (admin). Filter PT lewat dropdown di header, atau pilih “Semua Distributor” untuk melihat gabungan."
            : "Daftar stok inventaris Cathlab yang supplier-nya adalah distributor Anda."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-cyan-900/50 bg-slate-950/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-cyan-500/80">
            Produk (filter)
          </div>
          <div className="text-lg font-semibold tabular-nums text-cyan-100">
            {loading ? "…" : kpi.totalSku}
          </div>
        </div>
        <div className="rounded-xl border border-cyan-900/50 bg-slate-950/50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-cyan-500/80">
            Total stok Cathlab
          </div>
          <div className="text-lg font-semibold tabular-nums text-cyan-100">
            {loading ? "…" : kpi.totalStok}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[12px] text-cyan-300/70">
          {showAdminAllDistributors
            ? "Mode gabungan: tampil semua baris distributor_barang. Untuk tambah/keluarkan stok per PT, pilih distributor di header."
            : "Daftar produk Cathlab. Barang baru lewat Tambah; tautkan ke master yang sudah ada melalui koordinasi dengan administrator RS."}
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setFormKodeDistributor("");
            setFormKategoriAlkes("");
            setFormLot("");
            setFormUkuran("");
            setFormEd("");
            setFormHargaJual("");
            setFormStokDelta("");
            setFormIsActive(true);
            setBarcodeInput("");
            setBarcodeHint(null);
            setSelectedMasterLabel("");
            setFormNamaMasterBaru("");
            setFormKodeMasterBaru("");
            setModalOpen(true);
          }}
          disabled={adminView && !distributorIdParam}
          className="px-3 py-1.5 rounded-md text-[12px] bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tambah Produk
        </button>
      </div>

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <div className="w-max min-w-full">
            <div className="border-b border-slate-900/55 bg-slate-950/55 px-3 py-3 space-y-2 w-full min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-500/75">
                Filter
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={
                    adminView && !distributorIdParam
                      ? "Cari nama / kode / kategori / barcode / distributor…"
                      : "Cari nama / kode / kategori / barcode…"
                  }
                  className="min-w-[12rem] flex-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
                <select
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                  className="min-w-[9rem] shrink-0 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  title="Filter kategori alkes"
                >
                  <option value="">Semua kategori</option>
                  {DISTRIBUTOR_PRODUK_KATEGORI.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    void load();
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-md text-[12px] bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30"
                >
                  Muat ulang
                </button>
                <button
                  type="button"
                  onClick={() =>
                    printDaftarBarang(filteredRows, {
                      title: `${title} — daftar barang`,
                      generatedAt: new Date().toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                      showDistributorColumn: showAdminAllDistributors,
                    })
                  }
                  disabled={loading || filteredRows.length === 0}
                  className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] bg-slate-800/90 border border-slate-600/80 text-cyan-100 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Cetak daftar
                </button>
              </div>
            </div>
            <table className="min-w-full text-[12px]">
            <thead className="bg-slate-950/80">
              <tr className="text-cyan-300/80">
                {showAdminAllDistributors ? (
                  <Th className="min-w-[9rem]">Distributor</Th>
                ) : null}
                <Th>Nama</Th>
                <Th>Kode</Th>
                <Th>Barcode</Th>
                <Th>Kategori</Th>
                <Th>LOT</Th>
                <Th>Ukuran</Th>
                <Th>ED</Th>
                <Th
                  className="text-right"
                  title="Total stok inventaris Cathlab (dari inventaris, bukan diisi di form tambah)"
                >
                  Stok Cathlab
                </Th>
                <Th className="text-right">Harga</Th>
                <Th className="sticky right-0 z-20 min-w-[19rem] bg-slate-950 !text-center">
                  Aksi
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {loading ? (
                <tr>
                  <td
                    colSpan={tableColSpan}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    Memuat...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableColSpan}
                    className="px-3 py-6 text-center text-cyan-300/60"
                  >
                    Tidak ada data (sesuai filter).
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => (
                  <tr
                    key={r.id}
                    title="Klik baris untuk mengedit"
                    className="group hover:bg-cyan-900/10 cursor-pointer"
                    onClick={() => openEditRow(r)}
                  >
                    {showAdminAllDistributors ? (
                      <Td className="align-top text-[11px] text-cyan-200/90 max-w-[14rem]">
                        {r.distributor_nama_pt?.trim() || "—"}
                      </Td>
                    ) : null}
                    <Td>{r.master_barang?.nama ?? "-"}</Td>
                    <Td className="align-top text-[11px] font-mono text-cyan-100/95">
                      <span
                        className="block max-w-[12rem] break-all leading-snug"
                        title={r.master_barang?.kode ?? ""}
                      >
                        {r.master_barang?.kode ?? "-"}
                      </span>
                    </Td>
                    <Td className="font-mono text-[11px]">
                      {r.barcode ?? "—"}
                    </Td>
                    <Td>{r.kategori ?? "—"}</Td>
                    <Td className="font-mono text-[11px]">{r.lot ?? "—"}</Td>
                    <Td>{r.ukuran ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-[11px] font-mono">
                      {formatDistributorEdDisplay(r.ed)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {r.stok_cathlab ?? 0}
                    </Td>
                    <Td className="text-right tabular-nums whitespace-nowrap">
                      {formatDistributorHargaDisplay(r.harga_jual)}
                    </Td>
                    <Td
                      className="sticky right-0 z-10 min-w-[19rem] whitespace-nowrap bg-slate-950 text-center align-middle group-hover:bg-slate-900"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <button
                          type="button"
                          className="shrink-0 px-2 py-1 rounded-md text-[11px] border border-amber-600/80 bg-amber-950/50 text-amber-100 hover:bg-amber-900/40"
                          disabled={adminView && !distributorIdParam}
                          onClick={(e) => {
                            e.stopPropagation();
                            setKeluarkanQty("1");
                            setKeluarkanTarget(r);
                          }}
                        >
                          Keluarkan
                        </button>
                        <Link
                          href={(() => {
                            const d =
                              r.distributor_id?.trim() ||
                              distributorIdParam.trim();
                            const base = "/distributor/riwayat";
                            const q = new URLSearchParams();
                            if (d) q.set("distributor_id", d);
                            q.set("master_barang_id", r.master_barang_id);
                            return `${base}?${q.toString()}`;
                          })()}
                          className="shrink-0 inline-flex items-center px-2 py-1 rounded-md text-[11px] border border-[#D4AF37]/50 bg-amber-950/30 text-amber-100/95 hover:bg-amber-900/35"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Jejak
                        </Link>
                        <button
                          type="button"
                          className="shrink-0 px-2 py-1 rounded-md text-[11px] border border-cyan-500/70 bg-slate-900/90 text-cyan-100 hover:bg-slate-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditRow(r);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="shrink-0 px-2 py-1 rounded-md text-[11px] border border-red-500/65 bg-red-950/45 text-red-100/95 hover:bg-red-950/65"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHapusTarget(r);
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-slate-900/50 text-[11px] text-cyan-300/85">
          <span className="tabular-nums">
            {filteredRows.length === 0
              ? "Tidak ada baris"
              : `Menampilkan ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredRows.length)} dari ${filteredRows.length}`}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5">
              <span className="text-cyan-500/80">Per halaman</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-950/70 border border-cyan-800/70 rounded px-1.5 py-0.5 text-[11px]"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2 py-0.5 rounded border border-cyan-800/70 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="tabular-nums px-1 text-cyan-400/90">
                {totalPages > 0 ? `${page} / ${totalPages}` : "—"}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                className="px-2 py-0.5 rounded border border-cyan-800/70 bg-slate-900/80 hover:bg-slate-800 disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
        <p className="px-3 py-2 text-[10px] text-cyan-500/80 border-t border-slate-900/50">
          <strong>Keluarkan</strong> mengurangi stok Cathlab (FIFO) dan
          menambahkan baris ke{" "}
          <Link
            href={
              distributorIdParam !== ""
                ? `/distributor/panel-retur?distributor_id=${encodeURIComponent(distributorIdParam)}`
                : "/distributor/panel-retur"
            }
            className="text-amber-200/90 underline underline-offset-2"
          >
            Panel retur
          </Link>{" "}
          untuk diproses atau dibatalkan. Ringkasan ada di{" "}
          <Link
            href={
              distributorIdParam !== ""
                ? `/distributor/dashboard?distributor_id=${encodeURIComponent(distributorIdParam)}`
                : "/distributor/dashboard"
            }
            className="text-cyan-200/90 underline underline-offset-2"
          >
            Dashboard
          </Link>
          .
        </p>
      </div>

      <Dialog
        open={keluarkanTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            if (keluarkanLoading) return;
            setKeluarkanTarget(null);
            setKeluarkanQty("1");
          }
        }}
      >
        <DialogContent
          className="max-w-md border border-amber-500/25 bg-slate-950/95 p-6 text-cyan-100 shadow-[0_0_40px_rgba(212,175,55,0.12)] backdrop-blur-xl"
          onInteractOutside={(e) => {
            if (keluarkanLoading) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (keluarkanLoading) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (keluarkanLoading) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
              <Trash2
                className="h-5 w-5 text-amber-400/90 shrink-0"
                aria-hidden
              />
              Keluarkan stok ke panel retur
            </DialogTitle>
            <div className="space-y-2 text-sm leading-relaxed text-cyan-200/85">
              <p>
                Stok Cathlab akan{" "}
                <strong className="text-amber-200/90">dikurangi</strong> (FIFO).
                Baris masuk ke Panel retur sebagai <strong>draf</strong> — Anda
                bisa membatalkan atau menyelesaikan retur (batch) dari sana.
              </p>
              <div className="rounded-lg border border-cyan-800/50 bg-cyan-950/40 px-3 py-2.5 space-y-2.5 text-cyan-100">
                <div className="space-y-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-cyan-500/80">
                    Nama barang
                  </span>
                  <span className="block text-[15px] font-semibold leading-snug text-cyan-50">
                    {keluarkanTarget?.master_barang?.nama?.trim() ||
                      keluarkanTarget?.master_barang?.kode ||
                      "—"}
                  </span>
                </div>
                <p className="text-[12px] text-cyan-300/90">
                  Stok Cathlab tersedia:{" "}
                  <strong className="text-cyan-100 tabular-nums">
                    {Math.max(0, Number(keluarkanTarget?.stok_cathlab ?? 0))}
                  </strong>
                </p>
                <div className="grid grid-cols-1 gap-2 border-t border-cyan-800/40 pt-2.5 text-[12px] sm:grid-cols-3">
                  <div className="space-y-0.5">
                    <span className="block text-[10px] uppercase tracking-wide text-cyan-500/75">
                      Ukuran
                    </span>
                    <span className="block font-mono text-cyan-100/95 tabular-nums">
                      {keluarkanTarget?.ukuran?.trim() || "—"}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] uppercase tracking-wide text-cyan-500/75">
                      LOT
                    </span>
                    <span className="block font-mono text-[11px] text-cyan-100/95">
                      {keluarkanTarget?.lot?.trim() || "—"}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-[10px] uppercase tracking-wide text-cyan-500/75">
                      ED
                    </span>
                    <span className="block font-mono text-cyan-100/95">
                      {formatDistributorEdDisplay(keluarkanTarget?.ed)}
                    </span>
                  </div>
                </div>
              </div>
              {(keluarkanTarget?.master_barang?.kode ||
                keluarkanTarget?.kode_distributor) && (
                <p className="text-[11px] text-cyan-500/90 font-mono">
                  {keluarkanTarget?.master_barang?.kode
                    ? `Kode master: ${keluarkanTarget.master_barang.kode}`
                    : null}
                  {keluarkanTarget?.master_barang?.kode &&
                  keluarkanTarget?.kode_distributor
                    ? " · "
                    : ""}
                  {keluarkanTarget?.kode_distributor
                    ? `Kode dist.: ${keluarkanTarget.kode_distributor}`
                    : null}
                </p>
              )}
              <label className="block text-[12px] text-cyan-300/90 pt-2 space-y-1">
                <span className="text-cyan-200/90">
                  Jumlah dikeluarkan (qty)
                </span>
                <input
                  value={keluarkanQty}
                  onChange={(e) => setKeluarkanQty(e.target.value)}
                  type="number"
                  min={1}
                  max={Math.max(1, Number(keluarkanTarget?.stok_cathlab ?? 0))}
                  className="w-full mt-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] text-cyan-100 tabular-nums"
                />
              </label>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={keluarkanLoading}
              onClick={() => setKeluarkanTarget(null)}
              className="border border-slate-600/70 text-cyan-200 hover:bg-slate-800/80"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={keluarkanLoading}
              onClick={() => void confirmKeluarkanKePanel()}
              className="border border-amber-500/60 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50"
            >
              {keluarkanLoading ? "Memproses…" : "Tambah ke panel retur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={hapusTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            if (hapusLoading) return;
            setHapusTarget(null);
          }
        }}
      >
        <DialogContent
          className="max-w-md border border-red-500/30 bg-slate-950/95 p-6 text-cyan-100 shadow-[0_0_40px_rgba(239,68,68,0.12)] backdrop-blur-xl"
          onInteractOutside={(e) => {
            if (hapusLoading) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (hapusLoading) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (hapusLoading) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-300">
              <Trash2
                className="h-5 w-5 text-red-400/90 shrink-0"
                aria-hidden
              />
              Hapus produk distributor
            </DialogTitle>
            <div className="space-y-3 text-sm leading-relaxed text-cyan-200/85">
              <p>
                Baris mapping produk distributor akan{" "}
                <strong className="text-red-200/95">dihapus permanen</strong>{" "}
                dari katalog PT ini. Master barang RS dan stok inventaris
                Cathlab{" "}
                <strong className="text-cyan-200/90">tidak dihapus</strong>{" "}
                dari halaman ini.
              </p>
              <div className="rounded-lg border border-red-900/50 bg-red-950/25 px-3 py-2.5 text-[13px] text-cyan-50">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-red-400/85 mb-1">
                  Produk
                </span>
                {hapusTarget?.master_barang?.nama?.trim() ||
                  hapusTarget?.master_barang?.kode ||
                  "—"}
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={hapusLoading}
              onClick={() => setHapusTarget(null)}
              className="border border-slate-600/70 text-cyan-200 hover:bg-slate-800/80"
            >
              Batal
            </Button>
            <Button
              type="button"
              disabled={hapusLoading}
              onClick={() => void confirmHapusProduk()}
              className="border border-red-500/70 bg-red-950/50 text-red-100 hover:bg-red-900/45"
            >
              {hapusLoading ? "Menghapus…" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {modalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeProductModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-produk-distributor-title"
            className="w-full sm:max-w-2xl max-h-[90vh] overflow-hidden rounded-t-3xl sm:rounded-3xl border border-cyan-700/70 bg-slate-950/95 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div
                  id="modal-produk-distributor-title"
                  className="text-sm font-semibold text-cyan-100"
                >
                  {editing
                    ? "Edit Produk Distributor"
                    : "Tambah Produk Distributor"}
                </div>
                <div className="text-[11px] text-cyan-400/80">
                  {editing
                    ? "Ubah data mapping produk distributor."
                    : "Barang baru: nama & kode master di atas; harga & stok di bawah. Kategori alkes di bagian Produk distributor."}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  className="p-2 rounded-lg text-cyan-300 hover:text-cyan-100 hover:bg-slate-800/80"
                  aria-label="Tutup"
                  onClick={closeProductModal}
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="text-xs text-cyan-300 hover:text-cyan-100 px-2 py-1.5"
                  onClick={closeProductModal}
                >
                  Tutup
                </button>
              </div>
            </div>

            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                void submitProductModal();
              }}
            >
            <div className="flex-1 min-h-0 p-4 overflow-y-auto text-[12px] space-y-5">
              {editing ? (
                <div className="space-y-3">
                  <Labeled label="Nama barang">
                    <input
                      readOnly
                      value={selectedMasterLabel}
                      className="w-full bg-slate-900/50 border border-cyan-800/70 rounded-md px-2 py-1.5 text-cyan-100 cursor-default"
                    />
                  </Labeled>
                  <div className="text-[11px] text-cyan-300/80">
                    Kode master:{" "}
                    <span className="font-mono text-cyan-200">
                      {editing.master_barang?.kode ?? "—"}
                    </span>
                  </div>
                  <Labeled label="Barcode kemasan">
                    <input
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Scan / ketik barcode atau QR…"
                      autoComplete="off"
                      className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </Labeled>
                  <div className="text-[11px] font-medium text-cyan-200/90 pt-1 border-t border-slate-800/70">
                    Produk distributor
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-cyan-400/85 leading-relaxed">
                    Hanya untuk{" "}
                    <strong className="text-cyan-200">barang baru</strong>{" "}
                    (belum ada di master). Untuk menautkan ke master yang sudah
                    ada, koordinasikan dengan administrator RS.
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      <Labeled label="Nama barang">
                        <input
                          value={formNamaMasterBaru}
                          onChange={(e) =>
                            setFormNamaMasterBaru(e.target.value.toUpperCase())
                          }
                          placeholder="Nama di master RS"
                          className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </Labeled>
                      <Labeled label="Kode master (opsional)">
                        <input
                          value={formKodeMasterBaru}
                          onChange={(e) =>
                            setFormKodeMasterBaru(e.target.value)
                          }
                          placeholder="Kosong = otomatis (DM-NAMA-TGL-XXXX)"
                          className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                      </Labeled>
                    </div>
                    <Labeled label="Barcode (opsional)">
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          value={barcodeInput}
                          onChange={(e) => setBarcodeInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void applyByBarcode(barcodeInput);
                            }
                          }}
                          placeholder="Scan / ketik barcode atau QR"
                          autoComplete="off"
                          className="min-w-[10rem] flex-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 text-[12px] font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400"
                        />
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-md text-[11px] bg-slate-800/80 border border-slate-600 hover:bg-slate-800"
                          onClick={() => void applyByBarcode(barcodeInput)}
                          disabled={loadingModal}
                        >
                          Cek di master
                        </button>
                        <button
                          type="button"
                          title="Isi LOT, ukuran, ED dari pola barcode tanpa cek master"
                          className="px-2.5 py-1.5 rounded-md text-[11px] bg-cyan-950/60 border border-cyan-700/60 text-cyan-200 hover:bg-cyan-900/50"
                          onClick={() => {
                            const v = barcodeInput.trim();
                            if (!v) {
                              setBarcodeHint(
                                "Isi barcode dulu, lalu Isi otomatis.",
                              );
                              return;
                            }
                            setBarcodeHint(null);
                            applyBarcodeTemplateFields(v);
                            const t = parseDistributorKemasanBarcodeTemplate(v);
                            if (!t.ukuran && !t.ed) {
                              setBarcodeHint(
                                "LOT disamakan dengan barcode. Ukuran/ED tidak terbaca dari pola — isi manual jika perlu (ukuran: sering 9 digit terakhir = Ø×100 + panjang mm).",
                              );
                            } else {
                              setBarcodeHint(
                                "Kolom LOT, ukuran, dan/atau ED diisi dari template barcode — periksa sebelum simpan.",
                              );
                            }
                          }}
                          disabled={loadingModal}
                        >
                          Isi otomatis
                        </button>
                        <button
                          type="button"
                          className="px-2.5 py-1.5 rounded-md text-[11px] bg-slate-800/80 border border-slate-600 hover:bg-slate-800 inline-flex items-center gap-1"
                          onClick={() => {
                            setBarcodeHint(null);
                            if (
                              typeof window !== "undefined" &&
                              !("BarcodeDetector" in window)
                            ) {
                              setBarcodeHint(
                                "Gunakan Chrome/Edge untuk scan kamera.",
                              );
                              return;
                            }
                            setCameraScanOpen(true);
                          }}
                          disabled={loadingModal}
                        >
                          <ScanLine className="w-3.5 h-3.5" />
                          Kamera
                        </button>
                      </div>
                      {barcodeHint ? (
                        <p
                          className={
                            barcodeHint.startsWith("Master:")
                              ? "mt-1.5 text-[11px] text-emerald-300/95"
                              : "mt-1.5 text-[11px] text-amber-300/90"
                          }
                        >
                          {barcodeHint}
                        </p>
                      ) : null}
                    </Labeled>
                  </div>

                  <div className="text-[11px] font-medium text-cyan-200/90 pt-1 border-t border-slate-800/70">
                    Produk distributor
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Labeled label="Kode Distributor (opsional)">
                  <input
                    value={formKodeDistributor}
                    onChange={(e) => setFormKodeDistributor(e.target.value)}
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="mis. STENT-3.0-28"
                    disabled={false}
                  />
                </Labeled>
                <Labeled label="Status">
                  <select
                    value={formIsActive ? "1" : "0"}
                    onChange={(e) => setFormIsActive(e.target.value === "1")}
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="1">Aktif</option>
                    <option value="0">Nonaktif</option>
                  </select>
                </Labeled>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Labeled label="Kategori (alkes)">
                  <select
                    value={formKategoriAlkes}
                    onChange={(e) => setFormKategoriAlkes(e.target.value)}
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    <option value="">— Pilih —</option>
                    {DISTRIBUTOR_PRODUK_KATEGORI.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="LOT">
                  <input
                    value={formLot}
                    onChange={(e) =>
                      setFormLot(e.target.value.toUpperCase())
                    }
                    autoCapitalize="characters"
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 uppercase"
                    placeholder="Nomor batch / LOT"
                  />
                </Labeled>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Labeled label="Ukuran">
                  <input
                    value={formUkuran}
                    onChange={(e) => setFormUkuran(e.target.value)}
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="mis. 3.0 mm"
                  />
                </Labeled>
                <Labeled label="ED (kedaluwarsa)">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={formEd}
                    onChange={(e) => setFormEd(e.target.value)}
                    placeholder="09-2028"
                    maxLength={7}
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono placeholder:text-slate-600"
                  />
                  <span className="text-[10px] text-cyan-500/80 font-normal">
                    Bulan–tahun (MM-YYYY), 7 karakter — contoh 09-2028
                  </span>
                </Labeled>
              </div>

              <div
                className={`grid grid-cols-1 gap-3 ${editing ? "sm:grid-cols-2" : ""}`}
              >
                <Labeled label="Harga Distributor">
                  <input
                    value={formHargaJual}
                    onChange={(e) =>
                      setFormHargaJual(
                        formatDistributorHargaInputValue(e.target.value),
                      )
                    }
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 tabular-nums placeholder:text-slate-600"
                    placeholder="6.000.000"
                    disabled={false}
                  />
                  <span className="text-[10px] text-cyan-500/80 font-normal">
                    Otomatis pemisah ribuan (titik). Boleh tempel angka atau
                    teks dengan Rp.
                  </span>
                </Labeled>
                {editing ? (
                  <Labeled label="Penyesuaian inventaris Cathlab (+/−)">
                    <input
                      value={formStokDelta}
                      onChange={(e) => setFormStokDelta(e.target.value)}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="mis. 5 atau -2"
                      className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-400 tabular-nums"
                      disabled={false}
                    />
                    <span className="text-[10px] text-cyan-500/80 font-normal">
                      Positif menambah inventaris (MASUK ke baris tertua); negatif
                      mengurangi inventaris (FIFO). Kosongkan jika hanya mengubah
                      harga/data katalog.
                    </span>
                  </Labeled>
                ) : null}
              </div>

              <p className="text-[10px] text-cyan-500/85 leading-relaxed border-t border-slate-800/60 pt-3 mt-1">
                Kolom <strong className="text-cyan-300/90">Stok Cathlab</strong>{" "}
                di tabel dihitung dari{" "}
                <strong className="text-cyan-200/90">inventaris</strong>{" "}
                (agregat). Saat edit, gunakan field penyesuaian di atas untuk
                tambah/kurang inventaris; untuk retur terstruktur gunakan{" "}
                <strong className="text-amber-200/90">Aksi → Keluarkan</strong>{" "}
                dan <strong className="text-cyan-200/90">Panel retur</strong>.
              </p>
            </div>

            <div className="px-4 py-3 border-t border-slate-800/80 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80"
                onClick={closeProductModal}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loadingModal}
                className="px-5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-200 via-teal-200 to-cyan-200 text-slate-950 shadow-[0_0_26px_rgba(45,212,191,0.85),0_0_52px_rgba(34,211,238,0.45)] ring-1 ring-white/40 hover:from-emerald-100 hover:via-teal-100 hover:to-cyan-100 hover:shadow-[0_0_32px_rgba(34,211,238,0.95)] disabled:opacity-55"
              >
                {editing ? "Simpan" : "Tambah"}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {cameraScanOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4">
          <p className="text-[12px] text-cyan-200 mb-3 text-center max-w-sm">
            Arahkan kamera ke barcode atau QR. Izinkan akses kamera bila diminta
            (HTTPS atau localhost). Firefox/Safari bisa tidak mendukung — gunakan
            Chrome/Edge atau scanner USB.
          </p>
          <video
            ref={videoRef}
            className="w-full max-w-md rounded-lg border border-emerald-700/60 bg-black aspect-video object-cover"
            playsInline
            muted
          />
          <button
            type="button"
            className="mt-4 px-4 py-2 rounded-lg text-[12px] border border-slate-600 text-cyan-200 hover:bg-slate-900"
            onClick={() => setCameraScanOpen(false)}
          >
            Tutup kamera
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function DistributorBarangPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat daftar barang…
        </div>
      }
    >
      <DistributorBarangPageContent />
    </Suspense>
  );
}

function Th({
  children,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"th">) {
  return (
    <th className={`px-3 py-2 text-left font-semibold ${className}`} {...rest}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & ComponentPropsWithoutRef<"td">) {
  return (
    <td className={`px-3 py-2 ${className}`} {...rest}>
      {children}
    </td>
  );
}

function Labeled(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-cyan-300">
      <span className="font-semibold text-cyan-200">{props.label}</span>
      {props.children}
    </label>
  );
}
