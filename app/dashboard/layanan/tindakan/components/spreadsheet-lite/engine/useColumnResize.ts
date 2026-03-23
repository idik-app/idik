"use client";

import { useRef, useCallback } from "react";

/**
 * Column Resize — HOOK-STABLE VERSION
 * Tidak tergantung columnWidths di dependency → tidak merusak hook-order global
 */
export function useColumnResize(
  columnWidths: number[],
  setColumnWidths: (fn: (prev: number[]) => number[]) => void
) {
  const baseWidthRef = useRef(0);

  const startResize = useCallback(
    (index: number, startX: number) => {
      baseWidthRef.current = columnWidths[index];

      return (moveX: number) => {
        const delta = moveX - startX;

        setColumnWidths((prev) => {
          const copy = [...prev];
          copy[index] = Math.max(10, baseWidthRef.current + delta);
          return copy;
        });
      };
    },
    [setColumnWidths]
  );

  return { startResize };
}
