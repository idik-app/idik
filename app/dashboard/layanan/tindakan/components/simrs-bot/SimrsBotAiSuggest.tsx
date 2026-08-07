"use client";

/**
 * Lapisan atas: stub OCR/AI usulan — menampilkan kandidat label dari screenshot teks
 * (tanpa model remote wajib). Digunakan di panel ajar sebagai bantuan.
 */
export function suggestLabelsFromText(pageText: string): {
  label: string;
  confidence: number;
}[] {
  const needles = [
    "NO. RM",
    "NAMA",
    "TGL. LAHIR",
    "ALAMAT",
    "Waktu",
    "IGD",
    "tiba",
    "door",
    "balloon",
  ];
  const upper = pageText.toUpperCase();
  const out: { label: string; confidence: number }[] = [];
  for (const n of needles) {
    if (upper.includes(n.toUpperCase())) {
      out.push({ label: n, confidence: 0.55 + Math.min(0.4, n.length / 40) });
    }
  }
  return out.slice(0, 8);
}

export default function SimrsBotAiSuggestBox({
  suggestions,
  onPick,
}: {
  suggestions: { label: string; confidence?: number }[];
  onPick?: (label: string) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 p-2 text-xs text-white">
      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-cyan-200">
        Usulan AI / OCR (bantuan ajar)
      </p>
      <ul className="flex flex-wrap gap-1">
        {suggestions.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => onPick?.(s.label)}
              className="rounded-md border border-cyan-400/40 bg-cyan-700/50 px-2 py-0.5 font-semibold hover:brightness-110"
            >
              {s.label}
              {typeof s.confidence === "number"
                ? ` · ${Math.round(s.confidence * 100)}%`
                : ""}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] text-white/75">
        Tetap klik elemen di SIMRS atau terima usulan — AI tidak menulis idik
        sendiri.
      </p>
    </div>
  );
}
