"use client";
import ToolbarSearchFilter from "./ToolbarSearchFilter";

/*───────────────────────────────────────────────
🧬 ToolbarHeader — Pencarian & filter (paginasi hanya di bawah tabel)
───────────────────────────────────────────────*/
export function ToolbarHeader() {
  return (
    <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-top-1 duration-200">
      <ToolbarSearchFilter />
    </div>
  );
}
