"use client";

import { useEffect, useState, useMemo } from "react";
import ModalWrapper from "@/components/global/ModalWrapper";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import {
  X,
  CheckCircle2,
  Loader2,
  BarChart2,
  ChevronDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Tambahan Helper CSS:
 * - tabular-nums: Angka monospaced untuk perbandingan vertikal.
 */
const NUM_STYLE = "tabular-nums font-mono";

const LOCAL_STORAGE_KEY = "idik_severity_level_tarif";

interface SeverityTarifItem {
  tindakan: string;
  level1: number | string;
  level2: number | string;
  level3: number | string;
}

interface SeveritySection {
  kelas: string;
  items: SeverityTarifItem[];
}

const INITIAL_DATA: SeveritySection[] = [
  {
    kelas: "TARIF KELAS III",
    items: [
      {
        tindakan: "PTCA",
        level1: 20826800,
        level2: 35384800,
        level3: 43766800,
      },
      { tindakan: "DCA", level1: 4408700, level2: 6156600, level3: 11855200 },
      { tindakan: "TPM", level1: 11086000, level2: 25858900, level3: 29827800 },
      { tindakan: "PPM", level1: 23207000, level2: 28842900, level3: 37794100 },
      {
        tindakan: "IABP",
        level1: 21337800,
        level2: 30909500,
        level3: 36880800,
      },
      {
        tindakan: "ANGIOPLASTY PERIFER",
        level1: 15701600,
        level2: 19617500,
        level3: 25778600,
      },
      { tindakan: "OCLUDER", level1: "", level2: "", level3: 42675600 },
      {
        tindakan: "EVLA",
        level1: 13105300,
        level2: 16409100,
        level3: 34776200,
      },
      { tindakan: "EP", level1: 12502500, level2: "", level3: "" },
    ],
  },
  {
    kelas: "TARIF KELAS II",
    items: [
      {
        tindakan: "PTCA",
        level1: 22909500,
        level2: 40320000,
        level3: 50437500,
      },
      { tindakan: "DCA", level1: 5290400, level2: 7387900, level3: 14226200 },
      { tindakan: "TPM", level1: 13303200, level2: 31030700, level3: 35793400 },
      { tindakan: "PPM", level1: 27848400, level2: 34611400, level3: 45352900 },
      {
        tindakan: "IABP",
        level1: 25605400,
        level2: 37091400,
        level3: 44256900,
      },
      {
        tindakan: "ANGIOPLASTY PERIFER",
        level1: 18292300,
        level2: 22854400,
        level3: 30032100,
      },
      { tindakan: "OCLUDER", level1: "", level2: "", level3: 42675600 },
      {
        tindakan: "EVLA",
        level1: 15727900,
        level2: 19960900,
        level3: 40948500,
      },
      { tindakan: "EP", level1: 14565400, level2: "", level3: "" },
    ],
  },
  {
    kelas: "TARIF KELAS I",
    items: [
      {
        tindakan: "PTCA",
        level1: 24992200,
        level2: 45373400,
        level3: 57108100,
      },
      { tindakan: "DCA", level1: 6172100, level2: 8619200, level3: 16597300 },
      { tindakan: "TPM", level1: 15520400, level2: 36202400, level3: 41758900 },
      { tindakan: "PPM", level1: 32489800, level2: 40380000, level3: 52911800 },
      {
        tindakan: "IABP",
        level1: 29972900,
        level2: 43273400,
        level3: 51633100,
      },
      {
        tindakan: "ANGIOPLASTY PERIFER",
        level1: 20883100,
        level2: 26091300,
        level3: 34285500,
      },
      { tindakan: "OCLUDER", level1: "", level2: "", level3: 46942100 },
      {
        tindakan: "EVLA",
        level1: 18347500,
        level2: 22972700,
        level3: 47775700,
      },
      { tindakan: "EP", level1: 16628300, level2: "", level3: "" },
    ],
  },
  {
    kelas: "TARIF VIP",
    items: [
      {
        tindakan: "PTCA",
        level1: 28500000,
        level2: 52000000,
        level3: 65000000,
      },
      { tindakan: "DCA", level1: 7500000, level2: 10500000, level3: 18500000 },
      { tindakan: "TPM", level1: 18500000, level2: 42000000, level3: 48000000 },
      { tindakan: "PPM", level1: 38500000, level2: 46000000, level3: 58000000 },
      {
        tindakan: "IABP",
        level1: 35000000,
        level2: 48000000,
        level3: 60000000,
      },
      {
        tindakan: "ANGIOPLASTY PERIFER",
        level1: 24500000,
        level2: 30000000,
        level3: 40000000,
      },
      { tindakan: "OCLUDER", level1: "", level2: "", level3: 52000000 },
      {
        tindakan: "EVLA",
        level1: 21000000,
        level2: 26000000,
        level3: 54000000,
      },
      { tindakan: "EP", level1: 19500000, level2: "", level3: "" },
    ],
  },
];

export default function SeverityLevelModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [data, setData] = useState<SeveritySection[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(null); // "ALL" or class name
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [lastEditedKey, setLastEditedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch {
        setData(INITIAL_DATA);
      }
    } else {
      setData(INITIAL_DATA);
    }
  }, [open]);

  const handleUpdateField = (
    sectionIdx: number,
    itemIdx: number,
    field: keyof SeverityTarifItem,
    value: string,
  ) => {
    const newData = [...data];
    const section = newData[sectionIdx];
    const item = { ...section.items[itemIdx] };

    if (field === "level1" || field === "level2" || field === "level3") {
      const numericValue =
        value === "" ? "" : parseInt(value.replace(/\D/g, "")) || 0;
      (item[field] as number | string) = numericValue;
    } else {
      (item[field] as string) = value;
    }

    newData[sectionIdx].items[itemIdx] = item;
    setData(newData);

    // Visual feedback
    const key = `${section.kelas}-${item.tindakan}-${field}`;
    setLastEditedKey(key);
    setTimeout(() => setLastEditedKey(null), 1000);

    // Autosave silent
    setIsSaving(true);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
    setTimeout(() => {
      setIsSaving(false);
      setLastSaved(new Date());
    }, 500);
  };

  const toggleSection = (kelas: string) => {
    setCollapsedSections((prev) => ({ ...prev, [kelas]: !prev[kelas] }));
  };

  const filteredSections = useMemo(() => {
    if (!activeTab || activeTab === "ALL") return data;
    return data.filter((s) => s.kelas === activeTab);
  }, [data, activeTab]);

  if (!open) return null;

  return (
    <ModalWrapper onClose={onClose} isWide zIndex={130}>
      <div
        className={cn(
          "relative w-full transition-all duration-500 flex flex-col max-h-[90vh]",
          isDark ? "text-white" : "text-slate-800",
        )}
      >
        <div
          className={cn(
            "rounded-xl border p-3 sm:rounded-2xl sm:p-5 flex flex-col h-full overflow-hidden shadow-2xl shadow-black/80",
            isDark
              ? "border-amber-500/45 bg-slate-900/95 backdrop-blur-md"
              : "border-amber-500/35 bg-white",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0 px-1">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                <BarChart2 size={22} />
              </div>
              <div>
                <h3
                  className={cn(
                    "text-xl font-black tracking-tight leading-none mb-1",
                    isDark ? "text-amber-100" : "text-amber-900",
                  )}
                >
                  Severity Level Tarif
                </h3>
                <p
                  className={cn(
                    "text-[10px] font-bold opacity-60 uppercase tracking-widest",
                    isDark ? "text-amber-400" : "text-amber-700",
                  )}
                >
                  Penyesuaian Tarif Berdasarkan Tingkat Kompleksitas
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-full transition-all hover:rotate-90",
                isDark
                  ? "hover:bg-white/10 text-white/70 hover:text-white"
                  : "hover:bg-black/5 text-slate-500 hover:text-slate-900",
              )}
            >
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mb-4 p-1 rounded-xl bg-slate-100 dark:bg-black/40 shrink-0 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("ALL")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap",
                !activeTab || activeTab === "ALL"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                  : "text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400",
              )}
            >
              <LayoutGrid size={14} />
              SEMUA KELAS
            </button>
            <div className="w-px h-4 bg-slate-300 dark:bg-white/10 mx-1" />
            {data.map((section) => (
              <button
                key={section.kelas}
                onClick={() => setActiveTab(section.kelas)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-black transition-all whitespace-nowrap uppercase tracking-tighter",
                  activeTab === section.kelas
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400",
                )}
              >
                {section.kelas.replace("TARIF ", "")}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar scroll-smooth">
            <div
              className={cn(
                "grid gap-4",
                !activeTab || activeTab === "ALL"
                  ? "grid-cols-1 lg:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              {filteredSections.map((section, sIdx) => {
                const isCollapsed = collapsedSections[section.kelas];
                const realIdx = data.findIndex(
                  (d) => d.kelas === section.kelas,
                );

                return (
                  <div
                    key={section.kelas}
                    className={cn(
                      "flex flex-col rounded-xl border transition-all overflow-hidden",
                      isDark
                        ? "bg-black/30 border-white/5"
                        : "bg-slate-50 border-slate-200",
                    )}
                  >
                    {/* Section Header */}
                    <div
                      onClick={() => toggleSection(section.kelas)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 cursor-pointer select-none transition-colors",
                        isDark
                          ? "bg-slate-800/50 hover:bg-slate-800"
                          : "bg-slate-100 hover:bg-slate-200",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <List size={14} className="text-amber-500" />
                        <span
                          className={cn(
                            "text-xs font-black tracking-widest uppercase",
                            isDark ? "text-amber-300" : "text-amber-800",
                          )}
                        >
                          {section.kelas}
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isCollapsed ? -90 : 0 }}
                        className="text-amber-500"
                      >
                        <ChevronDown size={16} strokeWidth={3} />
                      </motion.div>
                    </div>

                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex flex-col p-2 gap-1 relative">
                            {/* Sticky Table Header */}
                            <div
                              className={cn(
                                "grid grid-cols-[1fr_repeat(3,minmax(5.5rem,1fr))] gap-1 px-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider sticky top-0 z-20",
                                isDark
                                  ? "bg-slate-800/95 text-slate-400 backdrop-blur-sm"
                                  : "bg-slate-100/95 text-slate-500 backdrop-blur-sm",
                              )}
                            >
                              <span>TINDAKAN</span>
                              <span className="text-right">LEVEL I</span>
                              <span className="text-right">LEVEL II</span>
                              <span className="text-right">LEVEL III</span>
                            </div>

                            {/* Table Rows */}
                            <div className="flex flex-col">
                              {section.items.map((item, iIdx) => {
                                const isAngioplasty =
                                  item.tindakan === "ANGIOPLASTY PERIFER";
                                return (
                                  <div
                                    key={`${section.kelas}-${item.tindakan}-${iIdx}`}
                                    className={cn(
                                      "grid grid-cols-[1fr_repeat(3,minmax(5.5rem,1fr))] gap-1 items-center px-2 py-1 rounded-lg border-b border-transparent transition-colors",
                                      isAngioplasty
                                        ? isDark
                                          ? "bg-emerald-950/30 text-emerald-300"
                                          : "bg-emerald-50 text-emerald-700"
                                        : iIdx % 2 === 0
                                          ? isDark
                                            ? "bg-white/[0.03]"
                                            : "bg-slate-100/50"
                                          : "bg-transparent",
                                      isDark
                                        ? "hover:bg-white/[0.05]"
                                        : "hover:bg-slate-200/50",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "text-[10.5px] font-bold truncate tracking-tight",
                                        isAngioplasty ? "text-emerald-400" : "",
                                      )}
                                    >
                                      {item.tindakan}
                                    </span>

                                    {["level1", "level2", "level3"].map(
                                      (field) => {
                                        const key = `${section.kelas}-${item.tindakan}-${field}`;
                                        const isEdited = lastEditedKey === key;
                                        return (
                                          <div key={field} className="relative">
                                            <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[8px] font-bold opacity-30">
                                              Rp
                                            </span>
                                            <input
                                              type="text"
                                              value={
                                                item[
                                                  field as keyof SeverityTarifItem
                                                ]?.toLocaleString("id-ID") || ""
                                              }
                                              onChange={(e) =>
                                                handleUpdateField(
                                                  realIdx,
                                                  iIdx,
                                                  field as keyof SeverityTarifItem,
                                                  e.target.value,
                                                )
                                              }
                                              className={cn(
                                                "pl-4 pr-1 py-1 w-full text-right font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none transition-all bg-transparent",
                                                NUM_STYLE,
                                                "text-[10.5px]",
                                                isDark
                                                  ? "text-white"
                                                  : "text-slate-900",
                                                isEdited &&
                                                  "bg-emerald-500/20 ring-1 ring-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-pulse",
                                              )}
                                              placeholder="—"
                                            />
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-60">
                {isSaving ? (
                  <>
                    <Loader2
                      size={12}
                      className="animate-spin text-amber-500"
                    />
                    <span
                      className={isDark ? "text-amber-400" : "text-amber-600"}
                    >
                      Sinkronisasi Latar...
                    </span>
                  </>
                ) : lastSaved ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span
                      className={
                        isDark ? "text-emerald-400" : "text-emerald-600"
                      }
                    >
                      Tersimpan{" "}
                      {lastSaved.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </>
                ) : (
                  <span>Perubahan disimpan otomatis</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className={cn(
                "px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all border shadow-lg active:scale-95",
                isDark
                  ? "bg-amber-600/10 border-amber-500/40 text-amber-100 hover:bg-amber-600/30 hover:border-amber-500/60 shadow-amber-950/20"
                  : "bg-amber-50 border-amber-500/30 text-amber-900 hover:bg-amber-100 shadow-amber-900/10",
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
