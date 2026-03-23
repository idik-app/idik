function syncToSupabase() {
  const cfg = getConfig();
  const ss = SpreadsheetApp.getActive();
  const queue = ss.getSheetByName("SYNC_QUEUE");

  if (!queue) {
    Logger.log("Sheet SYNC_QUEUE tidak ditemukan.");
    return;
  }

  const last = queue.getLastRow();
  if (last < 2) return;

  const rowData = queue.getRange(2, 1, 1, 3).getValues()[0];
  const noRm = rowData[1];
  const payloadString = rowData[2];

  let payload = null;

  try {
    payload = JSON.parse(payloadString);
  } catch (err) {
    logSync("JSON rusak, baris dihapus", noRm, err);
    queue.deleteRow(2);
    return;
  }

  const endpoint =
    `${cfg.url}/rest/v1/${cfg.table}` +
    `?no_rm=eq.${encodeURIComponent(payload.no_rm)}&tanggal=eq.${encodeURIComponent(payload.tanggal)}`;

  const options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "apikey": cfg.key,
      "Authorization": "Bearer " + cfg.key,
      "Prefer": "resolution=merge-duplicates"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  let success = false;
  let responseText = "";

  for (let i = 1; i <= 3; i++) {
    try {
      const res = UrlFetchApp.fetch(endpoint, options);
      const status = res.getResponseCode();
      responseText = res.getContentText();
      if (status === 200 || status === 201) {
        success = true;
        break;
      }
    } catch (err) {
      responseText = err.toString();
    }
    Utilities.sleep(800);
  }

  if (success) {
    logSync("SUKSES", noRm, responseText);
    queue.deleteRow(2);
  } else {
    logSync("GAGAL (akan dicoba lagi)", noRm, responseText);
  }
}
