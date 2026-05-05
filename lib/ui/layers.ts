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
  /** Hovered label (mis. keterangan icon arc) — harus di atas isi sel & focus-within popover. */
  tableHoveredLabel: "z-[100]",
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
  drawerPortal: "z-[100050]",
  /** Picker melayang (date/time) */
  pickerFloating: "z-[5010]",
  /** Picker melayang paling atas */
  pickerFloatingTop: "z-[10050]",
  /** Overlay dialog paling atas */
  dialogOverlayTop: "z-[100000]",
  /** Konten dialog paling atas */
  dialogContentTop: "z-[100001]",
  /**
   * Popover/dropdown di dalam dialog yang memakai `dialogContentTop` (z-[100001]).
   * Jangan pakai z-[10002] — itu 10k, bukan 100k+.
   */
  dialogNestedPopover: "z-[100002]",
  /** Overlay layar penuh */
  fullscreenOverlay: "z-[999]",
  /** Elemen layar penuh (intro/loader) */
  fullscreen: "z-[9999]",
  /** Jarvis Assistant Agent */
  jarvisAgent: "z-[100100]",
  /**
   * Backdrop orbiter menu agen (di bawah kontrol agen agar tidak menutupi modal intensive).
   */
  jarvisAgentBackdrop: "z-[100099]",
  /**
   * Modal REGISTER ICCU — harus di atas `fullscreen` dashboard, sticky timeline (FlowSheet),
   * dan `jarvisAgent`; kelas z saja kadang kalah stacking → pakai juga Z_INDEX_VALUES di portal.
   */
  intensiveIccuModalBackdrop: "z-[100200]",
  intensiveIccuModal: "z-[100201]",
  /**
   * Popover / menu di dalam layer ICCU (filter tanggal, menu ⋯) — portal default z-50 kalah
   * dengan modal; pakai nilai di antara modal dan nested modal.
   */
  intensiveIccuModalPopover: "z-[100203]",
  /** Modal detail baris ICCU (di atas modal daftar) */
  intensiveIccuDrawerBackdrop: "z-[100210]",
  intensiveIccuDrawer: "z-[100211]",
  /** Popover kalender di dalam drawer ICCU (portal harus di atas drawer) */
  intensiveIccuDrawerPopover: "z-[100214]",
  /** Form Tambah Pasien bersarang di atas modal ICCU */
  intensiveIccuNestedModalBackdrop: "z-[100220]",
  intensiveIccuNestedModal: "z-[100221]",
  /**
   * Konfirmasi hapus / AlertDialog di atas semua layer ICCU (daftar, drawer, form bersarang).
   */
  intensiveIccuAlertBackdrop: "z-[100230]",
  intensiveIccuAlert: "z-[100231]",
  /**
   * Backdrop klik-untuk-tutup di bawah System Menu (Jarvis FAB); harus 1 di bawah `fullscreen` menu.
   */
  jarvisMenuBackdrop: "z-[9998]",
  /**
   * Portal listbox autocomplete barang (variant table → body).
   * Di bawah Jarvis; di atas kartu dashboard, blur, dan tabel besar.
   */
  barangAutocompletePortal: "z-[100090]",
} as const;

/** Nilai numerik untuk inline style portal (z-index kelas saja kadang kalah pada stacking konteks). */
export const Z_INDEX_VALUES = {
  barangAutocompletePortal: 100_090,
  jarvisAgentBackdrop: 100_099,
  jarvisAgent: 100_100,
  intensiveIccuModalBackdrop: 100_200,
  intensiveIccuModal: 100_201,
  intensiveIccuModalPopover: 100_203,
  intensiveIccuDrawerBackdrop: 100_210,
  intensiveIccuDrawer: 100_211,
  intensiveIccuDrawerPopover: 100_214,
  intensiveIccuNestedModalBackdrop: 100_220,
  intensiveIccuNestedModal: 100_221,
  intensiveIccuAlertBackdrop: 100_230,
  intensiveIccuAlert: 100_231,
  drawerPortal: 100_050,
} as const;
