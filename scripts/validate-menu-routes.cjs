/**
 * Validates that every href in app/config/menuConfig.tsx has a corresponding
 * page under app/ (e.g. app/dashboard/pasien/page.tsx). Run: node scripts/validate-menu-routes.cjs
 */

const fs = require("fs");
const path = require("path");

const APP_DIR = path.join(__dirname, "..", "app");
const MENU_CONFIG_PATH = path.join(__dirname, "..", "app", "config", "menuConfig.tsx");

function discoverRoutes(dir, base = "") {
  const routes = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const rel = base ? `${base}/${e.name}` : e.name;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "config" || e.name.startsWith("_") || e.name.startsWith(".")) continue;
      routes.push(...discoverRoutes(full, rel));
    } else if (e.isFile() && e.name === "page.tsx") {
      const route = "/" + base.replace(/\\/g, "/");
      routes.push(route === "/" ? "/" : route);
    }
  }
  return routes;
}

function extractHrefsFromMenuConfig(content) {
  const hrefs = [];
  const re = /href:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) hrefs.push(m[1]);
  return hrefs;
}

function main() {
  const routes = discoverRoutes(APP_DIR);
  const routeSet = new Set(routes);

  const menuContent = fs.readFileSync(MENU_CONFIG_PATH, "utf8");
  const hrefs = extractHrefsFromMenuConfig(menuContent);

  const missing = hrefs.filter((h) => !routeSet.has(h));
  const ok = hrefs.filter((h) => routeSet.has(h));

  if (missing.length > 0) {
    console.error("❌ Menu href(s) without a page:\n");
    missing.forEach((h) => console.error("   ", h));
    console.error("\n✅ Hrefs with pages:", ok.length);
    process.exit(1);
  }

  console.log("✅ All", hrefs.length, "menu href(s) have a corresponding page.");
}

main();
