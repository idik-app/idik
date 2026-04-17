/**
 * Standar layer (z-index) UI global.
 * Gunakan token ini agar tidak hardcode angka di banyak komponen.
 */
export const UI_LAYERS = {
  /** Elemen dasar di bawah konten utama */
  base: "z-[1]",
  /** Sidebar dan navigasi utama */
  sidebar: "z-[100]",
  /** Baris aksi toolbar (tombol + submenu) harus di atas baris filter di bawahnya */
  toolbarActionsRow: "z-[70]",
  /** Baris filter di bawah aksi toolbar */
  toolbarFilterRow: "z-[65]",
  /** Head-up display / status bar kecil (misal: toolbar tabel) */
  hud: "z-[72]",
  /** Sticky table header */
  tableHeader: "z-[60]",
  /** Zoomed table cell (focus-within) */
  tableZoomedCell: "z-[80]",
  /** Hovered label inside table cell */
  tableHoveredLabel: "z-[45]",
  /** Backdrop untuk detail drawer */
  detailBackdrop: "z-[45]",
  /** Overlay standar (modal backdrop) */
  overlay: "z-[110]",
  /** Modal standar */
  modal: "z-[120]",
  /** Modal dengan prioritas lebih tinggi */
  modalHigh: "z-[125]",
  /** Modal paling atas */
  modalTop: "z-[130]",
  /** Floating Action Button (FAB) */
  fab: "z-[90]",
  /** Form modal khusus (mis. DokterModalForm) */
  modalForm: "z-[140]",
  /** Konten di dalam modal form */
  modalFormContent: "z-[150]",
  /** Dialog konfirmasi sistem */
  confirmDialog: "z-[200]",
  /** Manager modal global */
  modalManager: "z-[220]",
  /** Kartu melayang (popover/tooltip besar) */
  floatingCard: "z-[85]",
  /** Topbar aplikasi */
  topbar: "z-[350]",
  /** Panel pengaturan (HoloSettings) */
  settingsPanel: "z-[500]",
  /** Dialog konfirmasi tingkat tinggi */
  confirmDialogHigh: "z-[600]",
  /** Popover standar */
  popover: "z-[85]",
  /** Portal untuk drawer */
  drawerPortal: "z-[5000]",
  /** Picker melayang (date/time) */
  pickerFloating: "z-[5010]",
  /** Picker melayang paling atas */
  pickerFloatingTop: "z-[10050]",
  /** Overlay dialog paling atas */
  dialogOverlayTop: "z-[100000]",
  /** Konten dialog paling atas */
  dialogContentTop: "z-[100001]",
  /** Overlay layar penuh */
  fullscreenOverlay: "z-[999]",
  /** Elemen layar penuh (intro/loader) */
  fullscreen: "z-[9999]",
  /** Jarvis Assistant Agent */
  jarvisAgent: "z-[100100]",
} as const;
