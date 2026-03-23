/**
 * Copy konsisten nuansa JARVIS — asisten yang melaporkan status.
 * Dipakai untuk notifikasi, loading, empty state, dan HUD.
 */

export const JARVIS = {
  /** Notifikasi sukses */
  success: {
    saved: "Data telah disimpan. Semua sistem sinkron.",
    added: "Entri baru tercatat. Database diperbarui.",
    updated: "Perubahan diterapkan. Status terkini.",
    deleted: "Data dihapus. Log diperbarui.",
  },

  /** Notifikasi error / peringatan */
  error: {
    saveFailed: "Gagal menyimpan. Periksa koneksi atau data.",
    loadFailed: "Gagal memuat data. Coba refresh atau periksa koneksi.",
    deleteFailed: "Gagal menghapus. Operasi dibatalkan.",
    connectionLost: "Koneksi terputus. JARVIS akan mencoba menyambung ulang.",
  },

  /** Status koneksi (untuk HUD / status panel) */
  connection: {
    connected: "Tersambung",
    disconnected: "Terputus",
    idle: "Menunggu",
    reconnecting: "Menyambung ulang…",
  },

  /** Loading / in progress */
  loading: {
    generic: "Memproses…",
    loadingData: "Memuat data…",
    saving: "Menyimpan…",
    syncing: "Sinkronisasi…",
  },

  /** Empty state */
  empty: {
    noData: "Belum ada data. Tambah entri untuk memulai.",
    noResults: "Tidak ada hasil untuk filter ini.",
    noEvents: "Belum ada event.",
  },

  /** HUD / Kernel */
  hud: {
    kernelTitle: "Autonomous Kernel",
    realtimeEvents: "Realtime Events",
    integrity: "Integrity",
    stable: "Stable",
    recoveryMode: "Recovery Mode",
    logEmpty: "Belum ada event",
    clearLog: "Hapus log",
  },
} as const;
