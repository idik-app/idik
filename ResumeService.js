/* =====================================================================
   RESUME SERVICE — CLEAN + WA VERSION (FINAL v6.0)
   - Sinkron standar "barang" (bukan namaBarang)
   - Highlight hijau pastel setelah sukses
   - Auto refresh OUTPUT
===================================================================== */

var ResumeService = {

  save: function (row, p, alkes) {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName("PASIEN");

    try {

      /* --------------------------------------------------------
         Normalisasi Dokter (otomatis tambah "dr." bila belum ada)
      --------------------------------------------------------- */
      var dokter = p.dokter || "";
      if (dokter && dokter.toLowerCase().substring(0, 3) !== "dr.") {
        dokter = "dr. " + dokter.replace(/^dr\s*/i, "");
      }
      p.dokter = dokter;


      /* --------------------------------------------------------
         Normalisasi ALKES → wajib pakai "barang"
      --------------------------------------------------------- */
      var alkesClean = alkes.map(function(it){
        return {
          barang: it.barang || it.namaBarang || "",
          lot: it.lot || "",
          ukuran: it.ukuran || "",
          ed: it.ed || ""
        };
      });


      /* --------------------------------------------------------
         Build CLEAN text untuk Sheet AM (kolom 39)
      --------------------------------------------------------- */
      var resume = this.buildClean(p, alkesClean).trim();
      sh.getRange(row, 39).setValue(resume);


      /* --------------------------------------------------------
         Highlight sukses (hijau pastel) seperti versi lama
      --------------------------------------------------------- */
      this.markSavedSoft(row);


      /* --------------------------------------------------------
         Auto update OUTPUT agar selalu sinkron
      --------------------------------------------------------- */
      try {
        OutputService.generate();
      } catch (e) {
        Logger.log("OutputService error (ignored): " + e);
      }


      Toast.auto(22, { nama: p.nama, norm: p.norm });
      return "OK";

    } catch (err) {

      /* -------------------------------
         Jika error → backup FORM_BUFFER
      -------------------------------- */
      this.fallback(p, alkes);

      Toast.auto(25);
      return "ERR";
    }
  },

  /* ====================================================================
     CLEAN VERSION → untuk Sheet (tanpa emoji)
  ===================================================================== */
  buildClean: function (p, alkes) {

    var t =
      "Tanggal: " + (p.tanggal || "") + "\n" +
      "NoRM: "    + (p.norm || "")    + "\n" +
      "Nama: "    + (p.nama || "")    + "\n" +
      "Dokter: "  + (p.dokter || "")  + "\n\n" +
      "Pemakaian Alkes:\n";

    alkes.forEach(function(it, i){
      t += (i+1) + ". " + (it.barang || "") + "\n";
      t += "   LOT: "    + (it.lot || "")    + "\n";
      t += "   Ukuran: " + (it.ukuran || "") + "\n";
      t += "   ED: "     + (it.ed || "")     + "\n\n";
    });

    return t.trim();
  },

  /* ====================================================================
     WA VERSION → emoji aman (untuk output clipboard)
  ===================================================================== */
  buildWA: function (p, alkes) {
    var t =
      "📅 " + (p.tanggal || "") + "\n" +
      "🆔 " + (p.norm || "")    + "\n" +
      "👤 " + (p.nama || "")    + "\n" +
      "🩺 " + (p.dokter || "")  + "\n\n" +
      "🧰 Pemakaian Alkes:\n";

    alkes.forEach(function(it, i){
      t += "• " + (it.barang || "") + "\n";
      t += "   🔢 LOT: "    + (it.lot || "")    + "\n";
      t += "   📏 Ukuran: " + (it.ukuran || "") + "\n";
      t += "   ⏳ ED: "     + (it.ed || "")     + "\n\n";
    });

    return t.trim();
  },

  /* ====================================================================
     HIGHLIGHT BARIS SUKSES — Hijau Pastel Lembut (A–AM)
  ===================================================================== */
  markSavedSoft: function (row) {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName("PASIEN");

    var color = "#ccffcc"; // hijau pastel (persis screenshot)
    var rng = sh.getRange(row, 1, 1, 39); // highlight hanya sampai AM (1–39)

    rng
      .setBackground(color)
      .setFontColor("#000000");
  },

  /* ====================================================================
     FALLBACK ke FORM_BUFFER jika error
  ===================================================================== */
  fallback: function (p, alkes) {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName("FORM_BUFFER");

    if (!sh) {
      sh = ss.insertSheet("FORM_BUFFER");
      sh.appendRow(["Timestamp","NoRM","Nama","Dokter","DataAlkes"]);
    }

    sh.appendRow([
      Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "dd-MM-yyyy HH:mm:ss"),
      p.norm,
      p.nama,
      p.dokter,
      JSON.stringify(alkes)
    ]);
  }

};
