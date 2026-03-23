import { z } from "zod";

export const annotationKindSchema = z.enum(["lesion", "stent"]);

export const segmentAnnotationSchema = z.object({
  kind: annotationKindSchema,
  opacity: z.number().min(0.1).max(1),
});

export const koronarPayloadV1Schema = z.object({
  version: z.literal(1),
  annotations: z.record(z.string(), segmentAnnotationSchema),
  paintMode: annotationKindSchema,
  opacity: z.number().min(0.1).max(1),
});

export type KoronarPayloadV1 = z.infer<typeof koronarPayloadV1Schema>;

export function parseKoronarPayload(raw: unknown): KoronarPayloadV1 | null {
  const p = koronarPayloadV1Schema.safeParse(raw);
  return p.success ? p.data : null;
}
