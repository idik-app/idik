"use client";

import { useEffect, useState } from "react";
import ModalWrapper from "@/components/global/ModalWrapper";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import { X, Search, CheckCircle2, Loader2, ClipboardList } from "lucide-react";

const LOCAL_STORAGE_KEY = "idik_daftar_diagnosa";

interface DiagnosaItem {
  diagnosa: string;
  icd10: string;
}

const INITIAL_DIAGNOSA: DiagnosaItem[] = [
  { diagnosa: "STEMI", icd10: "I21.0" },
  { diagnosa: "NSTEMI", icd10: "I21.4" },
  { diagnosa: "UAP", icd10: "I20.0" },
  { diagnosa: "CAD", icd10: "I25.1" },
  { diagnosa: "OMI", icd10: "I25.2" },
  { diagnosa: "DECOM", icd10: "I50.1" },
  { diagnosa: "ALO", icd10: "I50.1" },
  { diagnosa: "HHF", icd10: "I11.0" },
  { diagnosa: "VT/VF", icd10: "I47.2" },
  { diagnosa: "AF", icd10: "I48" },
  { diagnosa: "TAVB", icd10: "I44.2" },
  { diagnosa: "SSS", icd10: "I49.5" },
  { diagnosa: "PVC", icd10: "I49.3" },
  { diagnosa: "Syok kardiogenik", icd10: "R57.0" },
  { diagnosa: "DM", icd10: "E11.6" },
  { diagnosa: "HT", icd10: "I10.0" },
  { diagnosa: "CKD", icd10: "N18.9" },
  { diagnosa: "DVT", icd10: "I80.2" },
  { diagnosa: "Stenosis vena", icd10: "I87.1" },
  { diagnosa: "Stenosis vena subklavia", icd10: "I87.1" },
  { diagnosa: "ALI", icd10: "I73.9" },
  { diagnosa: "PVD", icd10: "I73.9" },
  { diagnosa: "CVI", icd10: "I87.2" },
  { diagnosa: "SVT", icd10: "I47.19" },
];

export default function DiagnosaModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<DiagnosaItem[]>([]);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setData(INITIAL_DIAGNOSA);
      }
    } else {
      setData(INITIAL_DIAGNOSA);
    }
  }, [open]);

  const handleUpdateField = (
    index: number,
    field: keyof DiagnosaItem,
    value: string,
  ) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    setData(newData);

    // Autosave silent
    setIsSaving(true);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
  };

  const filteredData = data.filter(
    (item) =>
      item.diagnosa.toLowerCase().includes(search.toLowerCase()) ||
      item.icd10.toLowerCase().includes(search.toLowerCase()),
  );

  if (!open) return null;

  return (
    <ModalWrapper onClose={onClose} zIndex={UI_LAYERS.modalTop}>
      <div
        className={`relative w-full max-w-3xl mx-auto ${UI_LAYERS.floatingCard}`}
      >
        <div
          className={cn(
            "animate-in fade-in zoom-in-95 duration-200 rounded-xl border p-4 sm:rounded-2xl sm:p-6",
            isDark
              ? "border-emerald-500/45 bg-gradient-to-br from-emerald-950/90 via-emerald-950/70 to-black/95 text-white shadow-lg shadow-emerald-900/25"
              : "border-emerald-500/35 bg-gradient-to-br from-white to-emerald-50/80 text-slate-800 shadow-lg shadow-emerald-900/10",
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className={cn(
                "text-lg font-bold sm:text-2xl flex items-center gap-2",
                isDark ? "text-emerald-100" : "text-emerald-900",
              )}
            >
              <ClipboardList size={24} />
              Daftar Diagnosa & ICD 10
            </h3>
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

          <div className="mb-4 relative">
            <Search
              size={18}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 opacity-60",
                isDark ? "text-emerald-300" : "text-emerald-700",
              )}
            />
            <input
              type="text"
              placeholder="Cari diagnosa atau ICD 10..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all",
                isDark
                  ? "bg-black/40 border-emerald-500/30 text-white placeholder:text-white/40"
                  : "bg-white border-emerald-500/30 text-slate-900 placeholder:text-slate-400",
              )}
            />
          </div>

          {/* Table Header */}
          <div
            className={cn(
              "grid grid-cols-[3rem_1fr_8rem] gap-2 px-3 py-2 mb-2 rounded-lg text-[10px] font-black uppercase tracking-widest",
              isDark
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-emerald-100 text-emerald-800",
            )}
          >
            <span>No.</span>
            <span>DIAGNOSA</span>
            <span className="text-center">ICD 10</span>
          </div>

          <div className="max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 gap-1.5">
              {filteredData.map((item, idx) => {
                const originalIndex = data.findIndex(
                  (d) => d.diagnosa === item.diagnosa,
                );
                return (
                  <div
                    key={`${item.diagnosa}-${idx}`}
                    className={cn(
                      "grid grid-cols-[3rem_1fr_8rem] gap-2 items-center p-2 rounded-lg border transition-all",
                      isDark
                        ? "bg-black/20 border-white/5 hover:border-emerald-500/40"
                        : "bg-white border-slate-100 hover:border-emerald-500/40 shadow-sm",
                    )}
                  >
                    <span
                      className={cn(
                        "text-center font-mono text-xs font-bold opacity-50",
                        isDark ? "text-emerald-100" : "text-emerald-900",
                      )}
                    >
                      {originalIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={item.diagnosa}
                      onChange={(e) =>
                        handleUpdateField(
                          originalIndex,
                          "diagnosa",
                          e.target.value,
                        )
                      }
                      className={cn(
                        "px-2 py-1 text-sm font-bold rounded-md border border-transparent focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all bg-transparent",
                        isDark ? "text-white" : "text-slate-900",
                      )}
                    />
                    <input
                      type="text"
                      value={item.icd10}
                      onChange={(e) =>
                        handleUpdateField(
                          originalIndex,
                          "icd10",
                          e.target.value,
                        )
                      }
                      className={cn(
                        "px-2 py-1 text-center font-mono text-xs font-black rounded-md border border-transparent focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all bg-transparent uppercase",
                        isDark ? "text-emerald-300" : "text-emerald-700",
                      )}
                    />
                  </div>
                );
              })}
              {filteredData.length === 0 && (
                <div className="text-center py-8 opacity-50 italic">
                  Diagnosa tidak ditemukan
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              {isSaving ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin text-emerald-400"
                  />
                  <span
                    className={isDark ? "text-emerald-400" : "text-emerald-600"}
                  >
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
                  ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-100 hover:bg-emerald-600/40"
                  : "bg-emerald-50 border-emerald-500/30 text-emerald-900 hover:bg-emerald-100",
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
