import type { Resolution } from "@/lib/store/useFlowSheetStore";

/** Jumlah kolom waktu dalam satu hari (00:00–24:00) untuk resolusi yang dipilih. */
export function intensiveTimelineColumnCount(resolution: Resolution): number {
  const step =
    resolution === "1m" ? 1 : resolution === "15m" ? 15 : 60;
  return (24 * 60) / step;
}

/**
 * Lebar satu kolom waktu (px) — harus sama dengan FlowSheetGrid columnVirtualizer
 * agar chart hemodynamic dan grid scroll selaras.
 */
export function intensiveTimelineColumnWidthPx(
  resolution: Resolution,
): number {
  return resolution === "1h" ? 144 : 96;
}

export function intensiveTimelineTotalWidthPx(
  resolution: Resolution,
): number {
  return (
    intensiveTimelineColumnCount(resolution) *
    intensiveTimelineColumnWidthPx(resolution)
  );
}
