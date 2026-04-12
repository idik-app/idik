/**
 * Google Apps Script: Google Drive Indexer & Autosync for Patient Reports
 * -----------------------------------------------------------
 * Script ini digunakan untuk:
 * 1. (Manual) Membuat CSV seluruh file laporan (indexDriveFiles).
 * 2. (Auto) Mengirim file baru ke Aplikasi IDIK setiap hari (pushRecentFilesToApp).
 * 
 * Cara Penggunaan:
 * 1. Ganti ROOT_FOLDER_ID dengan ID folder Anda.
 * 2. Ganti APP_URL dengan URL aplikasi Anda (contoh: https://idik-lemon.vercel.app).
 * 3. Jalankan 'pushRecentFilesToApp' secara manual untuk tes.
 * 4. Pasang 'Triggers' (ikon jam di kiri) agar fungsi 'pushRecentFilesToApp' berjalan setiap 1 jam atau setiap hari.
 */

const ROOT_FOLDER_ID = '0B5_7Y7j25qAEX2x2Y3pOOERFNHM'; 
const APP_URL = 'https://idik-lemon.vercel.app'; 
const SYNC_TOKEN = 'idik-sync-secret-2026'; // Harus sama dengan INTERNAL_SYNC_TOKEN di .env.local aplikasi

/**
 * [MANUAL] Fungsi untuk membuat manifest CSV (untuk pemetaan massal pertama kali)
 */
function indexDriveFiles() {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const rows = [['FileName', 'FileID', 'URL', 'LastModified', 'ParentFolder', 'Year', 'NoRM_Extracted']];
  
  const years = rootFolder.getFolders();
  while (years.hasNext()) {
    const yearFolder = years.next();
    const yearName = yearFolder.getName();
    if (!/^\d{4}$/.test(yearName)) continue;
    processFolder(yearFolder, yearName, rows);
  }
  
  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  DriveApp.createFile('google_drive_manifest.csv', csvContent, MimeType.CSV);
  Logger.log('Manifest CSV dibuat!');
}

function processFolder(folder, year, rows) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    const rmMatch = fileName.match(/\d{6,8}/);
    const noRm = rmMatch ? rmMatch[0] : '';
    rows.push([fileName, file.getId(), file.getUrl(), file.getLastUpdated().toISOString(), folder.getName(), year, noRm]);
  }
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    processFolder(subFolders.next(), year, rows);
  }
}

/**
 * [AUTO] Fungsi Autosinkron: Kirim file yang baru ditambahkan/diedit ke Aplikasi.
 */
function pushRecentFilesToApp() {
  const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const now = new Date();
  // Cek file dalam 2 hari terakhir agar aman jika trigger terlewat
  const thresholdDate = new Date(now.getTime() - (48 * 60 * 60 * 1000));
  
  const years = rootFolder.getFolders();
  while (years.hasNext()) {
    const yearFolder = years.next();
    const yearName = yearFolder.getName();
    if (!/^\d{4}$/.test(yearName)) continue;
    processFolderForSync(yearFolder, yearName, thresholdDate);
  }
}

function processFolderForSync(folder, year, sinceDate) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getLastUpdated() > sinceDate) {
      syncSingleFile(file, year);
    }
  }
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    processFolderForSync(subFolders.next(), year, sinceDate);
  }
}

function syncSingleFile(file, year) {
  const fileName = file.getName();
  const rmMatch = fileName.match(/\d{6,8}/);
  const noRm = rmMatch ? rmMatch[0] : '';
  
  let content = '';
  try {
    if (file.getMimeType() === MimeType.GOOGLE_DOCS) {
      content = DocumentApp.openById(file.getId()).getBody().getText();
    }
  } catch (e) {
    Logger.log('Warning: Could not extract text from ' + fileName + ': ' + e.message);
  }

  const payload = {
    fileName: fileName,
    url: file.getUrl(),
    year: year,
    noRm: noRm,
    content: content
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-sync-token': SYNC_TOKEN },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(APP_URL + '/api/system/sync-report-link', options);
    Logger.log('Syncing: ' + fileName + ' | Response: ' + response.getContentText());
  } catch (e) {
    Logger.log('Error Syncing ' + fileName + ': ' + e.message);
  }
}
