"use client";

import React, { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useFlowSheetStore } from "@/lib/store/useFlowSheetStore";
import { intensiveTimelineColumnWidthPx } from "@/lib/intensive/timelineLayout";
import { ChevronLeft, Maximize2, Settings, Clock, Activity, Droplets, Thermometer, Wind, Plus, Edit2 } from "lucide-react";
import { format, startOfDay, addMinutes, addHours, subMinutes } from "date-fns";
import HemodynamicChart from "./HemodynamicChart";
import { motion, AnimatePresence } from "framer-motion";

export default function FlowSheetGrid({ zoomLevel = 1 }: { zoomLevel?: number }) {
  const { resolution, expandedGroups, toggleGroup, data, updateData, groups, addParameter, updateParameter } = useFlowSheetStore();
  const parentRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ paramId: string, timestamp: string } | null>(null);
  const [editingParamId, setEditingParamId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeParamId, setActiveParamId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ name: "", unit: "" });

  const handleAddItem = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveGroupId(groupId);
    setActiveParamId(null);
    setNewItem({ name: "", unit: "" });
    setIsModalOpen(true);
  };

  const handleEditParam = (param: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingParamId(param.id);
  };

  const confirmAddItem = () => {
    if (activeParamId) {
      updateParameter(activeParamId, newItem.name, newItem.unit);
    } else if (activeGroupId && newItem.name) {
      addParameter(activeGroupId, newItem.name, newItem.unit);
    }
    setIsModalOpen(false);
  };

  // Generate Columns (Time)
  const columns = useMemo(() => {
    const start = startOfDay(new Date());
    const cols = [];
    const step = resolution === "1m" ? 1 : resolution === "15m" ? 15 : 60;
    const totalMinutes = 24 * 60;

    for (let i = 0; i < totalMinutes; i += step) {
      cols.push(addMinutes(start, i));
    }
    return cols;
  }, [resolution]);

  // Flattened rows based on expanded groups
  const rows = useMemo(() => {
    const flatRows: any[] = [];
    const rightPanelGroupIds = ['invasive', 'monitoring', 'medical-info'];
    
    groups.forEach((group) => {
      // Filter out groups that go to the right panel
      if (rightPanelGroupIds.includes(group.id)) return;

      flatRows.push({ type: "group", ...group });
      if (expandedGroups.includes(group.id)) {
        group.parameters.forEach((param) => {
          flatRows.push({ type: "param", ...param, groupId: group.id });
        });
      }
    });
    return flatRows;
  }, [expandedGroups]);

  // Virtualizers
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (rows[i].type === "group" ? 32 : rows[i].type === "chart" ? 120 : 40) * zoomLevel,
    overscan: 10,
  });

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: columns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => intensiveTimelineColumnWidthPx(resolution),
    overscan: 5,
  });

  const sidebarWidth = 200;
  const headerHeight = 40;

  return (
    <div
      ref={parentRef}
      id="flow-sheet-grid-container"
      className="flex-1 overflow-auto bg-zinc-950 relative border-l border-zinc-800 scrollbar-thin scrollbar-thumb-zinc-800"
    >
      <motion.div
        animate={{ 
          // If editing a cell, force scale 1.0 for clarity, otherwise use prop zoomLevel
          scale: editingCell || editingParamId ? 1 : zoomLevel,
          transformOrigin: "top left",
          width: editingCell || editingParamId ? "100%" : `${100 / zoomLevel}%`,
          height: editingCell || editingParamId ? "100%" : `${100 / zoomLevel}%`
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: `${columnVirtualizer.getTotalSize() + sidebarWidth}px`, 
          position: "relative",
        }}
      >
        {/* Sticky Corner (Empty) */}
        <div 
          className="sticky top-0 left-0 z-[60] bg-zinc-900 border-b border-r border-zinc-800 flex items-center px-4 h-10 w-[200px]"
        >
          <span className="text-[10px] font-bold text-zinc-500 uppercase">Parameter</span>
        </div>

        {/* Sticky Time Header */}
        <div className="sticky top-0 z-50 flex h-10 ml-[200px]">
          {columnVirtualizer.getVirtualItems().map((vCol) => {
            const time = columns[vCol.index];
            return (
              <div
                key={vCol.key}
                className="absolute top-0 flex flex-col items-center justify-center border-b border-r border-zinc-800 bg-zinc-900 h-10"
                style={{
                  width: `${vCol.size}px`,
                  transform: `translateX(${vCol.start}px)`,
                }}
              >
                <span className="text-[11px] font-mono text-zinc-300 font-bold">
                  {format(time, "HH:mm")}
                </span>
                {resolution === "1h" && (
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tighter">Jam Ke-{vCol.index + 1}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid Rows */}
        {rowVirtualizer.getVirtualItems().map((vRow) => {
          const row = rows[vRow.index];
          const isGroup = row.type === "group";
          const isEditingRow = (editingCell?.paramId === row.id) || (editingParamId === row.id);

          return (
            <div
              key={vRow.key}
              className={`absolute left-0 w-full flex border-b border-zinc-900/50 transition-all duration-300 ${
                isGroup ? "bg-zinc-900/50 z-10" : isEditingRow ? "bg-blue-500/10 z-20 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]" : "hover:bg-zinc-900/10"
              }`}
              style={{
                height: `${vRow.size}px`,
                transform: `translateY(${vRow.start + headerHeight}px) ${isEditingRow ? 'scale(1.01)' : 'scale(1)'}`,
              }}
            >
              {/* Sticky Parameter Sidebar */}
              <div 
                className="sticky left-0 z-40 h-full bg-zinc-950 border-r border-zinc-800 flex items-center justify-between px-4 w-[200px]"
              >
                {isGroup ? (
                  <>
                    <button 
                      onClick={() => toggleGroup(row.id)}
                      className="flex items-center gap-2 font-bold text-zinc-400 hover:text-white uppercase transition-colors text-[10px]"
                    >
                      <span 
                        className="rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] w-1.5 h-1.5" 
                      />
                      {row.name}
                    </button>
                    <button 
                      onClick={(e) => handleAddItem(row.id, e)}
                      className="p-1 hover:bg-white/10 rounded-md text-zinc-500 hover:text-blue-400 transition-colors"
                      title="Tambah Item"
                    >
                      <Plus size={12} />
                    </button>
                  </>
                ) : row.type === 'multi-param' ? (
                  <div className="flex-1 flex gap-4 h-full py-1">
                    {row.params.map((p: any) => (
                      <div key={p.id} className="flex-1 flex flex-col justify-center border-r border-zinc-800/50 last:border-0 pr-2">
                        <span className="text-xs font-medium text-zinc-300">{p.name}</span>
                        {p.unit && <span className="text-[9px] text-zinc-500 uppercase font-bold">{p.unit}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={(e) => handleEditParam(row, e)}
                    className="flex-1 flex flex-col group/item cursor-pointer h-full justify-center"
                  >
                    <div className="flex items-center gap-1.5 h-full">
                      {editingParamId === row.id ? (
                        <input
                          autoFocus
                          defaultValue={row.name}
                          onBlur={(e) => {
                            updateParameter(row.id, e.target.value, row.unit);
                            setEditingParamId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              updateParameter(row.id, e.currentTarget.value, row.unit);
                              setEditingParamId(null);
                            }
                            if (e.key === "Escape") setEditingParamId(null);
                          }}
                          className="w-full bg-blue-500/10 border-none font-medium text-white outline-none px-1 rounded ring-1 ring-blue-500/50 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span 
                            className={`font-medium transition-colors ${row.color || "text-zinc-300 group-hover/item:text-blue-400"} text-xs`}
                          >
                            {row.name}
                          </span>
                          <Edit2 size={8} className="opacity-0 group-hover/item:opacity-100 text-zinc-500 transition-opacity" />
                        </>
                      )}
                    </div>
                    {!editingParamId && row.unit && (
                      <span className="uppercase font-bold text-zinc-500 text-[9px]">
                        {row.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Data Cells OR Static Info */}
              <div className="relative flex-1">
                {isGroup ? null : row.type === 'multi-param' ? (
                  <div className="sticky left-0 z-30 h-full flex gap-4 px-4 bg-zinc-900 border-r border-zinc-800 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.5)]" style={{ width: '400px' }}>
                    {row.params.map((p: any) => (
                      <div key={p.id} className="flex-1 flex items-center gap-2 border-r border-zinc-800/50 last:border-0 h-full px-2">
                        {p.unit?.toLowerCase().includes('ya/tidak') || p.unit?.toLowerCase().includes('ya / tidak') ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateData(p.id, 'static', 'Ya')}
                              className={`px-3 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                data[p.id]?.['static'] === 'Ya' 
                                  ? "bg-blue-600 text-white shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                              }`}
                            >Ya</button>
                            <button
                              onClick={() => updateData(p.id, 'static', 'Tidak')}
                              className={`px-3 py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                                data[p.id]?.['static'] === 'Tidak' 
                                  ? "bg-zinc-600 text-white shadow-[0_0_8px_rgba(113,113,122,0.5)]" 
                                  : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                              }`}
                            >Tidak</button>
                          </div>
                        ) : (
                          <div 
                            className="flex-1 flex items-center group/static cursor-pointer h-full"
                            onClick={() => setEditingCell({ paramId: p.id, timestamp: 'static' })}
                          >
                            {editingCell?.paramId === p.id && editingCell?.timestamp === 'static' ? (
                              <input
                                autoFocus
                                defaultValue={data[p.id]?.['static'] || ""}
                                onBlur={(e) => {
                                  updateData(p.id, 'static', e.target.value);
                                  setEditingCell(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    updateData(p.id, 'static', e.currentTarget.value);
                                    setEditingCell(null);
                                  }
                                  if (e.key === "Escape") setEditingCell(null);
                                }}
                                className="w-full bg-zinc-950 border border-blue-500 rounded px-2 py-0.5 text-white text-xs outline-none"
                              />
                            ) : (
                              <div className="text-xs font-medium text-blue-400 group-hover:text-white truncate">
                                {data[p.id]?.['static'] || "..."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (row.groupId === 'invasive' || row.groupId === 'monitoring' || row.groupId === 'medical-info') ? (
                  // Static Value Layout (Non-time based)
                  <div className="sticky left-0 z-30 h-full flex items-center px-4 bg-zinc-900 border-r border-zinc-800 shadow-[10px_0_15px_-5px_rgba(0,0,0,0.5)]" style={{ width: '400px' }}>
                    {row.unit?.toLowerCase().includes('ya/tidak') || row.unit?.toLowerCase().includes('ya / tidak') ? (
                      // Checklist Style (Ya / Tidak)
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateData(row.id, 'static', 'Ya')}
                          className={`px-4 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                            data[row.id]?.['static'] === 'Ya' 
                              ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                              : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          Ya
                        </button>
                        <button
                          onClick={() => updateData(row.id, 'static', 'Tidak')}
                          className={`px-4 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                            data[row.id]?.['static'] === 'Tidak' 
                              ? "bg-zinc-600 text-white shadow-[0_0_10px_rgba(113,113,122,0.5)]" 
                              : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                          }`}
                        >
                          Tidak
                        </button>
                      </div>
                    ) : (
                      // Standard Static Input
                      <div 
                        className="flex-1 flex items-center group/static cursor-pointer h-full"
                        onClick={() => setEditingCell({ paramId: row.id, timestamp: 'static' })}
                      >
                        {editingCell?.paramId === row.id && editingCell?.timestamp === 'static' ? (
                          <input
                            autoFocus
                            defaultValue={data[row.id]?.['static'] || ""}
                            onBlur={(e) => {
                              updateData(row.id, 'static', e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateData(row.id, 'static', e.currentTarget.value);
                                
                                // Find next static row
                                const currentRowIndex = rows.findIndex(r => r.id === row.id);
                                let nextRowIndex = currentRowIndex + 1;
                                while (nextRowIndex < rows.length && rows[nextRowIndex].type !== "param") {
                                  nextRowIndex++;
                                }
                                if (nextRowIndex < rows.length) {
                                  setEditingCell({ paramId: rows[nextRowIndex].id, timestamp: 'static' });
                                } else {
                                  setEditingCell(null);
                                }
                              }
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full bg-zinc-900 border-2 border-blue-500 rounded px-2 py-1 text-white text-sm outline-none font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                          />
                        ) : (
                          <div className="text-sm font-medium text-blue-400 group-hover/static:text-white transition-colors">
                            {data[row.id]?.['static'] || <span className="text-zinc-700 italic">Klik untuk isi...</span>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : !isGroup && columnVirtualizer.getVirtualItems().map((vCol) => {
                  const colStartTime = columns[vCol.index];
                  const step = resolution === "1m" ? 1 : resolution === "15m" ? 15 : 60;
                  const colEndTime = subMinutes(addMinutes(colStartTime, step), 1);
                  
                  const paramData = data[row.id] || {};
                  let displayValue = "—";
                  let actualTime = "";

                  if (resolution === "1m") {
                    const ts = format(colStartTime, "yyyy-MM-dd'T'HH:mm:ss");
                    displayValue = String(paramData[ts] ?? "—");
                    actualTime = ts;
                  } else {
                    const entries = Object.entries(paramData)
                      .filter(([ts]) => {
                        const d = new Date(ts);
                        return d >= colStartTime && d <= colEndTime;
                      })
                      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
                    
                    if (entries.length > 0) {
                      displayValue = entries[0][1].toString();
                      actualTime = entries[0][0];
                    }
                  }

                  const isEditing = editingCell?.paramId === row.id && editingCell?.timestamp === (actualTime || format(colStartTime, "yyyy-MM-dd'T'HH:mm:ss"));
                  const isShifted = resolution !== "1m" && actualTime && format(new Date(actualTime), "mm") !== "00";
                  const targetTimestamp = actualTime || format(colStartTime, "yyyy-MM-dd'T'HH:mm:ss");

                  return (
                    <div
                      key={vCol.key}
                      onClick={() => setEditingCell({ paramId: row.id, timestamp: targetTimestamp })}
                      className={`absolute top-0 h-full border-r border-zinc-900/50 flex flex-col items-center justify-center group cursor-pointer transition-colors ${
                        isEditing ? "bg-blue-500/20 ring-1 ring-inset ring-blue-500 z-20" : "hover:bg-white/5"
                      }`}
                      style={{
                        width: `${vCol.size}px`,
                        transform: `translateX(${vCol.start}px)`,
                      }}
                    >
                      {isEditing ? (
                        <div className="absolute inset-0 z-30 p-0.5">
                          <input
                            autoFocus
                            defaultValue={displayValue === "—" ? "" : displayValue}
                            onBlur={(e) => {
                              updateData(row.id, targetTimestamp, e.target.value);
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                updateData(row.id, targetTimestamp, e.currentTarget.value);
                                
                                // Find next inputable row
                                const currentRowIndex = rows.findIndex(r => r.id === row.id && r.type === "param");
                                let nextRowIndex = currentRowIndex + 1;
                                while (nextRowIndex < rows.length && rows[nextRowIndex].type !== "param") {
                                  nextRowIndex++;
                                }

                                if (nextRowIndex < rows.length) {
                                  const nextRow = rows[nextRowIndex];
                                  setEditingCell({ paramId: nextRow.id, timestamp: targetTimestamp });
                                } else {
                                  setEditingCell(null);
                                }
                              }
                              if (e.key === "Escape") setEditingCell(null);
                            }}
                            className="w-full h-full bg-zinc-900 border-2 border-blue-500 rounded shadow-[0_0_15px_rgba(59,130,246,0.5)] text-center font-mono text-white outline-none text-sm font-bold"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <div 
                            className={`font-mono transition-colors ${displayValue !== "—" ? "text-white font-bold" : "text-zinc-600 group-hover:text-blue-400"} text-xs`}
                          >
                            {displayValue}
                          </div>
                          {isShifted && displayValue !== "—" && (
                            <span 
                              className="text-blue-400 font-bold bg-blue-500/10 px-1 rounded text-[7px]"
                            >
                              :{format(new Date(actualTime), "mm")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Elegant Add Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-2xl p-6 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {activeParamId ? <Edit2 className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                    {activeParamId ? "Edit Parameter" : "Tambah Item Baru"}
                  </h3>
                  {!activeParamId && (
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                      Grup: {groups.find(g => g.id === activeGroupId)?.name}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Nama Parameter</label>
                    <input
                      autoFocus
                      placeholder="Misal: Dopamine, Urine Drain..."
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && confirmAddItem()}
                      className="bg-black/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Satuan (Unit)</label>
                    <input
                      placeholder="Misal: ml, mcg, bpm..."
                      value={newItem.unit}
                      onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && confirmAddItem()}
                      className="bg-black/50 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmAddItem}
                    disabled={!newItem.name}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 shadow-lg shadow-blue-900/20 text-sm font-bold text-white hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
