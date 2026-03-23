/* =====================================================================
   PASIEN SERVICE — Load + Validasi + Event Baris 2
===================================================================== */

var PasienService = {

  load: function () {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName("PASIEN");

    if (!sh) {
      Toast.auto(34);
      return this.empty();
    }

    var row = sh.getActiveCell().getRow();

    if (row <= 1) {
      Toast.auto(34);
      return this.empty(row);
    }

    // Ambil data inti pasien
    var tanggalRaw = sh.getRange(row, 2).getValue();
    var norm       = sh.getRange(row, 9).getValue();
    var nama       = sh.getRange(row, 10).getValue();
    var dokter     = sh.getRange(row, 17).getValue();

    // Cegah popup ketika baris kosong
    if (!nama && !norm) {
      return this.empty(row);
    }

    if (nama && norm) {
      Toast.auto(7, { nama: nama, norm: norm });
    }

    var tanggal = this.formatTanggal(tanggalRaw, ss);

    /* --------------------------------------------------------------
       MASTER BARANG (BARIS DIMULAI DARI 26)
    -------------------------------------------------------------- */
    var shMaster = ss.getSheetByName("MASTER");
    var lastRow = shMaster.getLastRow();

    var startRow = 26;
    var total = lastRow - startRow + 1;

    var barang = [];

    if (total > 0) {
      var range = shMaster.getRange(startRow, 2, total, 1).getValues(); // kolom B
      range.forEach(function (r) {
        var cell = r[0];
        if (cell) barang.push(String(cell).trim());
      });
    }

    return {
      row: row,
      tanggal: tanggal,
      norm: norm,
      nama: nama,
      dokter: dokter,
      barang: barang
    };
  },

  /* --------------------------------------------------------------
     Format tanggal aman
  -------------------------------------------------------------- */
  formatTanggal: function (raw, ss) {
    return (raw instanceof Date)
      ? Utilities.formatDate(raw, ss.getSpreadsheetTimeZone(), "dd-MM-yyyy")
      : raw || "";
  },

  /* --------------------------------------------------------------
     Return struktur kosong
  -------------------------------------------------------------- */
  empty: function (row) {
    return { 
      row: row || 0,
      tanggal: "",
      norm: "",
      nama: "",
      dokter: "",
      barang: []
    };
  },

  /* --------------------------------------------------------------
     Event baris ke-2
  -------------------------------------------------------------- */
  handleRow2Edit: function (e) {
    var sh = e.source.getActiveSheet();
    if (sh.getName() !== "PASIEN") return;

    var row = e.range.getRow();
    if (row !== 2) return;

    var tanggal = sh.getRange(2, 2).getValue();
    var norm    = sh.getRange(2, 9).getValue();
    var nama    = sh.getRange(2, 10).getValue();
    var dokter  = sh.getRange(2, 17).getValue();

    if (!tanggal && !norm && !nama && !dokter)
      return Toast.auto(5);

    if (!tanggal || !norm || !nama || !dokter)
      return Toast.auto(6);

    Toast.auto(7, { nama: nama, norm: norm });

    // Auto trigger Output refresh
    OutputService.generate();
  }
};
