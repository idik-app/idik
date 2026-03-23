/* ===============================================================
   MAIN CONTROLLER & API GATEWAY — CLEAN & STABLE BUILD v5.1
   Kompatibel dengan Bundle Final v11.5
=============================================================== */

/* -------------------------------
   ON OPEN → Build Menu
-------------------------------- */
function onOpen() {
  UIService.initMenu();

  // Optional: aman jika Toast tidak ada
  try {
    Toast.auto(1); // Sistem siap
  } catch (e) {}
}

/* ===============================================================
   MENU WRAPPERS — WAJIB GLOBAL
   (Google Sheets hanya bisa memanggil fungsi global)
=============================================================== */

// FORM pemakaian (Popup)
function openPemakaianForm() {
  UIService.openPemakaianForm();
}

// Generate sheet OUTPUT
function generateOutput() {
  OutputService.generate();
}

// Migrasi AM (standarisasi semua isi AM)
function migrateAM() {
  MigrationService.run();
}

/* ===============================================================
   API GATEWAY UNTUK HTML (PopupPemakaian)
=============================================================== */

// Memuat data pasien ke popup HTML
function apiLoadPasien() {
  return PasienService.load();
}

// Simpan resume pasien → AM (clean) + return WA text untuk popup
function apiSaveResume(row, p, alkes) {
  ResumeService.save(row, p, alkes);

  // Kembalikan versi WhatsApp (emoji)
  return ResumeService.buildWA(p, alkes);
}

// Trigger OUTPUT langsung dari popup HTML
function apiGenerateOutput() {
  return OutputService.generate();
}

/* ===============================================================
   EVENT HANDLER — ON EDIT
=============================================================== */
function onEdit(e) {
  PasienService.handleRow2Edit(e);
}
