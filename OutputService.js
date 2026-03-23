/* =====================================================================
   OUTPUT SERVICE v11 — PARSER v11 READY
   - Menggunakan ParserService v11 (format lama + baru)
   - Styling JARVIS
   - Tanpa auto-resize
   - ES5 compatible
===================================================================== */

var OutputService = {

  generate: function () {

    var ss  = SpreadsheetApp.getActive();
    var sh  = ss.getSheetByName("PASIEN");
    var out = ss.getSheetByName("OUTPUT");

    if (!out) out = ss.insertSheet("OUTPUT");

    var last = sh.getLastRow();

    /* ------------------------------------------------------------
       RESET OUTPUT
    ------------------------------------------------------------ */
    out.clear();
    out.appendRow([
      "Tanggal","No RM","Nama","Dokter","Barang","Ukuran","LOT","ED"
    ]);
    out.setFrozenRows(1);

    if (last < 2) {
      this.applyStyle(out);
      return;
    }

    /* ------------------------------------------------------------
       AM = kolom 39
    ------------------------------------------------------------ */
    var raw = sh.getRange(2, 39, last - 1, 1).getValues();
    var rows = [];


    /* ------------------------------------------------------------
       PARSE SEMUA DATA AM
    ------------------------------------------------------------ */
    for (var i = 0; i < raw.length; i++) {

      var text = raw[i][0];
      if (!text) continue;

      // Parse dengan parser universal v11
      var parsed;
      try {
        parsed = ParserService.parseAM(text);
      } catch (e) {
        parsed = null;
      }

      if (!parsed) continue;

      // tanggal tanpa jam
      var tanggal = parsed.tanggal || "";
      if (tanggal.indexOf(" ") > -1) {
        tanggal = tanggal.split(" ")[0].trim();
      }

      var norm   = parsed.norm   || "";
      var nama   = parsed.nama   || "";
      var dokter = parsed.dokter || "";

      if (parsed.alkes && parsed.alkes.length) {
        for (var j = 0; j < parsed.alkes.length; j++) {
          var it = parsed.alkes[j];

          rows.push([
            tanggal,
            norm,
            nama,
            dokter,
            it.barang || "",
            it.ukuran || "",
            it.lot || "",
            it.ed || ""
          ]);
        }
      }
    }


    /* ------------------------------------------------------------
       TULIS OUTPUT
    ------------------------------------------------------------ */
    if (rows.length > 0) {
      out.getRange(2, 1, rows.length, 8).setValues(rows);
    }

    this.applyStyle(out);
  },


  /* =====================================================================
     JARVIS STYLING
  ====================================================================== */
  applyStyle: function (sheet) {

    var lastR = sheet.getLastRow();
    var lastC = sheet.getLastColumn();

    if (lastR < 1) return;

    var full = sheet.getRange(1, 1, lastR, lastC);
    full.setFontFamily("Segoe UI").setWrap(true);

    /* HEADER */
    var head = sheet.getRange(1, 1, 1, lastC);
    head.setBackground("#003744")
        .setFontColor("#00eaff")
        .setFontWeight("bold")
        .setFontSize(12);

    /* DATA FONT HITAM */
    if (lastR > 1) {
      sheet.getRange(2, 1, lastR - 1, lastC).setFontColor("#000000");
    }

    /* HAPUS ZEBRA BANDING LAMA */
    try {
      var bd = sheet.getBandings();
      for (var b = 0; b < bd.length; b++) bd[b].remove();
    } catch (e) {}

    /* ZEBRA ROW */
    if (lastR > 1) {
      sheet.getRange(2, 1, lastR - 1, lastC)
           .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY);
    }

    /* BORDER */
    full.setBorder(true,true,true,true,true,true,"white",SpreadsheetApp.BorderStyle.SOLID);

    /* >>> NO AUTO-RESIZE (permintaan Anda) <<< */

    /* FILTER */
    try {
      if (!sheet.getFilter()) {
        sheet.getRange(1,1,lastR,lastC).createFilter();
      }
    } catch (e) {}

    this.highlightED(sheet);
  },


  /* =====================================================================
     HIGHLIGHT ED < 30 hari merah, < 90 hari kuning
  ====================================================================== */
  highlightED: function(sheet) {

    var lastR = sheet.getLastRow();
    var lastC = sheet.getLastColumn();
    if (lastR <= 1) return;

    var rng = sheet.getRange(2, 8, lastR - 1, 1); // ED
    var vals = rng.getValues();

    var today = new Date();
    var bg = [];

    for (var i = 0; i < vals.length; i++) {

      var ed = String(vals[i][0] || "").trim();
      var color = null;

      // format MM-YYYY atau MM/YYYY
      var m = ed.match(/^(\d{2})[-\/](\d{4})$/);

      if (m) {
        var mm = Number(m[1]);
        var yy = Number(m[2]);

        var edDate = new Date(yy, mm, 0);
        var diff = (edDate - today) / (1000 * 3600 * 24);

        if (diff < 30) color = "#7a0000";     // merah
        else if (diff < 90) color = "#6f5e00"; // kuning
      }

      var row = [];
      for (var c = 0; c < lastC; c++) row.push(color);
      bg.push(row);
    }

    /* APPLY COLOR */
    var rangeAll = sheet.getRange(2, 1, lastR - 1, lastC);
    var existing = rangeAll.getBackgrounds();

    for (var r = 0; r < bg.length; r++) {
      for (var c = 0; c < lastC; c++) {
        if (bg[r][c] !== null) {
          existing[r][c] = bg[r][c];
        }
      }
    }

    rangeAll.setBackgrounds(existing);
  }
};


/* WRAPPER */
function generateOutput() {
  OutputService.generate();
}
