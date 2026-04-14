"use client";

import { useMemo, useState } from "react";
import { 
  Phone, 
  Search, 
  X, 
  Building2, 
  Hash, 
  MapPin, 
  Star, 
  Edit2, 
  Check, 
  Trash2, 
  Plus 
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { UI_LAYERS } from "@/lib/ui/layers";
import { usePhoneDirectory } from "../hooks/usePhoneDirectory";

export default function TindakanDashboardModal({
  open,
  onOpenChange,
  themeTone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeTone: "cyan" | "emerald";
  /** @deprecated rows and loading are no longer used for phone directory but kept for compatibility */
  rows?: any;
  loading?: boolean;
}) {
  const { 
    data, 
    updateEntry, 
    deleteEntry, 
    addEntry, 
    togglePin, 
    isLoaded 
  } = usePhoneDirectory();

  const [search, setSearch] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<string>("Semua");
  const [isEditMode, setIsEditMode] = useState(false);

  const floors = useMemo<string[]>(() => {
    if (!data) return ["Semua"];
    const uniqueFloors = Array.from(
      new Set(data.map((item) => item.floor).filter((f): f is string => Boolean(f)))
    ).sort();
    return ["Semua", ...uniqueFloors];
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesSearch =
        item.unit.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase()) ||
        item.ext.includes(search);
      
      const matchesFloor = 
        selectedFloor === "Semua" || item.floor === selectedFloor;

      return matchesSearch && matchesFloor;
    });
  }, [data, search, selectedFloor]);

  // Basic pagination state
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const highlightText = (text: string, query: string) => {
    if (!query || isEditMode) return text;
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isLoaded) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={UI_LAYERS.dialogOverlayTop}
        className={cn(
          "max-h-[85vh] w-[min(100vw-1rem,750px)] overflow-hidden border p-0",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-cyan-500/35 dark:bg-slate-950/95",
          UI_LAYERS.dialogContentTop
        )}
      >
        <div className="flex flex-col h-full max-h-[85vh]">
          <DialogHeader className="shrink-0 p-3 pb-1.5 sm:p-4 sm:pb-2 space-y-1 pr-12 text-left">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-2 rounded-xl",
                  themeTone === "emerald" 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                )}>
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold dark:text-white">
                    Direktori Telepon Internal
                  </DialogTitle>
                  <DialogDescription className="text-xs dark:text-white/80">
                    Daftar ekstensi unit RSUD dr. Mohamad Soewandhie
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    isEditMode 
                      ? "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
                      : "bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                  )}
                >
                  {isEditMode ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Selesai Edit
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Data
                    </>
                  )}
                </button>
                {isEditMode && (
                  <button
                    onClick={() => addEntry({ unit: "Unit Baru", ext: "-", location: "-", floor: "LT 1" })}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                      themeTone === "emerald"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-cyan-600 border-cyan-600 text-white"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="px-4 sm:px-6 pb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari unit atau lokasi..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-cyan-800/50"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {floors.map((floor) => (
                <button
                  key={floor}
                  onClick={() => {
                    setSelectedFloor(floor);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-full transition-all border",
                    selectedFloor === floor
                      ? (themeTone === "emerald" 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                          : "bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-900/20")
                      : "bg-white dark:bg-black/40 border-slate-200 dark:border-cyan-900/50 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-cyan-700"
                  )}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 sm:px-6">
            <div className="rounded-xl border border-slate-200/60 dark:border-cyan-900/30 overflow-hidden bg-white/50 dark:bg-black/20">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent border-slate-200/60 dark:border-cyan-900/30">
                    <TableHead className="w-[10%] text-center px-2">
                       <Star className="h-3.5 w-3.5 mx-auto opacity-70" />
                    </TableHead>
                    <TableHead className="w-[35%] font-bold text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 opacity-70" />
                        Unit / Ruangan
                      </div>
                    </TableHead>
                    <TableHead className="w-[15%] font-bold text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-1.5 text-center justify-center">
                        <Hash className="h-3.5 w-3.5 opacity-70" />
                        Ext
                      </div>
                    </TableHead>
                    <TableHead className="w-[30%] font-bold text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 opacity-70" />
                        Lokasi
                      </div>
                    </TableHead>
                    {isEditMode && (
                      <TableHead className="w-[10%] text-center px-2">
                        <X className="h-3.5 w-3.5 mx-auto opacity-70" />
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length > 0 ? (
                    paginatedData.map((item) => (
                      <TableRow 
                        key={item.id}
                        className="border-slate-100 dark:border-cyan-900/20 hover:bg-slate-50/50 dark:hover:bg-cyan-950/20 transition-colors"
                      >
                        <TableCell className="text-center py-3 px-2">
                          <button
                            onClick={() => togglePin(item.id)}
                            className={cn(
                              "transition-all hover:scale-110",
                              item.isPinned 
                                ? "text-amber-500 fill-amber-500" 
                                : "text-slate-300 dark:text-slate-600 hover:text-amber-400"
                            )}
                            title={item.isPinned ? "Hapus dari shortcut" : "Tambah ke shortcut"}
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        </TableCell>
                        <TableCell className="py-3">
                          {isEditMode ? (
                            <input
                              value={item.unit}
                              onChange={(e) => updateEntry(item.id, { unit: e.target.value })}
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500 rounded px-1 font-semibold text-slate-900 dark:text-white"
                            />
                          ) : (
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {highlightText(item.unit, search)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3">
                          {isEditMode ? (
                            <input
                              value={item.ext}
                              onChange={(e) => updateEntry(item.id, { ext: e.target.value })}
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500 rounded px-1 text-center font-mono text-sm"
                            />
                          ) : (
                            <Badge 
                              variant="secondary"
                              className={cn(
                                "font-mono text-sm px-2.5 py-0.5 border shadow-sm",
                                themeTone === "emerald"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                                  : "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50"
                              )}
                            >
                              {highlightText(item.ext, search)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          {isEditMode ? (
                            <input
                              value={item.location}
                              onChange={(e) => updateEntry(item.id, { location: e.target.value })}
                              className="w-full bg-transparent border-none focus:ring-1 focus:ring-cyan-500 rounded px-1 text-slate-600 dark:text-slate-400 text-xs"
                            />
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400 text-xs">
                              {highlightText(item.location, search)}
                            </span>
                          )}
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="text-center py-3 px-2">
                            <button
                              onClick={() => deleteEntry(item.id)}
                              className="text-red-500 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Hapus unit"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={isEditMode ? 5 : 4} className="h-32 text-center text-slate-500 dark:text-slate-400">
                        Tidak ada data yang ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <div className="shrink-0 p-4 border-t border-slate-100 dark:border-cyan-900/30 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-cyan-950/30 transition-colors dark:text-white"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-cyan-800/50 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-cyan-950/30 transition-colors dark:text-white"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 shrink-0">
             <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
               Internal Directory RSUD dr. Mohamad Soewandhie • Auto-saved
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
