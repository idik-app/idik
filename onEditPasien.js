function onEditPasien(e) {
  try {
    const sh = e.source.getActiveSheet();
    const sheetName = sh.getName();

    // Hanya jalan di sheet PASIEN
    if (sheetName !== "PASIEN") return;

    const row = e.range.getRow();
    const col = e.range.getColumn();

    // Jangan proses header & kolom alat (26–29)
    if (row === 1 || col >= 26 && col <= 29) return;

    // Ambil data 1 baris lengkap (A sampai AM)
    const rowData = sh.getRange(row, 1, 1, 39).getValues()[0];

    // Buat payload (mengikuti mapping final 100%)
    const payload = {
      tanggal: rowData[1],          // B / 2
      waktu: rowData[2],            // C / 3
      fluro_time: rowData[3],       // D / 4
      dose_mgym2: rowData[4],       // E / 5
      kv: rowData[5],               // F / 6
      ma: rowData[6],               // G / 7
      status_duplikat: rowData[7],  // H / 8
      no_rm: rowData[8],            // I / 9
      nama_pasien: rowData[9],      // J / 10
      tgl_lahir: rowData[10],       // K / 11
      umur: rowData[11],            // L / 12
      alamat: rowData[12],          // M / 13
      no_telp: rowData[13],         // N / 14
      ruangan: rowData[14],         // O / 15
      cath: rowData[15],            // P / 16
      dokter: rowData[16],          // Q / 17
      tindakan: rowData[17],        // R / 18
      kategori: rowData[18],        // S / 19
      hasil_lab_ppm: rowData[19],   // T / 20
      diagnosa: rowData[20],        // U / 21
      severity_level: rowData[21],  // V / 22
      asisten: rowData[22],         // W / 23
      sirkuler: rowData[23],        // X / 24
      logger: rowData[24],          // Y / 25

      pembiayaan: rowData[29],      // AD / 30
      kelas: rowData[30],           // AE / 31
      lama_perawatan: rowData[31],  // AF / 32
      level: rowData[32],           // AG / 33
      perolehan_bpjs: rowData[33],  // AH / 34
      tarif_tindakan: rowData[34],  // AI / 35
      consumable: rowData[35],      // AJ / 36
      total_krs: rowData[36],       // AK / 37
      selisih: rowData[37],         // AL / 38
      resume_pemakaian: rowData[38],// AM / 39

      updated_at: new Date().toISOString()
    };

    // Masukkan payload ke SYNC_QUEUE
    const ss = e.source;
    const queue = ss.getSheetByName("SYNC_QUEUE");
    if (!queue) return;

    queue.appendRow([
      new Date(),        // timestamp
      rowData[8],        // no_rm
      JSON.stringify(payload) // payload JSON
    ]);

  } catch (err) {
    Logger.log("Error onEditPasien: " + err);
  }
}
