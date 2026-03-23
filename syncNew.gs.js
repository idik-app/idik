function syncNew() {
  const cfg = getConfig();
  const ss = SpreadsheetApp.getActive();
  const queue = ss.getSheetByName("SYNC_QUEUE");
  if (!queue) return;

  const last = queue.getLastRow();
  if (last < 2) return;

  const rowData = queue.getRange(2, 1, 1, 3).getValues()[0];
  const noRm = rowData[1];
  const payloadString = rowData[2];

  let payload = null;
  try {
    payload = JSON.parse(payloadString);
  } catch (err) {
    logSync("JSON rusak, dihapus", noRm, err);
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

  try {
    const res = UrlFetchApp.fetch(endpoint, options);
    logSync("SUKSES_SYNCNEW", noRm, res.getContentText());
  } catch (err) {
    logSync("GAGAL_SYNCNEW", noRm, err);
  }
}
