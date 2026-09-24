"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Search,
  Scan,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Filter,
  RefreshCw,
  X,
  GitMerge,
} from "lucide-react";
import ScanCameraModal from "@/components/stok-opname/ScanCameraModal";
import HardwareScannerListener from "@/components/stok-opname/HardwareScannerListener";
import { calculateEDStatus, parseGS1Barcode, ParsedGS1Data } from "@/lib/utils/gs1Parser";

export interface StokOpnameItemRow {
  id: string;
  barang_id?: string | null;
  kode_barcode: string;
  nama_barang: string;
  kategori: "Medis" | "Non-Medis";
  satuan: string;
  lot_number: string;
  expired_date: string; // YYYY-MM-DD
  stok_sistem: number;
  stok_fisik: number;
  selisih: number;
  status_ed: "Aman" | "Mendekati" | "Expired" | "Non-ED";
  catatan: string;
  is_unregistered_master?: boolean;
}

const BULAN_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export default function StokOpnameSessionView() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // State Filters
  const [selectedBulan, setSelectedBulan] = useState<number>(currentMonth);
  const [selectedTahun, setSelectedTahun] = useState<number>(currentYear);
  const [selectedLokasi, setSelectedLokasi] = useState<string>("Cathlab");
  const [selectedKategori, setSelectedKategori] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sesi Opname Data State (Murni data real dari DB)
  const [nomorSesi, setNomorSesi] = useState<string>(
    `SO-${currentYear}${String(currentMonth).padStart(2, "0")}-001`
  );
  const [items, setItems] = useState<StokOpnameItemRow[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [loadingDB, setLoadingDB] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);

  // Master Barang Live Search State
  const [masterSearchResults, setMasterSearchResults] = useState<any[]>([]);
  const [isSearchingMaster, setIsSearchingMaster] = useState(false);
  const [showMasterDropdown, setShowMasterDropdown] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setMasterSearchResults([]);
      setIsSearchingMaster(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMaster(true);
      try {
        const res = await fetch(`/api/distributor/produk/catalog?search=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setMasterSearchResults(json.data.slice(0, 5));
        } else {
          setMasterSearchResults([]);
        }
      } catch {
        setMasterSearchResults([]);
      } finally {
        setIsSearchingMaster(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Connectivity Listener
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

function cleanBarcodeKey(str?: string | null): string {
  if (!str) return "";
  return str.trim().replace(/^\][a-zA-Z0-9]{2}/, "").toLowerCase();
}

  // Fetch Real Data Sesi & Items dari Supabase Database API
  const loadDataFromDB = useCallback(async () => {
    setLoadingDB(true);
    try {
      const queryParams = new URLSearchParams({
        bulan: String(selectedBulan),
        tahun: String(selectedTahun),
        lokasi: selectedLokasi,
      });

      const res = await fetch(`/api/stok-opname?${queryParams.toString()}`);
      const json = await res.json();

      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        // Gunakan sesi terbaru di bulan ini
        const activeSesi = json.data[0];
        setNomorSesi(activeSesi.nomor_sesi);

        if (Array.isArray(activeSesi.stok_opname_item)) {
          const loadedItems: StokOpnameItemRow[] = activeSesi.stok_opname_item.map((it: any) => ({
            id: it.id || `item-${Math.random()}`,
            barang_id: it.barang_id,
            kode_barcode: it.kode_barcode,
            nama_barang: it.nama_barang,
            kategori: it.kategori || "Medis",
            satuan: it.satuan || "Pcs",
            lot_number: it.lot_number || "-",
            expired_date: it.expired_date || "",
            stok_sistem: Number(it.stok_sistem) || 0,
            stok_fisik: Number(it.stok_fisik) || 0,
            selisih: Number(it.selisih) || 0,
            status_ed: it.status_ed || calculateEDStatus(it.expired_date),
            catatan: it.catatan || "",
          }));

          setItems((prevItems) => {
            if (prevItems.length === 0) return loadedItems;
            const prevMap = new Map(
              prevItems.map((p) => [cleanBarcodeKey(p.kode_barcode), p])
            );
            return loadedItems.map((dbItem) => {
              const key = cleanBarcodeKey(dbItem.kode_barcode);
              const prev = prevMap.get(key);
              if (prev) {
                const hasCustomName =
                  prev.nama_barang &&
                  !prev.nama_barang.startsWith("Barang (GTIN:") &&
                  prev.nama_barang !== dbItem.nama_barang;
                return {
                  ...dbItem,
                  nama_barang: hasCustomName ? prev.nama_barang : dbItem.nama_barang,
                  kategori: prev.kategori || dbItem.kategori,
                  lot_number:
                    prev.lot_number && prev.lot_number !== "-"
                      ? prev.lot_number
                      : dbItem.lot_number,
                  expired_date: prev.expired_date || dbItem.expired_date,
                };
              }
              return dbItem;
            });
          });
        } else {
          setItems([]);
        }
      } else {
        // Jika belum ada data di DB untuk bulan ini, gunakan state bersih (tanpa dummy)
        setNomorSesi(`SO-${selectedTahun}${String(selectedBulan).padStart(2, "0")}-001`);
        setItems([]);
      }
    } catch (e: any) {
      console.error("Gagal memuat data dari DB:", e);
      setItems([]);
    } finally {
      setLoadingDB(false);
    }
  }, [selectedBulan, selectedTahun, selectedLokasi]);

  useEffect(() => {
    void loadDataFromDB();
  }, [loadDataFromDB]);

  // Web Audio Synthesizer Beep Sound Helper
  const playBeepSound = (type: "success" | "warning") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch 880Hz
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.type = "square";
        osc.frequency.setValueAtTime(440, ctx.currentTime); // Low warning 440Hz
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      /* ignore audio context restrictions */
    }
  };

  // Export Opname Table Data to Excel / CSV
  const exportToCSV = () => {
    if (items.length === 0) {
      alert("Belum ada data barang di tabel opname untuk di-ekspor.");
      return;
    }

    const headers = [
      "No",
      "Kode Barcode/GS1",
      "Nama Barang",
      "Kategori",
      "Satuan",
      "Lot/Batch",
      "Expired Date",
      "Status ED",
      "Stok Sistem",
      "Stok Fisik",
      "Selisih",
      "Status Master RS",
      "Catatan",
    ];

    const rows = items.map((it, idx) => [
      idx + 1,
      `"${it.kode_barcode || ""}"`,
      `"${(it.nama_barang || "").replace(/"/g, '""')}"`,
      `"${it.kategori || "Medis"}"`,
      `"${it.satuan || "Pcs"}"`,
      `"${it.lot_number || "-"}"`,
      `"${it.expired_date || "-"}"`,
      `"${it.status_ed || "-"}"`,
      it.stok_sistem || 0,
      it.stok_fisik || 0,
      it.selisih || 0,
      it.is_unregistered_master ? "Belum Terdaftar Master" : "Terdaftar Master",
      `"${(it.catatan || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((e) => e.join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Laporan_Stok_Opname_${nomorSesi}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSavingStatus("📊 Berhasil mengunduh Laporan Stok Opname (CSV/Excel)!");
    setTimeout(() => setSavingStatus(null), 3500);
  };

  // Handlers for Add / Update Scanned Item
  const handleBarcodeDecoded = useCallback((parsed: ParsedGS1Data) => {
    const rawKey = cleanBarcodeKey(parsed.raw);
    const gtinKey = cleanBarcodeKey(parsed.gtin);
    const targetGtin = parsed.gtin || parsed.raw;

    let targetItemId: string | null = null;

    setItems((prevItems) => {
      const existingIdx = prevItems.findIndex((it) => {
        const k = cleanBarcodeKey(it.kode_barcode);
        return k === gtinKey || k === rawKey;
      });

      if (existingIdx !== -1) {
        // Auto increment stok fisik +1
        const updated = [...prevItems];
        const item = { ...updated[existingIdx] };
        item.stok_fisik += 1;
        item.selisih = item.stok_fisik - item.stok_sistem;
        if (parsed.expiryDate) {
          item.expired_date = parsed.expiryDate;
          item.status_ed = calculateEDStatus(parsed.expiryDate);
        }
        if (parsed.lotNumber) item.lot_number = parsed.lotNumber;
        updated[existingIdx] = item;
        targetItemId = item.id;
        setSavingStatus(`🟢 Scanned: "${item.nama_barang}" -> Stok Fisik bertambah (+1) = ${item.stok_fisik}`);
        return updated;
      } else {
        // Tambah item baru
        const edDate = parsed.expiryDate || "";
        const newItem: StokOpnameItemRow = {
          id: `item-${Date.now()}`,
          kode_barcode: targetGtin,
          nama_barang: `Barang (GTIN: ${targetGtin})`,
          kategori: "Medis",
          satuan: "Pcs",
          lot_number: parsed.lotNumber || "-",
          expired_date: edDate,
          stok_sistem: 0,
          stok_fisik: 1,
          selisih: 1,
          status_ed: calculateEDStatus(edDate),
          catatan: "Hasil Scan (Mencari di Master...)",
          is_unregistered_master: true,
        };
        targetItemId = newItem.id;
        setSavingStatus(`⚠️ Scanned: Barcode "${targetGtin}" ditambahkan ke Tabel Opname (Stok Fisik: 1). Mencari data Master RS...`);
        return [newItem, ...prevItems];
      }
    });

    if (targetItemId) {
      setLastScannedId(targetItemId);
      setTimeout(() => setLastScannedId(null), 2500);
    }

    // Otomatis cari katalog nama barang di Master RS
    if (targetGtin) {
      void fetch(`/api/distributor/produk/catalog?search=${encodeURIComponent(targetGtin)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
            const found = json.data[0];
            if (found && found.nama) {
              playBeepSound("success");
              setItems((prev) =>
                prev.map((it) => {
                  const k = cleanBarcodeKey(it.kode_barcode);
                  if (k === cleanBarcodeKey(targetGtin) || k === cleanBarcodeKey(parsed.raw)) {
                    return {
                      ...it,
                      nama_barang: found.nama,
                      kategori: (found.kategori as any) || it.kategori,
                      is_unregistered_master: false,
                      catatan: "Terdaftar Master RS",
                    };
                  }
                  return it;
                })
              );
              setSavingStatus(`🟢 Scanned: "${found.nama}" (Terdaftar di Master RS) -> Stok Fisik: 1`);
            }
          } else {
            // TIDAK DITEMUKAN DI MASTER BARANG
            playBeepSound("warning");
            setItems((prev) =>
              prev.map((it) => {
                const k = cleanBarcodeKey(it.kode_barcode);
                if (k === cleanBarcodeKey(targetGtin) || k === cleanBarcodeKey(parsed.raw)) {
                  return {
                    ...it,
                    is_unregistered_master: true,
                    catatan: "⚠️ Belum terdaftar di Master RS",
                  };
                }
                return it;
              })
            );
            setSavingStatus(
              `⚠️ PERINGATAN: Barcode "${targetGtin}" TIDAK TERDAFTAR di Master RS, tetapi TETAP ditambahkan ke Tabel Hasil Pemindaian (Stok Fisik: 1). Anda dapat mengedit nama barang secara manual.`
            );
          }
        })
        .catch(() => {
          playBeepSound("success");
        });
    }
  }, []);

  const addItemFromMaster = (masterItem: any) => {
    const barcode = masterItem.barcode || masterItem.kode || `MB-${Date.now()}`;
    handleBarcodeDecoded({
      raw: barcode,
      gtin: barcode,
      expiryDate: null,
      lotNumber: null,
      serialNumber: null,
      isGS1: false,
    });

    setItems((prev) =>
      prev.map((it) => {
        if (cleanBarcodeKey(it.kode_barcode) === cleanBarcodeKey(barcode)) {
          return {
            ...it,
            nama_barang: masterItem.nama || it.nama_barang,
            kategori: (masterItem.kategori as any) || it.kategori || "Medis",
            satuan: masterItem.satuan || it.satuan || "Pcs",
          };
        }
        return it;
      })
    );

    setSearchQuery("");
    setShowMasterDropdown(false);
    setSavingStatus(`🟢 Barang "${masterItem.nama}" ditambahkan ke tabel opname!`);
    setTimeout(() => setSavingStatus(null), 3500);
  };

  // Inline Table Edit Handlers
  const updateItemField = (id: string, field: keyof StokOpnameItemRow, value: any) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };

        if (field === "stok_fisik" || field === "stok_sistem") {
          const fis = Number(field === "stok_fisik" ? value : updated.stok_fisik) || 0;
          const sys = Number(field === "stok_sistem" ? value : updated.stok_sistem) || 0;
          updated.stok_fisik = fis;
          updated.stok_sistem = sys;
          updated.selisih = fis - sys;
        }

        if (field === "expired_date") {
          updated.status_ed = calculateEDStatus(String(value));
        }

        return updated;
      })
    );
  };

  const deleteItem = async (id: string) => {
    setItems((prevItems) => prevItems.filter((it) => it.id !== id));
    // Jika ID merupakan UUID DB (bukan item-temp), hapus juga dari DB
    if (!id.startsWith("item-")) {
      try {
        await fetch(`/api/stok-opname?itemId=${id}`, { method: "DELETE" });
      } catch {
        /* ignore delete error */
      }
    }
  };

  const resetAllItems = () => {
    if (confirm("Apakah Anda yakin ingin mengosongkan seluruh tabel opname ini?")) {
      setItems([]);
    }
  };

  // Metrics Auto-Calculation
  const metrics = useMemo(() => {
    const totalSKU = items.length;
    const totalFisik = items.reduce((acc, it) => acc + (it.stok_fisik || 0), 0);
    const totalSurplus = items.filter((it) => it.selisih > 0).length;
    const totalDefisit = items.filter((it) => it.selisih < 0).length;
    const totalSesuai = items.filter((it) => it.selisih === 0).length;

    const totalAman = items.filter((it) => it.status_ed === "Aman").length;
    const totalMendekati = items.filter((it) => it.status_ed === "Mendekati").length;
    const totalExpired = items.filter((it) => it.status_ed === "Expired").length;

    return {
      totalSKU,
      totalFisik,
      totalSurplus,
      totalDefisit,
      totalSesuai,
      totalAman,
      totalMendekati,
      totalExpired,
    };
  }, [items]);

  // Duplicate Item Name Grouping & Manual Merge Handlers
  const duplicateCountsMap = useMemo(() => {
    const counts = new Map<string, number>();
    items.forEach((it) => {
      const key = it.nama_barang.trim().toLowerCase();
      if (key && !key.startsWith("barang (gtin:")) {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return counts;
  }, [items]);

  const totalDuplicateGroupCount = useMemo(() => {
    let count = 0;
    duplicateCountsMap.forEach((val) => {
      if (val > 1) count++;
    });
    return count;
  }, [duplicateCountsMap]);

  const mergeDuplicatesByName = useCallback((targetNamaBarang: string) => {
    const targetKey = targetNamaBarang.trim().toLowerCase();
    if (!targetKey) return;

    setItems((prevItems) => {
      const matchingItems = prevItems.filter(
        (it) => it.nama_barang.trim().toLowerCase() === targetKey
      );

      if (matchingItems.length <= 1) return prevItems;

      const mergedStokFisik = matchingItems.reduce((acc, it) => acc + (it.stok_fisik || 0), 0);
      const mergedStokSistem = matchingItems.reduce((acc, it) => acc + (it.stok_sistem || 0), 0);

      const allBarcodes = Array.from(
        new Set(matchingItems.map((it) => it.kode_barcode).filter(Boolean))
      ).join(", ");

      const allLots =
        Array.from(
          new Set(matchingItems.map((it) => it.lot_number).filter((l) => l && l !== "-"))
        ).join(", ") || "-";

      const validEDs = matchingItems
        .map((it) => it.expired_date)
        .filter((d) => d && d.length > 0)
        .sort();
      const mergedED = validEDs.length > 0 ? validEDs[0] : "";

      const primary = matchingItems[0];
      const mergedItem: StokOpnameItemRow = {
        ...primary,
        kode_barcode: allBarcodes || primary.kode_barcode,
        lot_number: allLots,
        expired_date: mergedED,
        stok_sistem: mergedStokSistem,
        stok_fisik: mergedStokFisik,
        selisih: mergedStokFisik - mergedStokSistem,
        status_ed: calculateEDStatus(mergedED),
        catatan: `Hasil gabungan ${matchingItems.length} baris`,
        is_unregistered_master: matchingItems.some((it) => it.is_unregistered_master),
      };

      const result: StokOpnameItemRow[] = [];
      let mergedAdded = false;

      for (const item of prevItems) {
        if (item.nama_barang.trim().toLowerCase() === targetKey) {
          if (!mergedAdded) {
            result.push(mergedItem);
            mergedAdded = true;
          }
        } else {
          result.push(item);
        }
      }

      setSavingStatus(
        `🟢 Berhasil menggabungkan ${matchingItems.length} baris "${primary.nama_barang}" menjadi 1 baris (Total Stok Fisik: ${mergedStokFisik})`
      );
      setTimeout(() => setSavingStatus(null), 4500);

      return result;
    });
  }, []);

  const mergeAllDuplicates = useCallback(() => {
    duplicateCountsMap.forEach((count, key) => {
      if (count > 1) {
        const found = items.find((it) => it.nama_barang.trim().toLowerCase() === key);
        if (found) {
          mergeDuplicatesByName(found.nama_barang);
        }
      }
    });
  }, [duplicateCountsMap, items, mergeDuplicatesByName]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchKategori =
        selectedKategori === "Semua" || item.kategori === selectedKategori;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        item.nama_barang.toLowerCase().includes(q) ||
        item.kode_barcode.toLowerCase().includes(q) ||
        item.lot_number.toLowerCase().includes(q);
      return matchKategori && matchSearch;
    });
  }, [items, selectedKategori, searchQuery]);

  // Pagination Logic
  const totalItemsCount = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / pageSize));
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  // Save Sesi to API & DB Permanen
  const saveSessionToDB = async () => {
    setSavingStatus("Menyimpan ke Database...");
    try {
      const res = await fetch("/api/stok-opname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomor_sesi: nomorSesi,
          lokasi: selectedLokasi,
          jenis_kategori: selectedKategori,
          status: "Draft",
          items: items,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSavingStatus("🟢 Berhasil Disimpan & Disinkronkan ke Database!");
        setTimeout(() => setSavingStatus(null), 4000);
        void loadDataFromDB();
      } else {
        setSavingStatus(`🔴 Error: ${json.error}`);
      }
    } catch (e: any) {
      setSavingStatus(`🔴 Gagal menghubungkan ke server: ${e.message}`);
    }
  };

  return (
    <div className="space-y-5 text-white dark:text-white">
      {/* Global Keyboard Hardware Scanner Listener */}
      <HardwareScannerListener enabled={!isCameraOpen} onScan={handleBarcodeDecoded} />

      {/* Camera Scanner Modal */}
      <ScanCameraModal
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onDecoded={handleBarcodeDecoded}
      />

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-cyan-800/50 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold text-[#E8C547] flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-cyan-300" aria-hidden />
            Stok Opname Inventaris (Medis &amp; Non-Medis)
          </h1>
          <p className="text-xs text-white/85 dark:text-white/85 mt-1">
            Sesi Active: <strong className="text-cyan-300 font-mono">{nomorSesi}</strong> |
            Lokasi: <span className="text-emerald-300">{selectedLokasi}</span>
          </p>
        </div>

        {/* Connectivity Status & Reload Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={loadDataFromDB}
            disabled={loadingDB}
            className="px-2.5 py-1.5 rounded-xl border border-cyan-700/50 bg-slate-950/80 text-cyan-300 hover:bg-slate-800 flex items-center gap-1"
            title="Muat Ulang Data DB"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingDB ? "animate-spin" : ""}`} />
            {loadingDB ? "Memuat DB..." : "Refresh DB"}
          </button>
          <div className="flex items-center gap-1.5 text-xs bg-slate-950/80 px-3 py-1.5 rounded-xl border border-cyan-700/50">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Wifi className="h-4 w-4" /> Online DB
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400">
                <WifiOff className="h-4 w-4" /> Offline Cache
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar Filter & Actions */}
      <div className="rounded-2xl border border-cyan-900/70 bg-slate-950/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left Controls: Periode Bulan & Filter */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-cyan-800/60">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <select
                value={selectedBulan}
                onChange={(e) => {
                  setSelectedBulan(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none cursor-pointer"
              >
                {BULAN_OPTIONS.map((b) => (
                  <option key={b.value} value={b.value} className="bg-slate-900 text-white">
                    {b.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedTahun}
                onChange={(e) => {
                  setSelectedTahun(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-transparent text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none cursor-pointer"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y} className="bg-slate-900 text-white">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1.5 rounded-xl border border-cyan-800/60">
              <Layers className="h-4 w-4 text-cyan-400" />
              <select
                value={selectedKategori}
                onChange={(e) => {
                  setSelectedKategori(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none cursor-pointer"
              >
                <option value="Semua" className="bg-slate-900 text-white">
                  Semua Kategori
                </option>
                <option value="Medis" className="bg-slate-900 text-white">
                  Alat Medis / Farmasi
                </option>
                <option value="Non-Medis" className="bg-slate-900 text-white">
                  Non-Medis / ATK
                </option>
              </select>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {totalDuplicateGroupCount > 0 && (
              <button
                type="button"
                onClick={mergeAllDuplicates}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600/30 border border-indigo-400/60 text-indigo-100 hover:bg-indigo-600/50 flex items-center gap-1.5 transition-all shadow-md"
                title="Gabungkan semua kelompok barang yang memiliki nama sama"
              >
                <GitMerge className="h-4 w-4 text-indigo-300" />
                Gabungkan All Duplikat ({totalDuplicateGroupCount})
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Scan className="h-4 w-4 text-emerald-400" />
              Scan Kamera HP
            </button>

            {items.length > 0 && (
              <button
                type="button"
                onClick={resetAllItems}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 transition-colors"
                title="Kosongkan Tabel"
              >
                Bersihkan Tabel
              </button>
            )}

            <button
              type="button"
              onClick={exportToCSV}
              disabled={items.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/30 border border-emerald-400/60 text-emerald-100 hover:bg-emerald-600/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-all shadow-md"
              title="Unduh Laporan Stok Opname format Excel/CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-300" />
              Ekspor Excel / CSV
            </button>

            <button
              type="button"
              onClick={saveSessionToDB}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600/30 border border-cyan-400/60 text-cyan-100 hover:bg-cyan-600/40 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Save className="h-4 w-4 text-cyan-300" />
              Simpan ke Database
            </button>
          </div>
        </div>

        {/* Search Bar Input & Master Barang Live Suggestions */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setShowMasterDropdown(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = searchQuery.trim();
                if (val.length >= 3) {
                  e.preventDefault();
                  const parsed = parseGS1Barcode(val);
                  handleBarcodeDecoded(parsed);
                  setSearchQuery("");
                  setShowMasterDropdown(false);
                }
              }
            }}
            onChange={(e) => {
              const val = e.target.value;
              // Deteksi otomatis jika teks berformat GS1 atau barcode ditembakkan dari Gun
              if (val.startsWith("01") && val.length >= 24) {
                const parsed = parseGS1Barcode(val);
                handleBarcodeDecoded(parsed);
                setSearchQuery("");
                setShowMasterDropdown(false);
                return;
              }
              setSearchQuery(val);
              setShowMasterDropdown(true);
              setPage(1);
            }}
            placeholder="Scan Barcode Gun / GS1 / Ketik nama barang untuk filter atau cari Master RS..."
            className="w-full pl-9 pr-9 py-2 bg-slate-950/80 border border-cyan-800/60 rounded-xl text-xs text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none focus:ring-1 focus:ring-cyan-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setShowMasterDropdown(false);
                setPage(1);
              }}
              className="absolute right-3 top-2.5 text-white/50 hover:text-white transition-colors"
              title="Hapus pencarian"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Master Barang Live Suggestion Panel */}
          {showMasterDropdown && searchQuery.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-cyan-700/80 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
              <div className="px-3 py-1.5 bg-cyan-950/90 text-[11px] font-semibold text-cyan-300 flex items-center justify-between border-b border-cyan-800/50">
                <span>🔍 Hasil Pencarian dari Master Barang RS (`farmasi/master`):</span>
                {isSearchingMaster ? (
                  <span className="text-amber-300 animate-pulse">Mencari Katalog...</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowMasterDropdown(false)}
                    className="text-white/60 hover:text-white text-[10px]"
                  >
                    Tutup [✕]
                  </button>
                )}
              </div>

              {masterSearchResults.length > 0 ? (
                <div className="divide-y divide-cyan-950 max-h-52 overflow-y-auto">
                  {masterSearchResults.map((mItem: any) => (
                    <div
                      key={mItem.id}
                      onClick={() => addItemFromMaster(mItem)}
                      className="p-2.5 hover:bg-cyan-950/70 transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-semibold text-white">{mItem.nama}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          Barcode: {mItem.barcode || mItem.kode || "—"} | Satuan: {mItem.satuan || "Pcs"} | Kategori: {mItem.kategori || "Medis"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addItemFromMaster(mItem);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-medium text-[11px] hover:bg-emerald-500/40 shrink-0 flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="h-3.5 w-3.5" /> Tambah ke Opname
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 text-center text-white/60 italic text-[11px]">
                  {isSearchingMaster
                    ? "Mencari di Katalog Master Barang..."
                    : "Pencarian filter aktif untuk tabel lokal."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Real-time Tally Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl border border-cyan-800/50 bg-slate-950/50 space-y-1">
          <span className="text-[11px] text-white/80 dark:text-white/80">Total Jenis (SKU)</span>
          <div className="text-lg font-bold text-cyan-300">{metrics.totalSKU} Item Unik</div>
          <p className="text-[10px] text-white/70">Akumulasi katalog opname</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-cyan-800/50 bg-slate-950/50 space-y-1">
          <span className="text-[11px] text-white/80 dark:text-white/80">Total Kuantitas Fisik</span>
          <div className="text-lg font-bold text-emerald-300">{metrics.totalFisik} Unit</div>
          <p className="text-[10px] text-white/70">Jumlah unit terhitung</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-cyan-800/50 bg-slate-950/50 space-y-1">
          <span className="text-[11px] text-white/80 dark:text-white/80">Status Selisih Stok</span>
          <div className="text-xs font-semibold space-y-0.5 mt-1">
            <div className="text-emerald-400">🟢 {metrics.totalSesuai} Sesuai</div>
            <div className="text-rose-400">🔴 {metrics.totalDefisit} Defisit / Hilang</div>
            <div className="text-cyan-300">🔵 {metrics.totalSurplus} Surplus</div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl border border-cyan-800/50 bg-slate-950/50 space-y-1">
          <span className="text-[11px] text-white/80 dark:text-white/80">Status Kadaluarsa (ED)</span>
          <div className="text-xs font-semibold space-y-0.5 mt-1">
            <div className="text-emerald-400">🟢 {metrics.totalAman} Aman</div>
            <div className="text-amber-400">🟡 {metrics.totalMendekati} Mendekati (&lt;60hr)</div>
            <div className="text-rose-400">🔴 {metrics.totalExpired} Expired</div>
          </div>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {savingStatus && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-xs text-cyan-200 flex items-center justify-between">
          <span>{savingStatus}</span>
          <button
            type="button"
            onClick={() => setSavingStatus(null)}
            className="text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editable Results Data Table */}
      <div className="rounded-2xl border border-cyan-900/70 bg-slate-950/60 overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <h2 className="font-semibold text-white dark:text-white flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-cyan-400" />
            Tabel Hasil Pemindaian Opname Real (Database Real)
          </h2>
          <span className="text-white/80 dark:text-white/80 text-[11px]">
            Data murni dari database | Klik tombol &quot;Simpan ke Database&quot; untuk memperbarui permanen
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-cyan-800/60 bg-cyan-950/50 text-cyan-200 font-medium">
                <th className="p-2.5">No</th>
                <th className="p-2.5">Barcode / GS1</th>
                <th className="p-2.5">Nama Barang &amp; Kategori (Edit)</th>
                <th className="p-2.5">Lot / Batch</th>
                <th className="p-2.5">Expired Date (ED)</th>
                <th className="p-2.5 text-center">Stok System</th>
                <th className="p-2.5 text-center">Stok Fisik (Edit)</th>
                <th className="p-2.5 text-center">Selisih</th>
                <th className="p-2.5">Catatan</th>
                <th className="p-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-950">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-white/70 italic">
                    Belum ada data barang di database untuk bulan ini. Klik &quot;Scan Kamera HP&quot; atau tembakkan Barcode Gun untuk mulai opname real.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const globalIdx = (page - 1) * pageSize + index + 1;
                  const isHighlighted = item.id === lastScannedId;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-all duration-500 text-white dark:text-white ${
                        isHighlighted
                          ? "bg-emerald-500/25 border-l-4 border-l-emerald-400 shadow-xl"
                          : "hover:bg-cyan-950/30"
                      }`}
                    >
                      <td className="p-2.5 text-white/70">{globalIdx}</td>
                      <td className="p-2.5 font-mono text-[11px] text-cyan-300">
                        {item.kode_barcode}
                      </td>

                      {/* Editable Nama Barang & Kategori */}
                      <td className="p-2.5 space-y-1">
                        <input
                          type="text"
                          value={item.nama_barang}
                          onChange={(e) => updateItemField(item.id, "nama_barang", e.target.value)}
                          placeholder="Nama barang..."
                          className="w-full min-w-[160px] bg-slate-900 border border-cyan-800/60 rounded px-2 py-1 text-xs font-semibold text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none focus:border-cyan-400"
                        />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <select
                            value={item.kategori}
                            onChange={(e) =>
                              updateItemField(
                                item.id,
                                "kategori",
                                e.target.value as "Medis" | "Non-Medis"
                              )
                            }
                            className={`text-[10px] px-2 py-0.5 rounded bg-slate-900 border font-medium focus:outline-none cursor-pointer ${
                              item.kategori === "Medis"
                                ? "bg-purple-950/80 text-purple-300 border-purple-500/50"
                                : "bg-slate-900 text-slate-300 border-slate-600/50"
                            }`}
                          >
                            <option value="Medis" className="bg-slate-900 text-purple-300">Medis</option>
                            <option value="Non-Medis" className="bg-slate-900 text-slate-300">Non-Medis</option>
                          </select>

                          {item.is_unregistered_master ? (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/60 font-medium flex items-center gap-1"
                              title="Barang ini belum terdaftar di Master RS, namun TETAP terhitung di Stok Fisik Opname"
                            >
                              <AlertTriangle className="h-3 w-3 text-amber-400" />
                              Belum ada di Master RS
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-medium">
                              ✓ Terdaftar Master
                            </span>
                          )}

                          {/* Group Badge & Manual Merge Button untuk barang dengan nama sama */}
                          {(() => {
                            const nameKey = item.nama_barang.trim().toLowerCase();
                            const dupCount = duplicateCountsMap.get(nameKey) || 0;
                            if (dupCount > 1) {
                              return (
                                <div className="flex items-center gap-1">
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/90 text-indigo-300 border border-indigo-500/60 font-semibold flex items-center gap-1 animate-pulse"
                                    title={`Terdapat ${dupCount} baris dengan nama barang yang sama di tabel ini`}
                                  >
                                    <GitMerge className="h-3 w-3 text-indigo-400" />
                                    {dupCount} Baris Nama Sama
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => mergeDuplicatesByName(item.nama_barang)}
                                    className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/40 hover:bg-indigo-600/70 text-indigo-100 border border-indigo-400/60 font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                                    title="Gabungkan seluruh baris dengan nama ini menjadi 1 baris (kuantitas fisik dijumlahkan)"
                                  >
                                    Gabungkan
                                  </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </td>

                      {/* Editable Lot Number */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.lot_number}
                          onChange={(e) => updateItemField(item.id, "lot_number", e.target.value)}
                          className="w-24 bg-slate-900 border border-cyan-800/60 rounded px-2 py-1 text-xs text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </td>

                      {/* Editable Expired Date (ED) */}
                      <td className="p-2.5 space-y-1">
                        <input
                          type="date"
                          value={item.expired_date}
                          onChange={(e) =>
                            updateItemField(item.id, "expired_date", e.target.value)
                          }
                          className="bg-slate-900 border border-cyan-800/60 rounded px-2 py-1 text-xs text-white dark:text-white focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
                        />
                        <div>
                          {item.status_ed === "Aman" && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              🟢 Aman
                            </span>
                          )}
                          {item.status_ed === "Mendekati" && (
                            <span className="text-[10px] text-amber-400 font-medium">
                              🟡 &lt;60 Hari
                            </span>
                          )}
                          {item.status_ed === "Expired" && (
                            <span className="text-[10px] text-rose-400 font-semibold">
                              🔴 Expired
                            </span>
                          )}
                          {item.status_ed === "Non-ED" && (
                            <span className="text-[10px] text-slate-400">⚪ Non-ED</span>
                          )}
                        </div>
                      </td>

                      {/* Stok System */}
                      <td className="p-2.5 text-center font-mono text-white/80">
                        {item.stok_sistem} {item.satuan}
                      </td>

                      {/* Editable Stok Fisik */}
                      <td className="p-2.5 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateItemField(
                                item.id,
                                "stok_fisik",
                                Math.max(0, item.stok_fisik - 1)
                              )
                            }
                            className="w-6 h-6 rounded bg-slate-800 border border-cyan-800/80 text-cyan-300 font-bold hover:bg-slate-700 flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.stok_fisik}
                            onChange={(e) =>
                              updateItemField(item.id, "stok_fisik", parseInt(e.target.value) || 0)
                            }
                            className="w-14 text-center bg-slate-900 border border-cyan-700/80 rounded py-1 font-bold text-emerald-300 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateItemField(item.id, "stok_fisik", item.stok_fisik + 1)
                            }
                            className="w-6 h-6 rounded bg-slate-800 border border-cyan-800/80 text-cyan-300 font-bold hover:bg-slate-700 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Calculated Selisih */}
                      <td className="p-2.5 text-center font-mono font-semibold">
                        {item.selisih === 0 ? (
                          <span className="text-emerald-400">0</span>
                        ) : item.selisih > 0 ? (
                          <span className="text-cyan-300">+{item.selisih}</span>
                        ) : (
                          <span className="text-rose-400">{item.selisih}</span>
                        )}
                      </td>

                      {/* Editable Catatan Item */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.catatan}
                          onChange={(e) => updateItemField(item.id, "catatan", e.target.value)}
                          placeholder="Catatan fisik..."
                          className="w-full bg-slate-900 border border-cyan-800/60 rounded px-2 py-1 text-xs text-white dark:text-white dark:placeholder:text-white/90 focus:outline-none focus:border-cyan-400"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="p-1 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 transition-colors"
                          title="Hapus baris item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Limit Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-cyan-900/60 text-xs">
          <div className="text-white/80 dark:text-white/80">
            Menampilkan{" "}
            <strong>
              {totalItemsCount === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, totalItemsCount)}
            </strong>{" "}
            dari <strong>{totalItemsCount}</strong> item
          </div>

          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5 text-white/80">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-slate-900 border border-cyan-800/60 rounded px-2 py-1 text-white dark:text-white focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-cyan-800/60 bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono text-cyan-300">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-cyan-800/60 bg-slate-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
