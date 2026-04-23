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
    isLoaded,
    loadError,
    flushPendingSaves,
  } = usePhoneDirectory();

  const [search, setSearch] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<string>("Semua");
  const [isEditMode, setIsEditMode] = useState(false);

  const floorChoices = useMemo(() => {
    const set = new Set<string>();
    data.forEach((item) => {
      if (item.floor) set.add(item.floor);
    });
    for (let i = 1; i <= 7; i += 1) set.add(`LT ${i}`);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
  }, [data]);

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

  return (
    <Dialog
      open={open}
      onOpenChange={async (next) => {
        if (!next && isEditMode) {
          try {
            await flushPendingSaves();
          } catch {
            // flushPendingSaves already sets loadError
          }
          setIsEditMode(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        overlayClassName={UI_LAYERS.dialogOverlayTop}
        bodyClassName="flex h-full min-h-0 flex-col overflow-hidden p-0"
        className={cn(
          "flex h-[min(92dvh,56rem)] max-h-[92dvh] w-[calc(100vw-0.75rem)] max-w-[min(100vw-0.75rem,60rem)] flex-col overflow-hidden border p-0 sm:w-[min(100vw-1rem,60rem)]",
          "border-slate-300/60 bg-white/98 backdrop-blur-xl dark:border-cyan-500/35 dark:bg-slate-950/95",
          UI_LAYERS.dialogContentTop
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden max-h-full">
          <DialogHeader className="mb-0 shrink-0 space-y-2 p-2.5 pb-1.5 pl-2.5 pr-10 text-left sm:p-3 sm:pr-12">
            <div className="flex flex-col gap-2.5 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between">
              <div className="flex min-w-0 items-start gap-2 sm:gap-2.5">
                <div
                  className={cn(
                    "shrink-0 rounded-xl p-1.5 sm:p-2",
                    themeTone === "emerald"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                  )}
                >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0 pr-0">
                  <DialogTitle className="text-base font-bold leading-tight sm:text-lg dark:text-white">
                    Direktori Telepon Internal
                  </DialogTitle>
                  <DialogDescription className="text-[11px] leading-snug dark:text-white/80 sm:text-xs">
                    Daftar ekstensi unit RSUD dr. Mohamad Soewandhie
                  </DialogDescription>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2 min-[400px]:max-w-[min(100%,20rem)]">
                <button
                  type="button"
                  onClick={async () => {
                    if (isEditMode) {
                      try {
                        await flushPendingSaves();
                      } catch {
                        // loadError
                      }
                    }
                    setIsEditMode((v) => !v);
                  }}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-all sm:px-3 sm:text-xs",
                    isEditMode
                      ? "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  {isEditMode ? (
                    <>
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      Selesai Edit
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3.5 w-3.5 shrink-0" />
                      Edit Data
                    </>
                  )}
                </button>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={() => {
                      void addEntry({
                        unit: "Unit Baru",
                        ext: "-",
                        location: "-",
                        floor: "LT 1",
                      });
                    }}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] font-bold sm:px-3 sm:text-xs",
                      themeTone === "emerald"
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-cyan-600 bg-cyan-600 text-white"
                    )}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    Tambah
                  </button>
                )}
              </div>
            </div>
          </DialogHeader>

          {loadError ? (
            <div
              className="mx-2 mb-0.5 rounded-lg border border-amber-200/80 bg-amber-50/90 px-2.5 py-1.5 text-[11px] text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200 sm:mx-3 sm:px-3 sm:text-xs"
              role="status"
            >
              {loadError}
            </div>
          ) : null}

          <div className="shrink-0 space-y-3 px-2.5 pb-2.5 sm:px-3 sm:pb-3 md:px-4">
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

            <div className="flex flex-wrap gap-1">
              {floors.map((floor) => (
                <button
                  type="button"
                  key={floor}
                  onClick={() => {
                    setSelectedFloor(floor);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-all sm:px-2.5 sm:py-1 sm:text-[11px]",
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

          <ScrollArea className="h-0 min-h-0 flex-1 px-2.5 sm:px-3 md:px-4">
            {!isLoaded ? (
              <p className="py-10 text-center text-sm text-slate-500 dark:text-white/85">
                Memuat data direktori…
              </p>
            ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white/50 dark:border-cyan-900/30 dark:bg-black/20">
              <Table className="w-full min-w-[28rem] table-fixed sm:min-w-0 sm:table-auto text-sm">
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow className="border-slate-200/60 hover:bg-transparent dark:border-cyan-900/30">
                    <TableHead className="w-9 text-center sm:w-10 px-1.5 sm:px-2">
                       <Star className="mx-auto h-3.5 w-3.5 opacity-70" />
                    </TableHead>
                    <TableHead className="w-[32%] min-w-[6rem] font-bold text-slate-700 dark:text-slate-200 sm:w-auto">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="min-w-0 break-words">Unit / Ruangan</span>
                      </div>
                    </TableHead>
                    <TableHead className="w-20 px-1 font-bold text-slate-700 dark:text-slate-200 sm:w-24">
                      <div className="flex items-center justify-center gap-1.5 text-center">
                        <Hash className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        Ext
                      </div>
                    </TableHead>
                    {isEditMode && (
                      <TableHead className="w-[4.5rem] px-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-slate-700 dark:text-white sm:text-[10px] sm:w-24">
                        Lantai
                      </TableHead>
                    )}
                    <TableHead
                      className={cn(
                        "min-w-0 font-bold text-slate-700 dark:text-slate-200",
                        isEditMode ? "w-[28%] sm:w-[30%]" : "w-[36%] sm:w-[38%]",
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        <span className="min-w-0 break-words">Lokasi</span>
                      </div>
                    </TableHead>
                    {isEditMode && (
                      <TableHead className="w-8 text-center sm:w-10 px-0.5 sm:px-2">
                        <X className="mx-auto h-3.5 w-3.5 opacity-70" />
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
                        <TableCell className="px-1.5 py-2 text-center align-top sm:px-2 sm:py-3">
                          <button
                            type="button"
                            onClick={() => {
                              void togglePin(item.id);
                            }}
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
                        <TableCell className="min-w-0 py-2 align-top sm:py-3">
                          {isEditMode ? (
                            <input
                              value={item.unit}
                              onChange={(e) => updateEntry(item.id, { unit: e.target.value })}
                              className="w-full min-w-0 rounded border-none bg-transparent px-0.5 text-left text-sm font-semibold text-slate-900 focus:ring-1 focus:ring-cyan-500 dark:text-white"
                            />
                          ) : (
                            <span className="break-words text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                              {highlightText(item.unit, search)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-1 py-2 text-center align-top sm:py-3">
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
                                "inline-block max-w-full break-all font-mono text-xs px-2 py-0.5 border shadow-sm sm:text-sm",
                                themeTone === "emerald"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                                  : "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50"
                              )}
                            >
                              {highlightText(item.ext, search)}
                            </Badge>
                          )}
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="px-0.5 py-2 align-top sm:py-3">
                            <select
                              value={item.floor ?? "LT 1"}
                              onChange={(e) =>
                                updateEntry(item.id, { floor: e.target.value })
                              }
                              className="w-full min-w-0 max-w-full rounded-md border border-slate-200 bg-white py-1 pl-1 pr-5 text-[10px] font-semibold text-slate-900 focus:ring-1 focus:ring-cyan-500 dark:border-cyan-800/50 dark:bg-slate-900 dark:text-white sm:pr-6 sm:text-xs"
                              aria-label="Lantai"
                            >
                              {floorChoices.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                        )}
                        <TableCell className="min-w-0 py-2 align-top sm:py-3">
                          {isEditMode ? (
                            <input
                              value={item.location}
                              onChange={(e) => updateEntry(item.id, { location: e.target.value })}
                              className="w-full min-w-0 rounded border-none bg-transparent px-0.5 text-xs text-slate-600 focus:ring-1 focus:ring-cyan-500 dark:text-white dark:placeholder:text-white/90"
                            />
                          ) : (
                            <span className="break-words text-xs leading-snug text-slate-600 dark:text-slate-400">
                              {highlightText(item.location, search)}
                            </span>
                          )}
                        </TableCell>
                        {isEditMode && (
                          <TableCell className="px-0.5 py-2 text-center align-top sm:px-2 sm:py-3">
                            <button
                              type="button"
                              onClick={() => {
                                void deleteEntry(item.id);
                              }}
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
                      <TableCell
                        colSpan={isEditMode ? 6 : 4}
                        className="h-32 text-center text-slate-500 dark:text-slate-400"
                      >
                        Tidak ada data yang ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </ScrollArea>

          {totalPages > 1 && (
            <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-2.5 py-2 dark:border-cyan-900/30 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between sm:px-4 sm:py-2.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:text-xs">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-800/50 dark:hover:bg-cyan-950/30 dark:text-white sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-cyan-800/50 dark:hover:bg-cyan-950/30 dark:text-white sm:px-3 sm:py-1.5 sm:text-xs"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
          <div className="shrink-0 bg-slate-50/50 px-2.5 py-2.5 dark:bg-slate-900/30 sm:px-4 sm:py-3">
             <p className="text-[9px] text-center font-medium uppercase leading-snug tracking-wider text-slate-400 dark:text-slate-500 sm:text-[10px]">
               Internal Directory RSUD dr. Mohamad Soewandhie • tersimpan ke database
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
