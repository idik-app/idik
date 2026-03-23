"use client";

import { useState, useEffect, useRef } from "react";

export function useSpreadsheetRows(colCount: number) {
  const initial = useRef<string[][]>(
    Array.from({ length: 2 }, () => Array(colCount).fill(""))
  );

  const [rows, setRows] = useState<string[][]>(initial.current);

  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.length < colCount)
          return [...row, ...Array(colCount - row.length).fill("")];
        if (row.length > colCount) return row.slice(0, colCount);
        return row;
      })
    );
  }, [colCount]);

  const addRow = () => {
    setRows((prev) => [...prev, Array(colCount).fill("")]);
  };

  const removeRow = (r: number) => {
    setRows((prev) => prev.filter((_, i) => i !== r));
  };

  const startEdit = (r: number, c: number) => {
    setEditing({ r, c });
    setEditValue(rows[r][c]);
  };

  const commitEdit = () => {
    if (!editing) return;

    const copy = [...rows];
    copy[editing.r][editing.c] = editValue;

    setRows(copy);
    setEditing(null);
    setEditValue("");
  };

  return {
    rows,
    addRow,
    removeRow,
    editing,
    startEdit,
    editValue,
    setEditValue,
    commitEdit,
    setRows,
  };
}
