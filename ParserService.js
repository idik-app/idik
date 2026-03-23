/* ParserService v11 — FINAL
   Mendukung format baru & lama
   Output: 
      { tanggal, norm, nama, dokter, alkes: [{barang, ukuran, lot, ed}] }
   ES5 compatible.
*/

var ParserService = (function () {

  /* ============================================================
     PUBLIC API
  ============================================================ */

  function parseAM(text) {
    if (!text) return null;

    text = normalize(text);

    // Jika ada format baru (emoji modern / Pemakaian Alkes)
    if (containsKeyword(text, "pemakaian alkes") || 
        containsAny(text, ["📅", "🆔", "🩺"])) {
      return parseGeneric(text);
    }

    // Jika ada format lama (Pemakaian: / 📄 / 🧑‍⚕️)
    if (containsKeyword(text, "pemakaian") || 
        containsAny(text, ["📄", "🧑"])) {

      text = normalizeOldToGeneric(text);
      return parseGeneric(text);
    }

    // fallback
    return parseGeneric(text);
  }


  function buildStandardText(obj) {
    if (!obj) return "";

    var out = [];
    out.push("Tanggal: " + (obj.tanggal || ""));
    out.push("NoRM: " + (obj.norm || ""));
    out.push("Nama: " + (obj.nama || ""));
    out.push("Dokter: " + (obj.dokter || ""));
    out.push("");
    out.push("Pemakaian Alkes:");

    if (obj.alkes && obj.alkes.length) {
      for (var i = 0; i < obj.alkes.length; i++) {
        var it = obj.alkes[i];
        out.push((i + 1) + ". " + (it.barang || ""));
        out.push("   LOT    : " + (it.lot || ""));
        out.push("   Ukuran : " + (it.ukuran || ""));
        out.push("   ED     : " + (it.ed || ""));
        out.push("");
      }
    }

    return out.join("\n");
  }


  function buildJSON(obj) {
    try { return JSON.stringify(obj); }
    catch(e) { return ""; }
  }


  /* ============================================================
     INTERNAL HELPERS
  ============================================================ */

  function normalize(t) {
    t = String(t);
    t = t.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    t = t.replace(/\t/g, " ");
    t = t.replace(/ +/g, " ");
    
    var lines = t.split("\n");
    for (var i=0;i<lines.length;i++){
      lines[i] = String(lines[i]).trim();
    }
    return lines.join("\n").trim();
  }


  function containsKeyword(text, kw) {
    return String(text).toLowerCase().indexOf(String(kw).toLowerCase()) !== -1;
  }

  function containsAny(text, arr) {
    for (var i=0; i < arr.length; i++) {
      if (String(text).indexOf(arr[i]) !== -1) return true;
    }
    return false;
  }



  function normalizeOldToGeneric(text) {

    var lines = text.split("\n");
    var out = [];

    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];

      // Tanggal (📅)
      if (L.indexOf("📅") === 0) {
        var clean = L.replace("📅", "").trim();
        out.push("Tanggal: " + clean);
        continue;
      }

      // NoRM (📄)
      if (L.indexOf("📄") === 0) {
        var rm = L.replace("📄", "").trim();
        out.push("NoRM: " + rm);
        continue;
      }

      // Nama (👤)
      if (L.indexOf("👤") === 0) {
        var nm = L.replace("👤", "").trim();
        out.push("Nama: " + nm);
        continue;
      }

      // Dokter (🧑‍⚕️)
      if (L.indexOf("🧑") === 0) {
        var dr = L.replace("🧑‍⚕️", "").replace("🧑", "").trim();
        out.push("Dokter: " + dr);
        continue;
      }

      // Pemakaian:
      if (String(L).toLowerCase().indexOf("pemakaian:") === 0) {
        out.push("Pemakaian Alkes:");
        continue;
      }

      out.push(L);
    }

    return out.join("\n");
  }



  function parseGeneric(text) {

    var obj = {
      tanggal: "",
      norm: "",
      nama: "",
      dokter: "",
      alkes: []
    };

    var lines = text.split("\n");

    /* ------------------------------------------
       HEADER EXTRACTION
    ------------------------------------------- */

    for (var i=0; i < lines.length; i++) {
      var raw = lines[i];
      var low = String(raw).toLowerCase();

      // Tanggal
      if (!obj.tanggal) {
        if (low.indexOf("tanggal:") === 0) {
          obj.tanggal = raw.split(":").slice(1).join(":").trim();
          continue;
        }
        if (raw.indexOf("📅") === 0) {
          obj.tanggal = raw.replace("📅", "").replace(/[:\s]+/, "").trim();
          continue;
        }
      }

      // NoRM
      if (!obj.norm) {
        if (low.indexOf("norm") === 0 || low.indexOf("no rm") === 0) {
          obj.norm = raw.split(":").slice(1).join(":").trim();
          continue;
        }
        if (raw.indexOf("🆔") === 0 || raw.indexOf("📄") === 0) {
          obj.norm = raw.replace(/[🆔📄]/g, "").trim();
          continue;
        }
      }

      // Nama
      if (!obj.nama) {
        if (low.indexOf("nama:") === 0) {
          obj.nama = raw.split(":").slice(1).join(":").trim();
          continue;
        }
        if (raw.indexOf("👤") === 0) {
          obj.nama = raw.replace("👤", "").trim();
          continue;
        }
      }

      // Dokter
      if (!obj.dokter) {
        if (low.indexOf("dokter:") === 0) {
          obj.dokter = raw.split(":").slice(1).join(":").trim();
          continue;
        }
        if (raw.indexOf("🩺") === 0 || raw.indexOf("🧑") === 0) {
          var d = raw.replace(/[🧑‍⚕️🩺]/g, "").trim();
          obj.dokter = d;
          continue;
        }
      }
    }


    /* ------------------------------------------
       A L K E S   B L O C K
    ------------------------------------------- */

    var start = -1;
    for (var j=0; j < lines.length; j++){
      var L2 = String(lines[j]).toLowerCase();
      if (L2.indexOf("pemakaian alkes") !== -1 ||
          L2.indexOf("pemakaian") !== -1) {
        start = j;
        break;
      }
    }

    if (start === -1) return obj;

    var blk = lines.slice(start + 1).join("\n");
    var parts = blk.split(/\n\s*\d+[\.\)]\s*/);

    for (var k=0; k < parts.length; k++) {

      var itemText = String(parts[k]).trim();
      if (!itemText) continue;

      var ilines = itemText.split("\n");
      var il = [];
      for (var m=0; m < ilines.length; m++) {
        var s = String(ilines[m]).trim();
        if (s) il.push(s);
      }

      if (il.length === 0) continue;

      var item = { barang: "", ukuran: "", lot: "", ed: "" };
      item.barang = il[0].replace(/^[\d\.\)\s]+/, "").trim();

      for (var x=1; x < il.length; x++) {
        var row = il[x];
        var low2 = row.toLowerCase();

        if (low2.indexOf("lot") !== -1) {
          item.lot = afterColon(row);
          continue;
        }
        if (low2.indexOf("ukuran") !== -1 || low2.indexOf("size") !== -1) {
          item.ukuran = afterColon(row);
          continue;
        }
        if (low2.indexOf("ed") !== -1 || low2.indexOf("exp") !== -1) {
          item.ed = afterColon(row);
          continue;
        }
      }

      obj.alkes.push(item);
    }

    return obj;
  }



  function afterColon(s) {
    if (s.indexOf(":") !== -1) {
      return s.split(":").slice(1).join(":").trim();
    }
    return s.trim();
  }


  /* ============================================================
     RETURN PUBLIC API
  ============================================================ */

  return {
    parseAM: parseAM,
    buildStandardText: buildStandardText,
    buildJSON: buildJSON
  };

})();
