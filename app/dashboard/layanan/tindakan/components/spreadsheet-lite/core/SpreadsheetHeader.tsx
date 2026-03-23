"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";

import { useColumnDrag } from "../engine/useColumnDrag";
import { useColumnResize } from "../engine/useColumnResize";

interface Props {
  columns: string[];
  columnWidths: number[];
  setColumnWidths: (fn: (prev: number[]) => number[]) => void;

  updateColumn: (index: number, value: string) => void;
  addColumn: (index?: number) => void;
  removeColumn: (index: number) => void;
  reorderColumns: (from: number, to: number) => void;
}

export default function SpreadsheetHeader({
  columns,
  columnWidths,
  setColumnWidths,
  updateColumn,
  addColumn,
  removeColumn,
  reorderColumns,
}: Props) {
  /* Column Resizing */
  const { startResize } = useColumnResize(columnWidths, setColumnWidths);

  /* Column Drag */
  const { dragging, dragOver, startDrag, enterColumn, endDrag } =
    useColumnDrag();

  /* Editing */
  const [editing, setEditing] = useState<number | null>(null);
  const [value, setValue] = useState("");

  /* Menu */
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function startEdit(i: number) {
    setEditing(i);
    setValue(columns[i]);
  }

  function commitEdit() {
    if (editing !== null) updateColumn(editing, value);
    setEditing(null);
    setValue("");
  }

  function startResizeHandle(index: number, e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;

    const move = (ev: MouseEvent) => {
      const doResize = startResize(index, startX);
      doResize(ev.clientX);
    };

    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return (
    <thead className="sticky top-0 bg-black/40 backdrop-blur border-b border-cyan-700/60 z-20">
      <tr>
        {columns.map((col, i) => (
          <th
            key={i}
            draggable
            onDragStart={() => startDrag(i)}
            onDragEnter={() => enterColumn(i)}
            onDragEnd={() => {
              const pos = endDrag();
              if (pos.from !== null && pos.to !== null) {
                reorderColumns(pos.from, pos.to);
              }
            }}
            style={{ width: columnWidths[i] }}
            className={`relative px-3 py-2 text-left text-sm font-semibold text-cyan-300 
              border-r border-cyan-800/60 first:border-l first:border-cyan-800/60
              ${dragging === i ? "opacity-40" : ""}
              ${dragOver === i && dragging !== null ? "bg-cyan-900/40" : ""}
            `}
          >
            {editing === i ? (
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditing(null);
                }}
                className="w-full bg-black/40 px-2 py-1 border border-cyan-400 rounded text-cyan-100"
              />
            ) : (
              <div className="relative select-none">
                <span onDoubleClick={() => startEdit(i)}>{col}</span>

                {/* MENU BUTTON */}
                <button
                  onClick={() => setMenuOpen(menuOpen === i ? null : i)}
                  className="absolute right-0 top-1 p-1 rounded text-cyan-500 hover:text-cyan-300 hover:bg-cyan-900/20 z-20"
                >
                  <MoreVertical size={14} />
                </button>

                {/* MENU DROPDOWN */}
                {menuOpen === i && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-7 w-44 bg-black/70 backdrop-blur border border-cyan-700/60 rounded shadow-lg text-sm z-30"
                  >
                    <button
                      onClick={() => startEdit(i)}
                      className="block w-full text-left px-3 py-2 hover:bg-cyan-900/30"
                    >
                      Rename Kolom
                    </button>

                    <button
                      onClick={() => {
                        addColumn(i);
                        setMenuOpen(null);
                      }}
                      className="block w-full text-left px-3 py-2 hover:bg-cyan-900/30"
                    >
                      Tambah Kolom di Kanan
                    </button>

                    <button
                      onClick={() => {
                        removeColumn(i);
                        setMenuOpen(null);
                      }}
                      className="block w-full text-left px-3 py-2 text-red-400 hover:bg-red-900/30"
                    >
                      Hapus Kolom
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* RESIZE HANDLE */}
            <div
              onMouseDown={(e) => startResizeHandle(i, e)}
              className="absolute top-0 right-[-20px] h-full w-10 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-cyan-500/25 z-10"
            ></div>
          </th>
        ))}
      </tr>
    </thead>
  );
}
