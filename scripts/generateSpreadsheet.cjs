const fs = require("fs");
const path = require("path");

const base = path.join(
  process.cwd(),
  "app/dashboard/layanan/tindakan/spreadsheet"
);

const folders = ["core", "ui", "hooks", "store", "supabase", "types"];

const files = {
  "ui/Spreadsheet.tsx": `
"use client";
import Grid from "./Grid";
import Toolbar from "./Toolbar";
import FormulaBar from "./FormulaBar";
import ScrollWrap from "./ScrollWrap";

export default function Spreadsheet() {
  return (
    <div className="w-full space-y-3">
      <Toolbar />
      <FormulaBar />
      <ScrollWrap>
        <Grid />
      </ScrollWrap>
    </div>
  );
}
`,

  "ui/Grid.tsx": `
"use client";
import Cell from "./Cell";
import ColumnHeader from "./ColumnHeader";
import RowHeader from "./RowHeader";
import { useGrid } from "../hooks/useGrid";

export default function Grid() {
  const { grid } = useGrid();

  return (
    <table className="border-separate border-spacing-0 min-w-max">
      <thead className="sticky top-0 z-20">
        <tr>
          <th className="w-10 bg-black/60 backdrop-blur-xl"></th>
          {grid[0].map((_, c) => (
            <ColumnHeader key={c} index={c} />
          ))}
        </tr>
      </thead>

      <tbody>
        {grid.map((row, r) => (
          <tr key={r}>
            <RowHeader index={r} />
            {row.map((val, c) => (
              <Cell key={\`\${r}-\${c}\`} r={r} c={c} value={val} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
`,

  "ui/Cell.tsx": `
"use client";
import { useGrid } from "../hooks/useGrid";
import { useEditing } from "../hooks/useEditing";
import { useSelection } from "../hooks/useSelection";

export default function Cell({ r, c, value }) {
  const { updateCell } = useGrid();
  const { editing, setEditing } = useEditing();
  const { focus, setFocus } = useSelection();

  const isFocused = focus?.r === r && focus?.c === c;
  const isEditing = editing?.r === r && editing?.c === c;

  return (
    <td
      onClick={() => setFocus({ r, c })}
      onDoubleClick={() => setEditing({ r, c })}
      className={\`
        min-w-[140px] h-[32px] px-2 py-1
        border border-cyan-900/30
        text-sm text-gray-200
        hover:bg-cyan-800/10
        bg-black/20 select-none cursor-text
        \${isFocused ? "outline outline-2 outline-cyan-400 z-30" : ""}
      \`}
    >
      {isEditing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => updateCell(r, c, e.target.value)}
          onBlur={() => setEditing(null)}
          className="w-full bg-black/60 text-cyan-100 px-1 rounded outline-none"
        />
      ) : (
        value
      )}
    </td>
  );
}
`,

  "ui/ColumnHeader.tsx": `
export default function ColumnHeader({ index }) {
  return (
    <th
      className="
        px-3 py-2 text-xs font-semibold uppercase tracking-wider 
        text-cyan-200 bg-black/60 backdrop-blur-xl 
        border-b border-cyan-900/40 sticky top-0
      "
    >
      {String.fromCharCode(65 + index)}
    </th>
  );
}
`,

  "ui/RowHeader.tsx": `
export default function RowHeader({ index }) {
  return (
    <th
      className="
        sticky left-0 z-20 bg-black/60 backdrop-blur-xl 
        px-3 py-2 text-xs text-gray-400
        border-r border-cyan-900/40
      "
    >
      {index + 1}
    </th>
  );
}
`,

  "ui/Toolbar.tsx": `
export default function Toolbar() {
  return (
    <div className="flex items-center gap-3 p-3 bg-black/40 border border-cyan-900/40 backdrop-blur-xl rounded-lg">
      <button className="px-3 py-1 bg-black/50 text-cyan-300 hover:bg-cyan-900/40 rounded">Undo</button>
      <button className="px-3 py-1 bg-black/50 text-cyan-300 hover:bg-cyan-900/40 rounded">Redo</button>
      <span className="text-gray-500">|</span>
      <button className="px-3 py-1 bg-black/50 text-cyan-300 hover:bg-cyan-900/40 rounded">+ Kolom</button>
      <button className="px-3 py-1 bg-black/50 text-cyan-300 hover:bg-cyan-900/40 rounded">+ Baris</button>
    </div>
  );
}
`,

  "ui/FormulaBar.tsx": `
import { useSelection } from "../hooks/useSelection";

export default function FormulaBar() {
  const { focus } = useSelection();

  return (
    <div className="flex items-center gap-3 bg-black/40 border border-cyan-900/40 backdrop-blur-xl rounded px-3 py-2">
      <div className="text-cyan-400 font-mono w-16 text-sm">
        {focus ? String.fromCharCode(65 + focus.c) + (focus.r + 1) : ""}
      </div>
      <input className="flex-1 bg-transparent text-gray-200 outline-none" />
    </div>
  );
}
`,

  "ui/ScrollWrap.tsx": `
export default function ScrollWrap({ children }) {
  return (
    <div className="overflow-auto max-h-[70vh] border border-cyan-900/40 rounded-lg">
      {children}
    </div>
  );
}
`,

  "hooks/useGrid.ts": `
import { useState } from "react";

export function useGrid() {
  const initialRows = 200;
  const initialCols = 26;

  const [grid, setGrid] = useState(
    Array.from({ length: initialRows }, () =>
      Array.from({ length: initialCols }, () => "")
    )
  );

  const updateCell = (r, c, val) => {
    const copy = [...grid];
    copy[r][c] = val;
    setGrid(copy);
  };

  return { grid, updateCell };
}
`,

  "hooks/useSelection.ts": `
import { useState } from "react";

export function useSelection() {
  const [focus, setFocus] = useState(null);
  return { focus, setFocus };
}
`,

  "hooks/useEditing.ts": `
import { useState } from "react";

export function useEditing() {
  const [editing, setEditing] = useState(null);
  return { editing, setEditing };
}
`,

  "types/cell.ts": `
export interface CellValue {
  value: string;
}
`,

  "core/grid.ts": `// grid utilities placeholder`,
  "core/editing.ts": `// editing logic placeholder`,
  "core/resize.ts": `// resize logic placeholder`,
  "core/navigation.ts": `// keyboard navigation placeholder`,
  "core/selection.ts": `// selection tools placeholder`,
  "core/formula.ts": `// formula engine placeholder`,

  "store/gridStore.ts": `// Zustand placeholder`,
  "store/editingStore.ts": `// Zustand placeholder`,
  "store/selectionStore.ts": `// Zustand placeholder`,

  "supabase/syncCells.ts": `// save cell to supabase`,
  "supabase/syncGrid.ts": `// load grid`,
  "supabase/syncColumns.ts": `// load columns`,
};

// Create folders
folders.forEach((folder) => {
  fs.mkdirSync(path.join(base, folder), { recursive: true });
});

// Create files
Object.entries(files).forEach(([file, content]) => {
  fs.writeFileSync(path.join(base, file), content.trim());
});

console.log("Spreadsheet module generated successfully!");
