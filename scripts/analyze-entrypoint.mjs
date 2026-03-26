import fs from "node:fs";

function extractJsonArray(html, key, endKey) {
  const marker = `${key} = `;
  const a = html.indexOf(marker);
  if (a < 0) return null;
  const b = html.indexOf(endKey, a);
  if (b < 0) return null;
  const mid = html.slice(a + marker.length, b);
  const end = mid.lastIndexOf("];");
  const json = end >= 0 ? mid.slice(0, end + 1) : mid.trim();
  return JSON.parse(json);
}

function formatKB(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n / 1024)} kB`;
}

const entryQuery = process.argv[2] ?? "app/dashboard/pemakaian/page";
const htmlPath = process.argv[3] ?? ".next/analyze/client.html";

const html = fs.readFileSync(htmlPath, "utf8");
const chartData = extractJsonArray(html, "window.chartData", "window.entrypoints");
if (!chartData) {
  console.error("Failed to parse window.chartData from", htmlPath);
  process.exit(1);
}

const entrypoints = extractJsonArray(html, "window.entrypoints", "window.defaultSizes");
if (!entrypoints) {
  console.error("Failed to parse window.entrypoints from", htmlPath);
  process.exit(1);
}

const match = entrypoints.find((e) => String(e).includes(entryQuery));
if (!match) {
  console.error("Entrypoint not found. Query:", entryQuery);
  console.error("Example entrypoints containing 'pemakaian':");
  for (const e of entrypoints.filter((x) => String(x).includes("pemakaian")).slice(0, 20)) {
    console.error(" -", e);
  }
  process.exit(1);
}

const ep = match;
const initial = chartData
  .filter((a) => a?.isAsset)
  .filter((a) => a?.isInitialByEntrypoint && a.isInitialByEntrypoint[ep])
  .map((a) => ({
    label: a.label,
    parsedSize: a.parsedSize ?? 0,
    gzipSize: a.gzipSize ?? 0,
    groups: a.groups ?? [],
  }))
  .sort((a, b) => b.parsedSize - a.parsedSize);

function flattenGroups(groups, out = []) {
  for (const g of groups ?? []) {
    out.push(g);
    if (g?.groups?.length) flattenGroups(g.groups, out);
  }
  return out;
}

console.log("Entrypoint:", ep);
console.log("Initial assets:", initial.length);
console.log(
  "Initial total (parsed/gzip):",
  formatKB(initial.reduce((s, a) => s + a.parsedSize, 0)),
  "/",
  formatKB(initial.reduce((s, a) => s + a.gzipSize, 0)),
);
console.log("");

for (const a of initial.slice(0, 15)) {
  console.log(
    "-",
    a.label,
    "parsed:",
    formatKB(a.parsedSize),
    "gzip:",
    formatKB(a.gzipSize),
  );
  const topGroups = (a.groups ?? [])
    .map((g) => ({
      label: g.label,
      path: g.path,
      parsedSize: g.parsedSize ?? 0,
      gzipSize: g.gzipSize ?? 0,
    }))
    .sort((x, y) => y.parsedSize - x.parsedSize)
    .slice(0, 5);
  for (const g of topGroups) {
    if (!g.parsedSize) continue;
    console.log(
      "   •",
      g.path ?? g.label,
      "parsed:",
      formatKB(g.parsedSize),
      "gzip:",
      formatKB(g.gzipSize),
    );
  }
}

console.log("");
console.log("Top modules under initial assets (by parsed size):");
const flat = flattenGroups(initial.flatMap((a) => a.groups ?? []))
  .filter((g) => typeof g?.path === "string" && (g.parsedSize ?? 0) > 0)
  .map((g) => ({
    path: g.path,
    parsedSize: g.parsedSize ?? 0,
    gzipSize: g.gzipSize ?? 0,
  }))
  .sort((a, b) => b.parsedSize - a.parsedSize);

const seen = new Set();
let printed = 0;
for (const g of flat) {
  const key = g.path;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(" -", key, "parsed:", formatKB(g.parsedSize), "gzip:", formatKB(g.gzipSize));
  printed += 1;
  if (printed >= 25) break;
}

