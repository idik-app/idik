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

export const JARVIS_LAYOUT_STORAGE_KEY = "idik-jarvis-mode-widget-layout-v4";

const KPI_IDS = new Set<JarvisWidgetId>([
  "kpi-pasien",
  "kpi-gender",
  "kpi-tindakan",
  "kpi-dokter",
  "kpi-laporan",
]);

/** Tinggi minimum KPI agar isi tidak perlu di-scroll */
export const JARVIS_KPI_MIN_H = 40;

/** Tata letak default: 5 KPI atas (lebih tinggi) + 2 panel bawah */
export const DEFAULT_JARVIS_WIDGET_LAYOUT: JarvisWidgetRect[] = [
  { id: "kpi-pasien", x: 0.5, y: 8, w: 19, h: 40 },
  { id: "kpi-gender", x: 20.5, y: 8, w: 19, h: 40 },
  { id: "kpi-tindakan", x: 40.5, y: 8, w: 19, h: 40 },
  { id: "kpi-dokter", x: 60.5, y: 8, w: 19, h: 40 },
  { id: "kpi-laporan", x: 80.5, y: 8, w: 19, h: 40 },
  { id: "chart-ppci", x: 0.5, y: 50, w: 49, h: 48 },
  { id: "laporan-tindakan", x: 50.5, y: 46, w: 49, h: 52 },
];

const SNAP_PCT = 1.5;

export function snapJarvisPercent(value: number): number {
  return Math.round(value / SNAP_PCT) * SNAP_PCT;
}

export function clampJarvisRect(rect: JarvisWidgetRect): JarvisWidgetRect {
  const minH = KPI_IDS.has(rect.id) ? JARVIS_KPI_MIN_H : 16;
  const w = Math.min(Math.max(rect.w, 14), 100);
  const h = Math.min(Math.max(rect.h, minH), 100);
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
    const migrated = parsed.map((p) =>
      (p.id as string) === "matrix-laporan"
        ? { ...p, id: "laporan-tindakan" as JarvisWidgetId }
        : p,
    );
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
