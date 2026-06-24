export type JarvisWidgetId =
  | "kpi-pasien"
  | "kpi-gender"
  | "kpi-tindakan"
  | "kpi-dokter"
  | "kpi-laporan"
  | "chart-ppci"
  | "laporan-tindakan"
  | "alerts-medis";

export type JarvisWidgetRect = {
  id: JarvisWidgetId;
  /** Posisi X dalam persen (0–100) relatif ke kanvas */
  x: number;
  y: number;
  /** Lebar & tinggi dalam persen */
  w: number;
  h: number;
};

export const JARVIS_LAYOUT_STORAGE_KEY = "idik-jarvis-mode-widget-layout-v8";

/** Widget laporan mengisi sisa kanvas sampai bawah (top + bottom anchor). */
export const JARVIS_LAPORAN_ANCHOR_BOTTOM = true;

/** Kanvas mengisi tinggi area konten konsol (bukan px tetap). */
export const JARVIS_CANVAS_MIN_HEIGHT_PX = 0;

export function computeJarvisCanvasHeightPx(
  layout: readonly JarvisWidgetRect[],
): number {
  void layout;
  return 0;
}

const KPI_IDS = new Set<JarvisWidgetId>([
  "kpi-pasien",
  "kpi-gender",
  "kpi-tindakan",
  "kpi-dokter",
  "kpi-laporan",
]);

/** Tinggi minimum KPI (relatif % kanvas). */
export const JARVIS_KPI_MIN_H = 9;

const LAPORAN_MIN_H = 28;

/** Satu layar: KPI + PPCI lebih tinggi + laporan menempel ke bawah kanvas. */
export const DEFAULT_JARVIS_WIDGET_LAYOUT: JarvisWidgetRect[] = [
  { id: "kpi-pasien", x: 0.5, y: 0, w: 19.5, h: 11 },
  { id: "kpi-gender", x: 20.5, y: 0, w: 19.5, h: 11 },
  { id: "kpi-tindakan", x: 40.5, y: 0, w: 19.5, h: 11 },
  { id: "kpi-dokter", x: 60.5, y: 0, w: 19.5, h: 11 },
  { id: "kpi-laporan", x: 80.5, y: 0, w: 19, h: 11 },
  { id: "chart-ppci", x: 0.5, y: 11, w: 99, h: 30 },
  { id: "laporan-tindakan", x: 0.5, y: 42, w: 99, h: 57 },
];

const SNAP_PCT = 1.5;

export function snapJarvisPercent(value: number): number {
  return Math.round(value / SNAP_PCT) * SNAP_PCT;
}

export function clampJarvisRect(rect: JarvisWidgetRect): JarvisWidgetRect {
  const minH = KPI_IDS.has(rect.id)
    ? JARVIS_KPI_MIN_H
    : rect.id === "laporan-tindakan"
      ? LAPORAN_MIN_H
      : 16;
  const w = Math.min(Math.max(rect.w, 14), 100);
  const h = Math.min(Math.max(rect.h, minH), 100);
  const x = snapJarvisPercent(Math.min(Math.max(rect.x, 0), 100 - w));
  const y = snapJarvisPercent(Math.min(Math.max(rect.y, 0), 100 - h));
  return { ...rect, x, y, w, h };
}

function migrateSavedLayout(parsed: JarvisWidgetRect[]): JarvisWidgetRect[] {
  const migrated = parsed.map((p) =>
    (p.id as string) === "matrix-laporan"
      ? { ...p, id: "laporan-tindakan" as JarvisWidgetId }
      : p,
  );

  const laporan = migrated.find((p) => p.id === "laporan-tindakan");
  const chart = migrated.find((p) => p.id === "chart-ppci");
  const oldSideBySide =
    laporan != null &&
    chart != null &&
    laporan.w < 70 &&
    chart.w < 70 &&
    Math.abs(laporan.y - chart.y) < 8;
  const oldTallLaporan =
    laporan != null && (laporan.h >= 55 || laporan.y <= 35);
  const oldShortChart = chart != null && chart.h <= 22;

  if (!oldSideBySide && !oldTallLaporan && !oldShortChart) return migrated;

  const byId = new Map(DEFAULT_JARVIS_WIDGET_LAYOUT.map((d) => [d.id, d]));
  return migrated.map((p) => {
    if (p.id !== "laporan-tindakan" && p.id !== "chart-ppci") return p;
    const def = byId.get(p.id);
    return def ? { ...p, x: def.x, y: def.y, w: def.w, h: def.h } : p;
  });
}

export function loadJarvisWidgetLayout(): JarvisWidgetRect[] {
  if (typeof window === "undefined") return DEFAULT_JARVIS_WIDGET_LAYOUT;
  try {
    const raw = localStorage.getItem(JARVIS_LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_JARVIS_WIDGET_LAYOUT;
    const parsed = JSON.parse(raw) as JarvisWidgetRect[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_JARVIS_WIDGET_LAYOUT;
    }
    const migrated = migrateSavedLayout(parsed);
    const known = new Set(DEFAULT_JARVIS_WIDGET_LAYOUT.map((w) => w.id));
    const merged = DEFAULT_JARVIS_WIDGET_LAYOUT.map((def) => {
      const saved = migrated.find((p) => p.id === def.id);
      return saved ? clampJarvisRect({ ...def, ...saved }) : def;
    });
    for (const p of migrated) {
      if (!known.has(p.id)) merged.push(clampJarvisRect(p));
    }
    return merged;
  } catch {
    return DEFAULT_JARVIS_WIDGET_LAYOUT;
  }
}

export function saveJarvisWidgetLayout(layout: JarvisWidgetRect[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(JARVIS_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* abaikan quota */
  }
}

export function resetJarvisWidgetLayout(): JarvisWidgetRect[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(JARVIS_LAYOUT_STORAGE_KEY);
  }
  return DEFAULT_JARVIS_WIDGET_LAYOUT;
}
