/**
 * Standar layer (z-index) UI global.
 * Gunakan token ini agar tidak hardcode angka di banyak komponen.
 */
export const UI_LAYERS = {
  hud: "z-30",
  detailBackdrop: "z-[45]",
  overlay: "z-40",
  modal: "z-50",
  modalHigh: "z-[55]",
  modalTop: "z-[60]",
  modalManager: "z-[220]",
  floatingCard: "z-[310]",
  popover: "z-[80]",
  drawerPortal: "z-[5000]",
  pickerFloating: "z-[5000]",
  pickerFloatingTop: "z-[10050]",
  dialogOverlayTop: "z-[10000]",
  dialogContentTop: "z-[10001]",
  fullscreenOverlay: "z-[999]",
  fullscreen: "z-[9999]",
} as const;

