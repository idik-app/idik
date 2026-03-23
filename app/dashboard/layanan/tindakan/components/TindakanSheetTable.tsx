"use client";

import { useRef, useState } from "react";

export default function TindakanSheetTable({ rows }: { rows: any[] }) {
  const headers = [
    "Tanggal",
    "Nama Pasien",
    "Dokter",
    "Jenis Tindakan",
    "Status",
  ];

  const tableRef = useRef<HTMLDivElement | null>(null);
  const [colWidths, setColWidths] = useState<number[]>(
    Array(headers.length).fill(180)
  );

  const startResize = (e: any, index: number) => {
    const startX = e.clientX;
    const startWidth = colWidths[index];

    const onMouseMove = (moveEvent: any) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(90, startWidth + delta);

      setColWidths((prev) => {
        const updated = [...prev];
        updated[index] = newWidth;
        return updated;
      });
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const autoSize = (index: number) => {
    const candidates: string[] = [
      headers[index],
      ...rows.map((r) => String(Object.values(r)?.[index] ?? "")),
    ];
    const longestValue = candidates.reduce(
      (a, b) => (b.length > a.length ? b : a),
      ""
    );

    const calculatedWidth = Math.min(
      500,
      Math.max(100, longestValue.length * 10)
    );
    setColWidths((prev) => {
      const updated = [...prev];
      updated[index] = calculatedWidth;
      return updated;
    });
  };

  return (
    <div
      ref={tableRef}
      className="
        w-full
        max-h-[65vh]
        overflow-auto
        border border-cyan-900/40
        rounded-lg
        bg-black/20
        backdrop-blur-md
        scrollbar-thin
        scrollbar-thumb-cyan-800/60
        scrollbar-track-transparent
      "
    >
      <table className="w-max border-collapse min-w-full">
        {/* HEADER */}
        <thead className="sticky top-0 bg-black/60 backdrop-blur-xl z-20">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                style={{ width: colWidths[i] }}
                className="relative select-none px-3 py-3 border-b border-cyan-900/40 font-semibold text-left"
                onDoubleClick={() => autoSize(i)}
              >
                {header}

                {/* Column resize handle */}
                <div
                  onMouseDown={(e) => startResize(e, i)}
                  className="absolute top-0 right-0 h-full w-[6px] cursor-col-resize hover:bg-cyan-500/40"
                />
              </th>
            ))}
          </tr>
        </thead>

        {/* BODY */}
        <tbody>
          {rows.map((row: any, rowIndex: number) => (
            <tr
              key={rowIndex}
              className="hover:bg-cyan-900/10 border-b border-gray-800"
            >
              {Object.values(row).map((cell: any, colIndex: number) => (
                <td
                  key={colIndex}
                  style={{ width: colWidths[colIndex] }}
                  className="
                    px-3 py-2 
                    whitespace-nowrap 
                    border-r border-gray-800
                    hover:bg-cyan-800/10
                    cursor-default
                  "
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
