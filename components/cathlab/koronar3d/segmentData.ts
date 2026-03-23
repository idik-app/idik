import * as THREE from "three";

/** Kurva referensi — skematik mendekati tata letak koroner, bukan data pasien. */
export type SegmentDef = {
  id: string;
  label: string;
  points: THREE.Vector3[];
};

/** Jari-jari proximal → distal (world space, ~ skala jantung abstrak). */
const SEGMENT_RADII: Record<string, { start: number; end: number }> = {
  lmca: { start: 0.056, end: 0.038 },
  lad: { start: 0.044, end: 0.02 },
  diag1: { start: 0.028, end: 0.016 },
  diag2: { start: 0.026, end: 0.015 },
  circ: { start: 0.04, end: 0.022 },
  om1: { start: 0.028, end: 0.015 },
  om2: { start: 0.024, end: 0.014 },
  rca: { start: 0.048, end: 0.02 },
  rv: { start: 0.026, end: 0.014 },
  am: { start: 0.026, end: 0.014 },
  pda: { start: 0.024, end: 0.013 },
  pl1: { start: 0.022, end: 0.012 },
  pl2: { start: 0.021, end: 0.012 },
};

export function getSegmentRadii(seg: SegmentDef): { start: number; end: number } {
  return SEGMENT_RADII[seg.id] ?? { start: 0.032, end: 0.016 };
}

/**
 * Titik kontrol lebih rapat + sedikit lengkungan agar tidak terlihat seperti batang lurus.
 * Posisi mengikuti skema LCA vs RCA di permukaan jantung (abstrak).
 */
export const CORONARY_SEGMENTS: SegmentDef[] = [
  {
    id: "lmca",
    label: "LMCA",
    points: [
      new THREE.Vector3(0, 2.35, 0.02),
      new THREE.Vector3(-0.12, 2.05, 0.08),
      new THREE.Vector3(-0.28, 1.72, 0.14),
      new THREE.Vector3(-0.45, 1.38, 0.24),
      new THREE.Vector3(-0.55, 1.15, 0.32),
    ],
  },
  {
    id: "lad",
    label: "LAD",
    points: [
      new THREE.Vector3(-0.55, 1.15, 0.32),
      new THREE.Vector3(-0.54, 0.85, 0.52),
      new THREE.Vector3(-0.52, 0.48, 0.78),
      new THREE.Vector3(-0.5, 0.08, 1.05),
      new THREE.Vector3(-0.48, -0.35, 1.32),
      new THREE.Vector3(-0.46, -0.75, 1.55),
    ],
  },
  {
    id: "diag1",
    label: "Diag 1",
    points: [
      new THREE.Vector3(-0.53, 0.72, 0.62),
      new THREE.Vector3(-0.38, 0.62, 0.92),
      new THREE.Vector3(-0.15, 0.58, 1.28),
    ],
  },
  {
    id: "diag2",
    label: "Diag 2",
    points: [
      new THREE.Vector3(-0.51, 0.22, 1.02),
      new THREE.Vector3(-0.32, 0.02, 1.38),
      new THREE.Vector3(-0.1, -0.12, 1.68),
    ],
  },
  {
    id: "circ",
    label: "Circ",
    points: [
      new THREE.Vector3(-0.55, 1.15, 0.32),
      new THREE.Vector3(-0.95, 1.12, 0.22),
      new THREE.Vector3(-1.42, 1.02, 0.18),
      new THREE.Vector3(-1.85, 0.88, 0.28),
      new THREE.Vector3(-2.12, 0.72, 0.42),
    ],
  },
  {
    id: "om1",
    label: "OM 1",
    points: [
      new THREE.Vector3(-1.58, 0.98, 0.32),
      new THREE.Vector3(-2.0, 0.72, 0.55),
      new THREE.Vector3(-2.38, 0.45, 0.82),
    ],
  },
  {
    id: "om2",
    label: "OM 2",
    points: [
      new THREE.Vector3(-1.98, 0.68, 0.48),
      new THREE.Vector3(-2.42, 0.38, 0.58),
      new THREE.Vector3(-2.85, 0.12, 0.68),
    ],
  },
  {
    id: "rca",
    label: "RCA",
    points: [
      new THREE.Vector3(0.08, 2.05, 0.08),
      new THREE.Vector3(0.35, 1.75, 0.18),
      new THREE.Vector3(0.72, 1.35, 0.28),
      new THREE.Vector3(1.2, 0.82, 0.38),
      new THREE.Vector3(1.72, 0.22, 0.48),
      new THREE.Vector3(2.18, -0.38, 0.46),
      new THREE.Vector3(2.38, -0.68, 0.44),
    ],
  },
  {
    id: "rv",
    label: "RV branch",
    points: [
      new THREE.Vector3(0.88, 1.22, 0.3),
      new THREE.Vector3(1.12, 0.88, 0.12),
      new THREE.Vector3(1.38, 0.52, -0.22),
    ],
  },
  {
    id: "am",
    label: "Acute Marginal",
    points: [
      new THREE.Vector3(1.48, 0.38, 0.45),
      new THREE.Vector3(1.85, 0.12, 0.28),
      new THREE.Vector3(2.12, -0.08, 0.12),
    ],
  },
  {
    id: "pda",
    label: "PDA",
    points: [
      new THREE.Vector3(2.2, -0.52, 0.42),
      new THREE.Vector3(2.05, -0.95, 0.62),
      new THREE.Vector3(1.85, -1.35, 0.85),
    ],
  },
  {
    id: "pl1",
    label: "PL 1",
    points: [
      new THREE.Vector3(2.26, -0.48, 0.4),
      new THREE.Vector3(2.48, -0.78, 0.32),
      new THREE.Vector3(2.68, -1.05, 0.24),
    ],
  },
  {
    id: "pl2",
    label: "PL 2",
    points: [
      new THREE.Vector3(2.32, -0.55, 0.38),
      new THREE.Vector3(2.65, -0.78, 0.08),
      new THREE.Vector3(2.95, -0.95, -0.15),
    ],
  },
];

function ensureCurvePoints(points: THREE.Vector3[]): THREE.Vector3[] {
  if (points.length >= 3) return points;
  if (points.length === 2) {
    const mid = points[0].clone().add(points[1]).multiplyScalar(0.5);
    return [points[0], mid, points[1]];
  }
  return points;
}

export function getCurveForSegment(seg: SegmentDef): THREE.CatmullRomCurve3 {
  const pts = ensureCurvePoints(seg.points);
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.42);
}

export function midpoint(seg: SegmentDef): THREE.Vector3 {
  const c = getCurveForSegment(seg);
  return c.getPointAt(0.5);
}
