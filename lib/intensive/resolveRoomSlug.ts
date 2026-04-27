/**
 * Menyelaraskan teks ruangan dari tindakan dengan slug `public.ruangan.slug`
 * untuk API multi-unit (menu Jarvis, dll).
 */
export function resolveRoomSlugFromRuanganLabel(
  ruangan: string | null | undefined,
): string {
  if (ruangan == null) return "idik";
  const lower = String(ruangan).trim().toLowerCase();
  if (!lower) return "idik";

  const ordered: { match: RegExp; slug: string }[] = [
    { match: /\biccu\b/i, slug: "iccu" },
    { match: /\bmicu\b/i, slug: "micu" },
    { match: /\b(stroke unit|stroke|unit stroke)\b/i, slug: "su" },
    { match: /\bhcu\b/i, slug: "hcu" },
    { match: /\bicu\b/i, slug: "icu" },
    { match: /\b(cath|cathlab|idik)\b/i, slug: "idik" },
  ];

  for (const { match, slug } of ordered) {
    if (match.test(lower)) return slug;
  }

  return "idik";
}
