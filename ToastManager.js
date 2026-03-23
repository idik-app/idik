/* =====================================================================
   TOAST MANAGER – AUTO PRO (Color-coded)
   Dengan mapping otomatis berdasarkan level toast.
===================================================================== */

var Toast = {

  /* ==========================================================
     Ikon warna
  ========================================================== */
  color: {
    success: "🟢",
    warning: "🟡",
    error:   "🔴",
    info:    "🔵"
  },

  /* ==========================================================
     Mapping level otomatis
     success = 22, 26, 20, 43, 45, ...
     warning = 5, 6, 12, 13, 15, 16, 27, ...
     error   = 14, 17, 18, 25, ...
     info    = semua yang tidak masuk kategori lain
  ========================================================== */
  levelMap: {
    success: [22, 23, 20, 26, 29, 30, 43, 45],
    warning: [5, 6, 11, 12, 13, 15, 16, 27, 31, 32, 35, 36, 37],
    error:   [14, 17, 18, 25, 34, 38, 41, 48],
    info:    [1, 2, 3, 4, 7, 8, 21, 24, 28, 33, 39, 40, 42, 44, 46, 47]
  },

  /* ==========================================================
     Daftar pesan 48 toast ( sama seperti sebelumnya )
  ========================================================== */
  list: {
    1: { title: "Sistem Cathlab", text: "Sistem Cathlab aktif — siap digunakan." },
    2: { title: "Sheet Aktif", text: "Sheet PASIEN aktif — pilih baris data untuk mulai." },
    3: { title: "Data Diperbarui", text: "Data berhasil diperbarui dari sumber terbaru." },
    4: { title: "Mode Pemakaian", text: "Mode Pemakaian Alkes aktif." },

    5: { title: "Data Kosong", text: "Baris 2 masih kosong. Isi Tanggal / No.RM / Nama / Dokter." },
    6: { title: "Data Belum Lengkap", text: "Data pasien di baris 2 belum lengkap." },
    7: { title: "Pasien Siap", text: "Pasien {{nama}} ({{norm}}) siap dicatat pemakaian alkes." },
    8: { title: "Data Pasien Diperbarui", text: "Perubahan data terdeteksi pada baris 2." },
    9: { title: "Format Tanggal Salah", text: "Format tanggal tidak valid (gunakan dd-mm-yyyy)." },
    10:{ title: "Format Dokter", text: "Format dokter diperbaiki: dr. {{nama}}." },

    11:{ title: "Alkes Kosong", text: "Tidak ada alkes yang dipilih." },
    12:{ title: "Alkes Belum Lengkap", text: "Data alkes belum lengkap (LOT/Ukuran/ED)." },
    13:{ title: "ED Hampir Habis", text: "ED item tinggal {{hari}} hari lagi." },
    14:{ title: "ED Kadaluarsa", text: "ED item sudah melewati tanggal berlaku." },
    15:{ title: "Stok Minimum", text: "Stok {{barang}} mencapai batas minimum." },
    16:{ title: "Stok Hampir Habis", text: "Stok {{barang}} tersisa {{jumlah}} pcs." },
    17:{ title: "LOT Tidak Cocok", text: "LOT tidak cocok dengan MASTER." },
    18:{ title: "Ukuran Tidak Cocok", text: "Ukuran tidak sesuai standar tindakan." },
    19:{ title: "Cek Reuse", text: "Item reuse perlu pemeriksaan sebelum dipakai." },
    20:{ title: "Reuse Siap", text: "Alkes reuse siap digunakan." },

    21:{ title: "Form Pemakaian", text: "Form Pemakaian siap digunakan." },
    22:{ title: "Resume Tersimpan", text: "Pemakaian alkes tersimpan untuk {{nama}} ({{norm}})." },
    23:{ title: "Pemakaian Diperbarui", text: "Data pemakaian diperbarui." },
    24:{ title: "Pemakaian Dihapus", text: "Satu data pemakaian dihapus." },
    25:{ title: "Fallback Aktif", text: "Data disimpan ke FORM_BUFFER." },

    26:{ title: "OUTPUT Diperbarui", text: "OUTPUT diperbarui berdasarkan resume AM." },
    27:{ title: "OUTPUT Kosong", text: "Tidak ada resume pemakaian yang dapat diproses." },
    28:{ title: "Rekap Harian", text: "Rekap selesai: {{tindakan}} tindakan, {{pasien}} pasien." },
    29:{ title: "Grafik Diperbarui", text: "Grafik pemakaian diperbarui." },
    30:{ title: "Rekap Bulanan", text: "Rekap bulan ini telah dibuat." },

    31:{ title: "Perubahan Terakhir", text: "Perubahan terakhir: baris {{row}}, kolom {{kolom}}." },
    32:{ title: "Data Dihapus", text: "Satu baris data telah dihapus." },
    33:{ title: "Edit User Lain", text: "Perubahan dilakukan oleh user lain." },
    34:{ title: "Baris Tidak Valid", text: "Baris ini tidak memiliki data pasien yang valid." },

    35:{ title: "No.RM Tidak Valid", text: "No.RM minimal 6 digit." },
    36:{ title: "Nama Wajib", text: "Nama pasien tidak boleh dikosongkan." },
    37:{ title: "Dokter Wajib", text: "Kolom Dokter harus diisi." },
    38:{ title: "Pasien Duplikat", text: "Data pasien tercatat lebih dari sekali." },

    39:{ title: "Mode CITO", text: "Mode CITO aktif — prioritas emergensi." },
    40:{ title: "Tindakan Selesai", text: "Tindakan selesai — input pemakaian segera." },
    41:{ title: "Form Timeout", text: "Form tidak digunakan 5 menit — ditutup otomatis." },
    42:{ title: "Kebutuhan Anestesi", text: "Tindakan menunjukkan kebutuhan anestesi tambahan." },

    43:{ title: "Efisiensi Naik", text: "Waktu input hari ini lebih cepat {{persen}}%." },
    44:{ title: "Akurasi Konsisten", text: "Dokumentasi akurat 7 hari berturut-turut." },
    45:{ title: "Level Handal", text: "Level “Dokumentator Handal” tercapai." },

    46:{ title: "Sync MASTER", text: "Inventory MASTER disinkronkan otomatis." },
    47:{ title: "Barang Baru", text: "Barang baru terdeteksi di MASTER." },
    48:{ title: "Mismatch Data", text: "Mismatch antara MASTER & PEMAKAIAN ditemukan." }
  },

  /* ==========================================================
     Replacer {{placeholder}}
  ========================================================== */
  fill: function(text, payload) {
    if (!payload) return text;
    for (var key in payload) {
      text = text.replace(new RegExp("{{" + key + "}}", "g"), payload[key]);
    }
    return text;
  },

  /* ==========================================================
     Auto detect level berdasarkan ID
  ========================================================== */
  detectLevel: function(id) {
    var self = this;

    function check(list, type) {
      return list.indexOf(id) !== -1 ? type : null;
    }

    return (
      check(self.levelMap.success, "success") ||
      check(self.levelMap.warning, "warning") ||
      check(self.levelMap.error,   "error")   ||
      "info"
    );
  },

  /* ==========================================================
     AUTO TOAST — panggil toast otomatis
     Toast.auto(22, {nama:"Budi"})
  ========================================================== */
  auto: function(id, payload) {
    var item = this.list[id];
    if (!item) return;

    var level = this.detectLevel(id);
    var prefix = this.color[level];

    SpreadsheetApp.getActive().toast(
      prefix + " " + this.fill(item.text, payload),
      item.title,
      5
    );
  }
};
