/* MigrationService — v2 (AM only, fixed)
   - Parsing + reclean result from ParserService
   - Menulis ulang AM selalu dalam format standar bersih
   - Tidak ada JSON dan tidak ada backup
*/

function migrateAM() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("PASIEN");
  if (!sh) {
    SpreadsheetApp.getUi().alert("Sheet 'PASIEN' tidak ditemukan.");
    return;
  }

  var last = sh.getLastRow();
  if (last < 2) {
    SpreadsheetApp.getUi().alert("Tidak ada data untuk dimigrasi.");
    return;
  }

  var colAM = 39;
  var values = sh.getRange(2, colAM, last - 1, 1).getValues();

  var outAM = [];
  var changed = 0;

  for (var i = 0; i < values.length; i++) {

    var raw = values[i][0];

    if (!raw) {
      outAM.push([""]);
      continue;
    }

    // PARSING 
    var parsed = null;
    try {
      parsed = ParserService.parseAM(raw);
    } catch (e) {
      parsed = null;
    }

    if (!parsed) {
      // Tidak bisa parse, biarkan seperti aslinya
      outAM.push([String(raw)]);
      continue;
    }

    // BANGUN TEKS STANDAR
    var standard = ParserService.buildStandardText(parsed).trim();

    // Jika beda → rewrite
    if (String(raw).trim() !== standard) {
      outAM.push([standard]);
      changed++;
    } else {
      outAM.push([raw]);
    }
  }

  // TULIS KEMBALI AM
  sh.getRange(2, colAM, outAM.length, 1).setValues(outAM);

  SpreadsheetApp.getUi().alert(
    "Migrasi selesai.\n" +
    "Total baris: " + values.length + "\n" +
    "Baris diperbarui: " + changed + "\n" +
    "(AM Only — Format Standar Bersih)"
  );
}
