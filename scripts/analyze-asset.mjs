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

function walk(groups, depth, limitPerNode) {
  const sorted = [...(groups ?? [])].sort(
    (a, b) => (b.parsedSize ?? 0) - (a.parsedSize ?? 0),
  );
  for (const g of sorted.slice(0, limitPerNode)) {
    const p = g.path ?? g.label ?? "(unknown)";
    const parsed = g.parsedSize ?? 0;
    const gzip = g.gzipSize ?? 0;
    if (!parsed) continue;
    console.log(
      `${" ".repeat(depth * 2)}- ${p} parsed: ${formatKB(parsed)} gzip: ${formatKB(gzip)}`,
    );
    if (g.groups?.length) walk(g.groups, depth + 1, limitPerNode);
  }
}

const assetQuery = process.argv[2];
const htmlPath = process.argv[3] ?? ".next/analyze/client.html";
const limitPerNode = Number(process.argv[4] ?? "12");

if (!assetQuery) {
  console.error("Usage: node scripts/analyze-asset.mjs <asset-label-substring> [client.html] [limit]");
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");
const chartData = extractJsonArray(html, "window.chartData", "window.entrypoints");
if (!chartData) {
  console.error("Failed to parse window.chartData from", htmlPath);
  process.exit(1);
}

const hits = chartData
  .filter((a) => a?.isAsset)
  .filter((a) => String(a.label ?? "").includes(assetQuery))
  .sort((a, b) => (b.parsedSize ?? 0) - (a.parsedSize ?? 0));

if (hits.length === 0) {
  console.error("No assets matched:", assetQuery);
  process.exit(1);
}

for (const asset of hits.slice(0, 3)) {
  console.log("Asset:", asset.label);
  console.log("Size (parsed/gzip):", formatKB(asset.parsedSize ?? 0), "/", formatKB(asset.gzipSize ?? 0));
  console.log("Top groups:");
  walk(asset.groups ?? [], 1, limitPerNode);
  console.log("");
}

