/* ===============================================================
   UI SERVICE — MENU & POPUP (FINAL CLEAN BUILD v5.1)
   Kompatibel dengan Bundle Final v11.5
=============================================================== */

var UIService = {

  /* -------------------------------
       BUILD MENU
  -------------------------------- */
  initMenu: function () {
    SpreadsheetApp.getUi()
      .createMenu("🩺 Cathlab Pemakaian")
      .addItem("Buka Form Pemakaian", "openPemakaianForm")    // global wrapper di main.gs
      .addItem("Update OUTPUT", "generateOutput")              // global wrapper di main.gs
      .addItem("Migrasi AM (Standarisasi)", "migrateAM")       // NEW — wrapper di main.gs
      .addToUi();
  },

  /* -------------------------------
       OPEN POPUP FORM
  -------------------------------- */
  openPemakaianForm: function () {
    var html = HtmlService
      .createHtmlOutputFromFile("PopupPemakaian")
      .setTitle("Cathlab – Form Pemakaian Alkes")
      .setWidth(540)
      .setHeight(700)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

    SpreadsheetApp.getUi().showModalDialog(html, "Pemakaian Alkes");
  }

};
