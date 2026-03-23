"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSpreadsheetRows } from "../core/useSpreadsheetRows";

interface Props {
  r: number;
  c: number;
  value: string;
  startEdit: (r: number, c: number) => void;
  editing: { r: number; c: number } | null;
  editValue: string;
  setEditValue: (v: string) => void;
  commitEdit: () => void;
}

export default function SpreadsheetCell({
  r,
  c,
  value,
  startEdit,
  editing,
  editValue,
  setEditValue,
  commitEdit,
}: Props) {
  const isEditing = editing && editing.r === r && editing.c === c;
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <td className="px-2 py-1 border border-cyan-900/40 bg-cyan-900/20">
        <input
          ref={ref}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") commitEdit();
          }}
          className="w-full bg-transparent outline-none text-cyan-200"
        />
      </td>
    );
  }

  return (
    <td
      className="px-2 py-1 border border-cyan-900/40 cursor-text"
      onDoubleClick={() => startEdit(r, c)}
    >
      {value}
    </td>
  );
}
