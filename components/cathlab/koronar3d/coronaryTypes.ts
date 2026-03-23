/** Tipe UI anotasi — dipisah agar modul R3F tidak di-import secara statis dari parent (Turbopack). */

export type AnnotationKind = "lesion" | "stent";

export type SegmentAnnotation = {
  kind: AnnotationKind;
  opacity: number;
};
