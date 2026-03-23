"use client";

import React from "react";

interface Props {
  r: number;
  row: string[];
  onClick: () => void;
  onEdit: () => void;
}

export default function SpreadsheetRow({ r, row, onClick, onEdit }: Props) {
  return (
    <tr onClick={onClick} className="cursor-pointer">
      {row.map((cell, c) => (
        <td
          key={c}
          style={{
            position: c === 0 ? "sticky" : "static",
            left: c === 0 ? 0 : "auto",
            zIndex: c === 0 ? 20 : 1,
            background: c === 0 ? "rgba(0,0,0,0.35)" : "transparent",
            backdropFilter: c === 0 ? "blur(4px)" : undefined,
          }}
          className="
            px-3 py-2 
            text-sm 
            border-r border-cyan-900/50
            whitespace-nowrap
          "
        >
          {cell}
        </td>
      ))}

      <td className="px-3 py-2 text-cyan-400 cursor-pointer">
        <button onClick={onEdit}>Edit</button>
      </td>
    </tr>
  );
}
