"use client";

import { useState, useEffect, useRef } from "react";

export function useSpreadsheetColumns(initialCount: number = 10) {
  const initialized = useRef(false);

  const [columns, setColumns] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<number[]>([]);

  if (!initialized.current) {
    initialized.current = true;

    const base = Array.from(
      { length: initialCount },
      (_, i) => `Kolom ${i + 1}`
    );

    setColumns(base);
    setColumnWidths(base.map(() => 140));
  }

  useEffect(() => {
    setColumnWidths((prev) => {
      if (prev.length < columns.length) {
        return [...prev, ...Array(columns.length - prev.length).fill(140)];
      }
      if (prev.length > columns.length) {
        return prev.slice(0, columns.length);
      }
      return prev;
    });
  }, [columns]);

  const addColumn = (index?: number) => {
    const newName = `Kolom ${columns.length + 1}`;

    if (index === undefined) {
      setColumns((prev) => [...prev, newName]);
      setColumnWidths((prev) => [...prev, 140]);
      return;
    }

    setColumns((prev) => [
      ...prev.slice(0, index + 1),
      newName,
      ...prev.slice(index + 1),
    ]);

    setColumnWidths((prev) => [
      ...prev.slice(0, index + 1),
      140,
      ...prev.slice(index + 1),
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
    setColumnWidths((prev) => prev.filter((_, i) => i !== index));
  };

  const updateColumn = (i: number, newName: string) => {
    setColumns((prev) => {
      const next = [...prev];
      next[i] = newName;
      return next;
    });
  };

  const reorderColumns = (from: number, to: number) => {
    setColumns((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    setColumnWidths((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  return {
    columns,
    columnWidths,
    setColumnWidths,
    addColumn,
    removeColumn,
    updateColumn,
    reorderColumns,
  };
}
