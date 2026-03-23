/**
 * IDIK-App Autonomous Cleaner v1
 * ------------------------------------
 * Membersihkan modul lama, engine konflik,
 * file duplicate, utils usang, ui lama,
 * dan AG-Grid modules yang tidak dipakai.
 */

const fs = require("fs");
const path = require("path");

const base = "app/dashboard/layanan/tindakan/components/spreadsheet-lite";

const removeTargets = [
  // ENGINE lama (konflik)
  "engine/types.ts",
  "engine/useSpreadsheetCore.ts",
  "engine/useSpreadsheetCore.tsx",
  "engine/useContextMenu.ts",
  "engine/useSelection.ts",
  "engine/index.ts",

  // UI lama (tidak dipakai)
  "ui/SpreadsheetCell.tsx",
  "ui/SpreadsheetContextMenu.tsx",
  "ui/SpreadsheetShortcutPanel.tsx",
  "ui/SpreadsheetToolbar.tsx",
  "ui/index.ts",

  // Utils lama
  "utils/clipboard.ts",
  "utils/contextMenuUtils.ts",
  "utils/matrix.ts",
  "utils/selectionUtils.ts",
  "utils/index.ts",

  // Core lama
  "core/SpreadsheetLite.tsx",
  "core/index.ts",
];

// Hapus folder AG-Grid lama
const legacySpreadsheetFolder = "app/dashboard/layanan/tindakan/spreadsheet";

function safeDelete(filepath) {
  if (fs.existsSync(filepath)) {
    fs.rmSync(filepath, { recursive: true, force: true });
    console.log("[Removed]", filepath);
  } else {
    console.log("[Skip]     ", filepath);
  }
}

console.log("----------- IDIK-App Clean Start -----------");

for (const file of removeTargets) {
  safeDelete(path.join(base, file));
}

safeDelete(legacySpreadsheetFolder);

console.log("----------- CLEANUP DONE -----------");
