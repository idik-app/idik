"use client";

interface Props {
  row: string[];
  r: number;
  onClick: () => void;
  onEdit: () => void;
}

export default function SpreadsheetRowVirtual({
  row,
  r,
  onClick,
  onEdit,
}: Props) {
  return (
    <div
      onClick={onClick}
      className="
        flex 
        border-b border-cyan-950/40 
        text-sm text-gray-200
        hover:bg-cyan-900/30
        cursor-pointer
      "
    >
      {row.map((cell, c) => (
        <div
          key={c}
          className="px-3 py-2 border-r border-cyan-900/50 whitespace-nowrap"
          style={{
            minWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",

            position: c === 0 ? "sticky" : undefined,
            left: c === 0 ? 0 : undefined,
            background: c === 0 ? "rgba(0,0,0,0.35)" : undefined,
            backdropFilter: c === 0 ? "blur(4px)" : undefined,
            zIndex: c === 0 ? 20 : 1,
          }}
        >
          {cell}
        </div>
      ))}

      <div
        className="px-3 py-2 text-cyan-400 hover:text-cyan-200 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        Edit
      </div>
    </div>
  );
}
