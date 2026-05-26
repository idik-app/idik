"use client";

import { useEffect, useState } from "react";
import ModalWrapper from "@/components/global/ModalWrapper";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import { X, Search, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";

export default function TarifModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tarif, setTarif] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [activeTimeout, setActiveTimeout] = useState<any>(null);

  const fetchTarif = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/master-tarif-tindakan");
      const data = await res.json();
      if (data.ok) {
        setTarif(data.tarif);
      }
    } catch (err) {
      console.error("Failed to fetch tarif", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchTarif();
    }
    return () => {
      if (activeTimeout) clearTimeout(activeTimeout);
    };
  }, [open]);

  const handleUpdateField = (
    index: number,
    field: string,
    value: any,
  ) => {
    const item = tarif[index];
    let newValue = value;
    
    if (field === "tarif_rupiah") {
      newValue = parseInt(String(value).replace(/\D/g, "")) || 0;
    }

    const updatedItem = { ...item, [field]: newValue };
    const newTarif = [...tarif];
    newTarif[index] = updatedItem;
    setTarif(newTarif);

    if (activeTimeout) {
      clearTimeout(activeTimeout);
    }

    setIsSaving(true);

    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch("/api/master-tarif-tindakan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedItem),
        });
        const data = await res.json();
        if (data.ok) {
          setLastSaved(new Date());
        }
      } catch (err) {
        console.error("Failed to save tarif", err);
      } finally {
        setIsSaving(false);
      }
    }, 800);

    setActiveTimeout(timeoutId);
  };

  const handleCreateItem = async () => {
    const newItem = {
      nama: "Tindakan Baru",
      kode: "-",
      tarif_rupiah: 0,
      aktif: true,
    };
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/master-tarif-tindakan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (data.ok) {
        setTarif([data.data, ...tarif]);
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error("Failed to create tarif", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (index: number) => {
    const item = tarif[index];
    if (!item.id) {
      setTarif(tarif.filter((_, i) => i !== index));
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/master-tarif-tindakan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (data.ok) {
        setTarif(tarif.filter((_, i) => i !== index));
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error("Failed to delete tarif", err);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredTarif = tarif
    .map((item, index) => ({ ...item, originalIndex: index }))
    .filter(
      (item) =>
        item.nama.toLowerCase().includes(search.toLowerCase()) ||
        item.kode?.toLowerCase().includes(search.toLowerCase()),
    );

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(val);
  };

  if (!open) return null;

  return (
    <ModalWrapper onClose={onClose} zIndex={130} isWide>
      <div
        className={`relative w-full max-w-4xl mx-auto ${UI_LAYERS.floatingCard}`}
      >
        <div
          className={cn(
            "animate-in fade-in zoom-in-95 duration-200 rounded-xl border p-4 sm:rounded-2xl sm:p-6",
            isDark
              ? "border-cyan-500/45 bg-gradient-to-br from-cyan-950/90 via-cyan-950/70 to-black/95 text-white shadow-lg shadow-cyan-900/25"
              : "border-cyan-500/35 bg-gradient-to-br from-white to-cyan-50/80 text-slate-800 shadow-lg shadow-cyan-900/10",
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={cn(
                "text-lg font-bold sm:text-2xl",
                isDark ? "text-cyan-100" : "text-cyan-900",
              )}
            >
              📋 Daftar Tarif Tindakan
            </h3>
            <div className="flex items-center gap-2">
              {isLoading && (
                <Loader2 size={18} className="animate-spin text-cyan-500" />
              )}
              <button
                onClick={onClose}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  isDark
                    ? "hover:bg-white/10 text-white"
                    : "hover:bg-black/5 text-slate-600",
                )}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search
                size={18}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 opacity-60",
                  isDark ? "text-cyan-300" : "text-cyan-700",
                )}
              />
              <input
                type="text"
                placeholder="Cari nama tindakan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all",
                  isDark
                    ? "bg-black/40 border-cyan-500/30 text-white placeholder:text-white/40"
                    : "bg-white border-cyan-500/30 text-slate-900 placeholder:text-slate-400",
                )}
              />
            </div>
            <button
              type="button"
              onClick={handleCreateItem}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm transition-all border flex items-center gap-1.5 shrink-0",
                isDark
                  ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-100 hover:bg-cyan-600/40"
                  : "bg-cyan-50 border-cyan-500/30 text-cyan-900 hover:bg-cyan-100",
              )}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Tambah Tarif</span>
              <span className="sm:hidden">Tambah</span>
            </button>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-2">
              {filteredTarif.map((item) => {
                const originalIndex = item.originalIndex;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border transition-all",
                      isDark
                        ? "bg-black/20 border-white/10 hover:border-cyan-500/40"
                        : "bg-white border-slate-200 hover:border-cyan-500/40 shadow-sm",
                    )}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <input
                        type="text"
                        value={item.nama}
                        onChange={(e) =>
                          handleUpdateField(
                            originalIndex,
                            "nama",
                            e.target.value,
                          )
                        }
                        className={cn(
                          "px-2 py-1 text-sm font-bold rounded-md border border-transparent focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all bg-transparent w-full",
                          isDark ? "text-white" : "text-slate-900",
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Kode"
                        value={item.kode || ""}
                        onChange={(e) =>
                          handleUpdateField(
                            originalIndex,
                            "kode",
                            e.target.value,
                          )
                        }
                        className={cn(
                          "px-2 py-1 w-28 text-center font-mono text-xs font-bold rounded-md border focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all uppercase bg-transparent",
                          isDark
                            ? "border-cyan-500/20 text-cyan-300 placeholder:text-white/20"
                            : "border-slate-200 text-cyan-700 placeholder:text-slate-300",
                        )}
                      />
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-50">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={Number(item.tarif_rupiah || 0).toLocaleString(
                            "id-ID",
                          )}
                          onChange={(e) =>
                            handleUpdateField(
                              originalIndex,
                              "tarif_rupiah",
                              e.target.value,
                            )
                          }
                          className={cn(
                            "pl-8 pr-2 py-1 w-28 text-right font-mono text-sm font-bold rounded-md border focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all bg-transparent",
                            isDark
                              ? "border-cyan-500/30 text-white"
                              : "border-slate-300 text-slate-900",
                          )}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(originalIndex)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors flex items-center justify-center ml-1",
                          isDark
                            ? "hover:bg-red-500/20 text-red-400 hover:text-red-300"
                            : "hover:bg-red-50 text-red-600 hover:text-red-700",
                        )}
                        title="Hapus tarif"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {!isLoading && filteredTarif.length === 0 && (
                <div className="text-center py-8 opacity-50 italic">
                  Tindakan tidak ditemukan
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin text-cyan-400" />
                  <span className={isDark ? "text-cyan-400" : "text-cyan-600"}>
                    Menyimpan otomatis...
                  </span>
                </>
              ) : lastSaved ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span className={isDark ? "text-white/60" : "text-slate-500"}>
                    Tersimpan{" "}
                    {lastSaved.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : (
                <span
                  className={isDark ? "text-white/40" : "text-slate-400 italic"}
                >
                  Perubahan akan disimpan otomatis
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className={cn(
                "px-6 py-2 rounded-lg font-bold transition-all border",
                isDark
                  ? "bg-cyan-600/20 border-cyan-500/50 text-cyan-100 hover:bg-cyan-600/40"
                  : "bg-cyan-50 border-cyan-500/30 text-cyan-900 hover:bg-cyan-100",
              )}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </ModalWrapper>
  );
}
