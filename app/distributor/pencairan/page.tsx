"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ScanLine } from "lucide-react";
import {
  DISTRIBUTOR_PRODUK_KATEGORI,
  parseDistributorEdForSubmit,
  parseDistributorHargaForSubmit,
} from "@/lib/distributorCatalog";

type CatalogItem = {
  id: string;
  nama: string;
  kode: string;
  kategori: string | null;
  barcode: string | null;
};

function DistributorPencairanPageContent() {
  const searchParams = useSearchParams();
  const distributorIdParam = searchParams.get("distributor_id") ?? "";

  const [catalogQ, setCatalogQ] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeHint, setBarcodeHint] = useState<string | null>(null);
  const [cameraScanOpen, setCameraScanOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [formMasterBarangId, setFormMasterBarangId] = useState("");
  const [formKodeDistributor, setFormKodeDistributor] = useState("");
  const [formKategoriAlkes, setFormKategoriAlkes] = useState("");
  const [formLot, setFormLot] = useState("");
  const [formUkuran, setFormUkuran] = useState("");
  const [formEd, setFormEd] = useState("");
  const [formHargaJual, setFormHargaJual] = useState("");
  const [formMinStok, setFormMinStok] = useState("0");
  const [formIsActive, setFormIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const adminNeedsDist = adminView && !distributorIdParam;

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

  const applyByBarcode = useCallback(async (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setLoading(true);
    setBarcodeHint(null);
    try {
      const res = await fetch(
        `/api/distributor/produk/catalog?barcode=${encodeURIComponent(v)}`,
        { cache: "no-store" },
      );
      const j = await res.json();
      const list = (j?.data ?? []) as CatalogItem[];
      if (!j?.ok) {
        setBarcodeHint(j?.message ?? "Gagal mencari barcode");
        return;
      }
      if (list.length === 0) {
        setBarcodeHint(`Tidak ada master dengan barcode: ${v}`);
        return;
      }
      if (list.length === 1) {
        const item = list[0];
        setFormMasterBarangId(String(item.id));
        setCatalog(list);
        setCatalogQ(String(item.nama ?? v));
        setBarcodeInput((prev) =>
          prev.trim() ? prev.trim() : String(item.barcode ?? v).trim(),
        );
        setBarcodeHint(`Terpilih: ${item.nama} (${item.kode})`);
        return;
      }
      setCatalog(list);
      setBarcodeHint("Beberapa hasil — pilih satu di daftar.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          "Browser tidak mendukung Scan kamera (Chrome/Edge disarankan).",
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
        const detector = new Detector({
          formats: [
            "code_128",
            "code_39",
            "ean_13",
            "ean_8",
            "qr_code",
            "upc_a",
            "upc_e",
          ],
        });
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
        setBarcodeHint("Akses kamera ditolak atau tidak tersedia.");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      if (video.srcObject) video.srcObject = null;
    };
  }, [cameraScanOpen, applyByBarcode]);

  const barangHref =
    adminView && distributorIdParam
      ? `/distributor/barang?distributor_id=${encodeURIComponent(distributorIdParam)}`
      : "/distributor/barang";

  const resetForm = () => {
    setFormMasterBarangId("");
    setCatalog([]);
    setCatalogQ("");
    setBarcodeInput("");
    setBarcodeHint(null);
    setFormKodeDistributor("");
    setFormKategoriAlkes("");
    setFormLot("");
    setFormUkuran("");
    setFormEd("");
    setFormHargaJual("");
    setFormMinStok("0");
    setFormIsActive(true);
  };

  const selectedMaster = catalog.find((c) => String(c.id) === formMasterBarangId);

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-[#D4AF37]">Pencairan</h1>
        <p className="text-[12px] text-cyan-300/70 mt-1">
          Tautkan produk distributor ke <strong>barang master</strong> yang sudah
          ada (cari / scan barcode / pilih nama). Untuk membuat master baru,
          gunakan{" "}
          <Link href={barangHref} className="text-cyan-400 underline underline-offset-2">
            Barang → Tambah Produk
          </Link>
          .
        </p>
        {adminNeedsDist ? (
          <p className="text-[11px] text-amber-300/90 mt-2">
            Pilih distributor di header untuk menyimpan.
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-cyan-900/60 bg-slate-950/40 p-4 space-y-4 text-[12px]">
        <div className="text-[11px] font-medium text-cyan-200/90 border-b border-slate-800/70 pb-2">
          Cari barang master
        </div>

        <Labeled label="Barcode → cari di master">
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
              placeholder="Scan / ketik"
              autoComplete="off"
              className="min-w-[10rem] flex-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 font-mono text-[12px]"
            />
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-md text-[11px] bg-cyan-500/15 border border-cyan-500/40"
              onClick={() => void applyByBarcode(barcodeInput)}
              disabled={loading}
            >
              Cari
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-md text-[11px] border border-slate-600 inline-flex items-center gap-1"
              onClick={() => {
                setBarcodeHint(null);
                if (
                  typeof window !== "undefined" &&
                  !("BarcodeDetector" in window)
                ) {
                  setBarcodeHint("Gunakan Chrome/Edge untuk scan kamera.");
                  return;
                }
                setCameraScanOpen(true);
              }}
              disabled={loading}
            >
              <ScanLine className="w-3.5 h-3.5" />
              Kamera
            </button>
          </div>
          {barcodeHint ? (
            <p
              className={
                barcodeHint.startsWith("Terpilih")
                  ? "mt-1.5 text-[11px] text-emerald-300/95"
                  : "mt-1.5 text-[11px] text-amber-300/90"
              }
            >
              {barcodeHint}
            </p>
          ) : null}
        </Labeled>

        <Labeled label="Cari nama / kode">
          <div className="flex gap-2">
            <input
              value={catalogQ}
              onChange={(e) => setCatalogQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void (async () => {
                    setLoading(true);
                    try {
                      const res = await fetch(
                        `/api/distributor/produk/catalog?q=${encodeURIComponent(catalogQ)}`,
                      );
                      const json = await res.json();
                      setCatalog(json?.data ?? []);
                    } finally {
                      setLoading(false);
                    }
                  })();
                }
              }}
              placeholder="Ketik lalu Cari"
              className="flex-1 bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
            />
            <button
              type="button"
              className="px-3 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 shrink-0"
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await fetch(
                    `/api/distributor/produk/catalog?q=${encodeURIComponent(catalogQ)}`,
                  );
                  const json = await res.json();
                  setCatalog(json?.data ?? []);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Cari
            </button>
          </div>
        </Labeled>

        <div className="rounded-lg border border-slate-800/80 overflow-hidden max-h-52 overflow-y-auto">
          {catalog.length === 0 ? (
            <div className="px-3 py-3 text-center text-cyan-300/55 text-[11px]">
              {loading ? "Memuat…" : "Cari atau pilih dari hasil."}
            </div>
          ) : (
            catalog.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setFormMasterBarangId(String(c.id));
                  setBarcodeInput((prev) =>
                    prev.trim() ? prev : String(c.barcode ?? "").trim(),
                  );
                }}
                className={[
                  "w-full text-left px-3 py-2 border-b border-slate-800/80 last:border-0 hover:bg-cyan-900/10",
                  formMasterBarangId === c.id ? "bg-cyan-500/10" : "",
                ].join(" ")}
              >
                <div className="font-medium text-cyan-100">{c.nama}</div>
                <div className="text-[10px] text-cyan-300/65">
                  {c.kode} • {c.kategori ?? "-"}
                  {c.barcode ? ` • ${c.barcode}` : ""}
                </div>
              </button>
            ))
          )}
        </div>

        {formMasterBarangId && selectedMaster ? (
          <div className="text-[11px] text-emerald-200/90 rounded-md border border-emerald-800/40 bg-emerald-950/20 px-3 py-2">
            Master terpilih: <strong>{selectedMaster.nama}</strong> (
            {selectedMaster.kode})
          </div>
        ) : (
          <p className="text-[11px] text-rose-300/90">
            Pilih satu baris di atas untuk melanjutkan.
          </p>
        )}

        <div className="text-[11px] font-medium text-cyan-200/90 pt-2 border-t border-slate-800/70">
          Produk distributor
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Labeled label="Kode Distributor (opsional)">
            <input
              value={formKodeDistributor}
              onChange={(e) => setFormKodeDistributor(e.target.value)}
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
              placeholder="mis. STENT-3.0-28"
            />
          </Labeled>
          <Labeled label="Status">
            <select
              value={formIsActive ? "1" : "0"}
              onChange={(e) => setFormIsActive(e.target.value === "1")}
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
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
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
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
              onChange={(e) => setFormLot(e.target.value)}
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
              placeholder="Nomor batch / LOT"
            />
          </Labeled>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Labeled label="Ukuran">
            <input
              value={formUkuran}
              onChange={(e) => setFormUkuran(e.target.value)}
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
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
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 font-mono"
            />
            <span className="text-[10px] text-cyan-500/80 font-normal">
              Bulan–tahun saja (7 karakter), contoh 09-2028
            </span>
          </Labeled>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Labeled label="Harga Distributor">
            <input
              value={formHargaJual}
              onChange={(e) => setFormHargaJual(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5 tabular-nums placeholder:text-slate-600"
              placeholder="Rp 3.000.000"
            />
            <span className="text-[10px] text-cyan-500/80 font-normal">
              Angka rupiah (boleh titik atau tempel dengan Rp), contoh 3 juta:
              3000000 atau 3.000.000
            </span>
          </Labeled>
          <Labeled label="Min Stok (untuk stok-menipis)">
            <input
              value={formMinStok}
              onChange={(e) => setFormMinStok(e.target.value)}
              type="number"
              min={0}
              className="w-full bg-slate-950/70 border border-cyan-800/70 rounded-md px-2 py-1.5"
            />
          </Labeled>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            type="button"
            className="px-3 py-1.5 rounded-full text-xs border border-slate-700 text-cyan-200 hover:bg-slate-900/80"
            onClick={resetForm}
          >
            Reset
          </button>
          <button
            type="button"
            disabled={loading || !formMasterBarangId || adminNeedsDist}
            className="px-4 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 text-black disabled:opacity-50"
            onClick={async () => {
              if (!formMasterBarangId) {
                alert("Pilih barang master terlebih dahulu.");
                return;
              }
              const edParsed = parseDistributorEdForSubmit(formEd);
              if (!edParsed.ok) {
                alert(edParsed.message);
                return;
              }
              setLoading(true);
              try {
                const payload: Record<string, unknown> = {
                  master_barang_id: formMasterBarangId,
                  kode_distributor: formKodeDistributor
                    ? formKodeDistributor
                    : null,
                  harga_jual: parseDistributorHargaForSubmit(formHargaJual),
                  min_stok: formMinStok === "" ? 0 : Number(formMinStok),
                  is_active: formIsActive,
                  barcode: barcodeInput.trim() || null,
                  kategori: formKategoriAlkes || null,
                  lot: formLot.trim() || null,
                  ukuran: formUkuran.trim() || null,
                  ed: edParsed.value,
                };
                if (distributorIdParam)
                  payload.distributor_id = distributorIdParam;
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
                      : "Gagal menyimpan",
                  );
                  return;
                }
                alert("Produk distributor tersimpan.");
                resetForm();
              } finally {
                setLoading(false);
              }
            }}
          >
            Simpan
          </button>
        </div>
      </div>

      {cameraScanOpen ? (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 p-4">
          <p className="text-[12px] text-cyan-200 mb-3 text-center max-w-sm">
            Arahkan kamera ke barcode (Chrome/Edge).
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

export default function DistributorPencairanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-cyan-500/80 text-sm">
          Memuat pencairan…
        </div>
      }
    >
      <DistributorPencairanPageContent />
    </Suspense>
  );
}

function Labeled(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] text-cyan-300">
      <span className="text-cyan-200 font-medium">{props.label}</span>
      {props.children}
    </label>
  );
}
