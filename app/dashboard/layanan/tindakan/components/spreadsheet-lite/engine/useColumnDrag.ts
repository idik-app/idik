"use client";

import { useState } from "react";

export function useColumnDrag() {
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  function startDrag(index: number) {
    setDragging(index);
    setDragOver(index);
  }

  function enterColumn(index: number) {
    if (dragging !== null) setDragOver(index);
  }

  function endDrag() {
    const from = dragging;
    const to = dragOver;
    setDragging(null);
    setDragOver(null);
    return { from, to };
  }

  return {
    dragging,
    dragOver,
    startDrag,
    enterColumn,
    endDrag,
  };
}
