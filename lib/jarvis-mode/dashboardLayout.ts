export type JarvisWidgetId =
  | "kpi-pasien"
  | "kpi-gender"
  | "kpi-tindakan"
  | "kpi-dokter"
  | "kpi-laporan"
  | "chart-ppci"
  | "matrix-laporan"
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

export const JARVIS_LAYOUT_STORAGE_KEY = "idik-jarvis-mode-widget-layout-v2";

/** Tata letak default mengikuti mockup: 5 KPI atas + 2 panel bawah */
export const DEFAULT_JARVIS_WIDGET_LAYOUT: JarvisWidgetRect[] = [
  { id: "kpi-pasien", x: 0.5, y: 10, w: 19, h: 30 },
  { id: "kpi-gender", x: 20.5, y: 10, w: 19, h: 30 },
  { id: "kpi-tindakan", x: 40.5, y: 10, w: 19, h: 30 },
  { id: "kpi-dokter", x: 60.5, y: 10, w: 19, h: 30 },
  { id: "kpi-laporan", x: 80.5, y: 10, w: 19, h: 30 },
  { id: "chart-ppci", x: 0.5, y: 42, w: 49, h: 50 },
  { id: "matrix-laporan", x: 50.5, y: 42, w: 49, h: 50 },
];

const SNAP_PCT = 1.5;

export function snapJarvisPercent(value: number): number {
  return Math.round(value / SNAP_PCT) * SNAP_PCT;
}

export function clampJarvisRect(rect: JarvisWidgetRect): JarvisWidgetRect {
  const w = Math.min(Math.max(rect.w, 14), 100);
  const h = Math.min(Math.max(rect.h, 16), 100);
  const x = snapJarvisPercent(Math.min(Math.max(rect.x, 0), 100 - w));
  const y = snapJarvisPercent(Math.min(Math.max(rect.y, 8), 100 - h));
  return { ...rect, x, y, w, h };
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
    const known = new Set(DEFAULT_JARVIS_WIDGET_LAYOUT.map((w) => w.id));
    const merged = DEFAULT_JARVIS_WIDGET_LAYOUT.map((def) => {
      const saved = parsed.find((p) => p.id === def.id);
      return saved ? clampJarvisRect({ ...def, ...saved }) : def;
    });
    for (const p of parsed) {
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
