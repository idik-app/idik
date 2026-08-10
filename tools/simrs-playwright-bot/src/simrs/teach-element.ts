import type { Page, Frame, ElementHandle } from "playwright";
import { sleep } from "../util/timing.js";
import { isDangerousLabel } from "./dangerous.js";

const EXT_GEN = /^ext-gen\d+$/i;

/**
 * Injected as string so tsx/esbuild cannot inject `__name` into page.evaluate.
 * Soft listener: record coords only — do not preventDefault (breaks ExtJS).
 */
const TEACH_INJECT_CLICK = `(() => {
  window.__idikTeach = undefined;
  const handler = (ev) => {
    if (ev.button !== 0) return;
    window.__idikTeach = { x: ev.clientX, y: ev.clientY };
    document.removeEventListener("click", handler, true);
  };
  document.addEventListener("click", handler, true);
})()`;

const TEACH_READ_POINT = `(() => window.__idikTeach || null)()`;

const TEACH_CLEAR_POINT = `(() => { window.__idikTeach = undefined; })()`;

/** Resolve a meaningful element from click coords (walk-up + offsets). */
const RESOLVE_FROM_POINT = `(x, y) => {
  const offsets = [[0,0],[0,-2],[0,2],[-2,0],[2,0],[0,-4],[0,4]];
  const looksUseful = (node) => {
    if (!node || !node.tagName) return false;
    const tag = node.tagName.toLowerCase();
    if (tag === "html" || tag === "body") return false;
    if (/^(input|textarea|select|button|a)$/i.test(tag)) return true;
    if (tag === "td" || tag === "th") return true;
    if (node.getAttribute && node.getAttribute("role") === "gridcell") return true;
    const t = (node.innerText || node.textContent || "").trim();
    if (t && t.length <= 80) return true;
    return false;
  };
  const climb = (start) => {
    let cur = start;
    let best = null;
    for (let i = 0; i < 12 && cur; i++) {
      if (looksUseful(cur)) {
        best = cur;
        const tag = cur.tagName.toLowerCase();
        if (/^(input|textarea|select|button|a|td|th)$/i.test(tag)) return cur;
        if (cur.getAttribute && cur.getAttribute("role") === "gridcell") return cur;
      }
      cur = cur.parentElement;
    }
    return best || start;
  };
  for (const [dx, dy] of offsets) {
    const hit = document.elementFromPoint(x + dx, y + dy);
    if (!hit) continue;
    const resolved = climb(hit);
    if (resolved && looksUseful(resolved)) return resolved;
  }
  const base = document.elementFromPoint(x, y);
  return base ? climb(base) : null;
}`;

/**
 * Build metadata from element — includes table cell row/col context.
 */
const BUILD_STABLE_FROM_EL = `(el) => {
  if (!el) return null;
  let e = el;
  const tag0 = (e.tagName || "").toLowerCase();
  if (!tag0) return null;

  // Prefer cell / control ancestors when click lands on inner span
  const cell =
    (e.closest && (e.closest("td") || e.closest('[role="gridcell"]'))) || null;
  const control =
    (e.closest &&
      e.closest("input, textarea, select, button, a[href]")) || null;
  if (control) e = control;
  else if (cell) e = cell;

  const tag = (e.tagName || "").toLowerCase();
  const id = e.id || "";
  const name = (e.getAttribute && e.getAttribute("name") || "").trim();
  const aria = (e.getAttribute && e.getAttribute("aria-label") || "").trim();
  const placeholder = (e.getAttribute && e.getAttribute("placeholder") || "").trim();
  const type = (e.getAttribute && e.getAttribute("type") || "").trim();
  const role = (e.getAttribute && e.getAttribute("role") || "").trim();

  let rowText = "";
  let colHint = "";
  let tablecell = null;
  const tr = e.closest && e.closest("tr");
  if (tr && (tag === "td" || tag === "th" || role === "gridcell")) {
    rowText = (tr.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 120);
    const cells = Array.from(tr.children || []).filter(
      (c) => /^(td|th)$/i.test(c.tagName) || (c.getAttribute && c.getAttribute("role") === "gridcell"),
    );
    const idx = cells.indexOf(e);
    const table = e.closest && e.closest("table");
    if (table && idx >= 0) {
      const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
      if (headerRow) {
        const headers = Array.from(headerRow.children || []);
        if (headers[idx]) {
          colHint = (headers[idx].innerText || "").replace(/\\s+/g, " ").trim().slice(0, 40);
        }
      }
    }
    if (!colHint && /total/i.test(rowText)) {
      colHint = "Biaya";
    }
    const rowKey = /total/i.test(rowText)
      ? "Total"
      : (rowText.split(" ")[0] || "row").slice(0, 40);
    const colKey = colHint || "Biaya";
    tablecell = { row: rowKey, col: colKey };
  }

  let label = "";
  if (aria) label = aria;
  else if (placeholder) label = placeholder;
  else if (tablecell) label = tablecell.row + " " + tablecell.col;
  else {
    const idFor = id
      ? document.querySelector('label[for="' + String(id).replace(/"/g, "") + '"]')
      : null;
    if (idFor) label = (idFor.textContent || "").trim();
    else {
      const parentLabel = e.closest && e.closest("label");
      if (parentLabel) label = (parentLabel.textContent || "").trim();
      else {
        const prev = e.previousElementSibling;
        if (prev && /label|span|td|th|div/i.test(prev.tagName)) {
          label = (prev.textContent || "").trim().slice(0, 80);
        }
      }
    }
  }

  let value = "";
  const tagU = e.tagName;
  if (tagU === "INPUT" || tagU === "TEXTAREA") {
    value = e.value || "";
  } else if (tagU === "SELECT") {
    const opt = e.options && e.options[e.selectedIndex];
    value = e.value || (opt && opt.text) || "";
  } else {
    value = (e.innerText || e.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 120);
  }

  const shortText = value && value.length > 0 && value.length <= 48 ? value : "";

  return {
    tag: tag,
    id: id,
    name: name,
    aria: aria,
    placeholder: placeholder,
    type: type,
    role: role,
    label: label,
    value: value,
    shortText: shortText,
    tablecell: tablecell,
    isInput: tagU === "INPUT" || tagU === "TEXTAREA" || tagU === "SELECT",
  };
}`;

type StableMeta = {
  tag: string;
  id: string;
  name: string;
  aria: string;
  placeholder: string;
  type: string;
  role: string;
  label: string;
  value: string;
  shortText: string;
  tablecell: { row: string; col: string } | null;
  isInput: boolean;
};

export type TaughtClick = {
  selector: string;
  label: string;
  value: string;
  isInput: boolean;
};

/** Prefer stable selector attributes; never ext-gen*. */
export async function buildStableSelector(
  owner: Page | Frame,
  el: ElementHandle<Element>,
): Promise<TaughtClick> {
  const data = (await owner.evaluate(
    BUILD_STABLE_FROM_EL,
    el,
  )) as StableMeta | null;

  if (!data || typeof data !== "object" || !data.tag) {
    throw new Error(
      "gagal baca elemen dari klik — coba klik ulang pada teks/nilai field (bukan area kosong)",
    );
  }

  let selector = "";
  if (data.tablecell?.row && data.tablecell?.col) {
    selector = `tablecell:${data.tablecell.row}|${data.tablecell.col}`;
  } else if (data.name) {
    selector = `${data.tag}[name=${JSON.stringify(data.name)}]`;
  } else if (data.id && !EXT_GEN.test(data.id)) {
    selector = `#${data.id.replace(/(:|\.|\[|\]|,|=)/g, "\\$1")}`;
  } else if (data.aria) {
    selector = `${data.tag}[aria-label=${JSON.stringify(data.aria)}]`;
  } else if (data.placeholder) {
    selector = `${data.tag}[placeholder=${JSON.stringify(data.placeholder)}]`;
  } else if (data.label && data.label.length <= 60) {
    selector = `label:${data.label}`;
  } else if (data.shortText && !/^[\\d.\\s]+$/.test(data.shortText)) {
    // Prefer visible text for menus/buttons (not pure numbers)
    selector = `text:${data.shortText}`;
  } else if (data.shortText) {
    selector = `text:${data.shortText}`;
  } else {
    selector = data.tag;
  }

  return {
    selector,
    label: data.label || data.name || data.aria || data.placeholder || data.shortText || data.tag,
    value: data.value || "",
    isInput: Boolean(data.isInput),
  };
}

const DANGEROUS_CLICK =
  /hapus|delete|simpan|save|submit|batal batal|logout|keluar/i;

export function isDangerousTeachTarget(label: string, text: string): boolean {
  const blob = `${label} ${text}`;
  if (isDangerousLabel(blob)) return true;
  return DANGEROUS_CLICK.test(blob);
}

/**
 * Wait for a single left-click on page (or frames). Uses DOM hit-test — no Inspect.
 * Soft-fails on unreadable clicks and keeps waiting for another click.
 */
export async function waitForTeachClick(
  page: Page,
  opts?: { timeoutMs?: number },
): Promise<TaughtClick> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  console.log(
    "[teach] Klik KIRI sekali pada elemen di SIMRS (klik kanan tidak perlu)…",
  );

  await page.evaluate(TEACH_INJECT_CLICK);
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    await frame.evaluate(TEACH_INJECT_CLICK).catch(() => undefined);
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const contexts: (Page | Frame)[] = [page, ...page.frames()];
    for (const ctx of contexts) {
      const point = (await ctx
        .evaluate(TEACH_READ_POINT)
        .catch(() => undefined)) as { x: number; y: number } | null | undefined;
      if (!point || typeof point.x !== "number" || typeof point.y !== "number") {
        continue;
      }

      await ctx.evaluate(TEACH_CLEAR_POINT).catch(() => undefined);

      const x = Number(point.x);
      const y = Number(point.y);
      const handle = await ctx
        .evaluateHandle(
          `(() => { const resolve = ${RESOLVE_FROM_POINT}; return resolve(${x}, ${y}); })()`,
        )
        .catch(() => null);

      if (!handle) {
        // Re-arm listener after a bad hit
        await ctx.evaluate(TEACH_INJECT_CLICK).catch(() => undefined);
        continue;
      }
      const el = handle.asElement() as ElementHandle<Element> | null;
      if (!el) {
        await handle.dispose().catch(() => undefined);
        await ctx.evaluate(TEACH_INJECT_CLICK).catch(() => undefined);
        continue;
      }

      try {
        const built = await buildStableSelector(ctx, el);
        if (isDangerousTeachTarget(built.label, built.value)) {
          console.warn(
            `[teach] elemen berbahaya diabaikan: ${built.label} — klik ulang`,
          );
          await ctx.evaluate(TEACH_INJECT_CLICK).catch(() => undefined);
          continue;
        }
        console.log(
          `[teach] terekam label="${built.label}" selector=${built.selector} value=${built.value.slice(0, 40)}`,
        );
        return built;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[teach] ${msg} — menunggu klik ulang`);
        await ctx.evaluate(TEACH_INJECT_CLICK).catch(() => undefined);
      } finally {
        await el.dispose().catch(() => undefined);
      }
    }
    await sleep(200);
  }
  throw new Error("Timeout menunggu klik ajar elemen");
}

async function readInFrame(
  frame: Page | Frame,
  selector: string,
): Promise<string | null> {
  if (selector.startsWith("tablecell:")) {
    const rest = selector.slice("tablecell:".length);
    const [rowKey, colKey] = rest.split("|");
    if (!rowKey || !colKey) return null;
    const value = await frame
      .evaluate(
        ({ row, col }) => {
          const esc = (s: string) =>
            s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const rows = Array.from(document.querySelectorAll("tr"));
          const rowRe = new RegExp(esc(row), "i");
          const colRe = new RegExp(esc(col), "i");
          for (const tr of rows) {
            const rowText = (tr.innerText || "").replace(/\s+/g, " ").trim();
            if (!rowRe.test(rowText)) continue;
            const cells = Array.from(tr.children).filter(
              (c) =>
                /^(td|th)$/i.test(c.tagName) ||
                (c.getAttribute && c.getAttribute("role") === "gridcell"),
            ) as HTMLElement[];
            const table = tr.closest("table");
            let headerTexts: string[] = [];
            if (table) {
              const headerRow =
                table.querySelector("thead tr") || table.querySelector("tr");
              if (headerRow) {
                headerTexts = Array.from(headerRow.children).map((h) =>
                  ((h as HTMLElement).innerText || "").replace(/\s+/g, " ").trim(),
                );
              }
            }
            for (let i = 0; i < cells.length; i++) {
              if (headerTexts[i] && colRe.test(headerTexts[i])) {
                return (cells[i].innerText || "").replace(/\s+/g, " ").trim();
              }
            }
            for (let i = cells.length - 1; i >= 0; i--) {
              const t = (cells[i].innerText || "").replace(/\s+/g, " ").trim();
              if (/\d/.test(t) && t.length <= 32) return t;
            }
          }
          return null;
        },
        { row: rowKey, col: colKey },
      )
      .catch(() => null);
    return value;
  }

  if (selector.startsWith("label:")) {
    const label = selector.slice("label:".length);
    const byLabel = frame.getByLabel(label, { exact: false }).first();
    if ((await byLabel.count()) > 0) {
      return (
        (await byLabel.inputValue().catch(() => "")) ||
        ((await byLabel.innerText().catch(() => "")) || "").trim()
      );
    }
    const text = frame.getByText(label, { exact: false }).first();
    const input = text.locator(
      "xpath=following::input[1] | following::textarea[1] | following::select[1]",
    );
    if ((await input.count()) > 0) {
      return (
        (await input.first().inputValue().catch(() => "")) ||
        ((await input.first().innerText().catch(() => "")) || "").trim()
      );
    }
    return null;
  }

  if (selector.startsWith("text:")) {
    const t = selector.slice("text:".length);
    const loc = frame.getByText(t, { exact: false }).first();
    if ((await loc.count()) === 0) return null;
    return ((await loc.innerText().catch(() => "")) || "").trim();
  }

  const loc = frame.locator(selector).first();
  if ((await loc.count()) === 0) return null;
  const visible = await loc.isVisible().catch(() => false);
  if (!visible) return null;
  return (
    (await loc.inputValue().catch(() => "")) ||
    ((await loc.innerText().catch(() => "")) || "").trim()
  );
}

export async function readBySelector(
  page: Page,
  selector: string,
): Promise<string> {
  const frames: (Page | Frame)[] = [page, ...page.frames()];
  for (const frame of frames) {
    const val = await readInFrame(frame, selector);
    if (val != null && String(val).trim()) return String(val).trim();
  }
  throw new Error(`element_not_found: ${selector}`);
}

export async function clickBySelector(page: Page, selector: string): Promise<void> {
  const frames: (Page | Frame)[] = [page, ...page.frames()];
  for (const frame of frames) {
    if (selector.startsWith("text:")) {
      const t = selector.slice("text:".length);
      const loc = frame.getByText(t, { exact: false }).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
        await loc.click({ timeout: 15_000 });
        return;
      }
      continue;
    }
    if (selector.startsWith("label:")) {
      const label = selector.slice("label:".length);
      const loc = frame.getByText(label, { exact: false }).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
        await loc.click({ timeout: 15_000 });
        return;
      }
      continue;
    }
    if (selector.startsWith("tablecell:")) {
      // Reading cells is preferred; clicking Total is rare — try text of value later
      continue;
    }
    const loc = frame.locator(selector).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      await loc.click({ timeout: 15_000 });
      return;
    }
  }
  // Fallback: try as button text
  if (selector.startsWith("text:") || selector.startsWith("label:")) {
    const t = selector.replace(/^(text|label):/, "");
    await clickButtonByText(page, t);
    return;
  }
  throw new Error(`element_not_found (click): ${selector}`);
}

export async function fillBySelector(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  const frames: (Page | Frame)[] = [page, ...page.frames()];
  for (const frame of frames) {
    if (selector.startsWith("label:")) {
      const label = selector.slice("label:".length);
      const byLabel = frame.getByLabel(label, { exact: false }).first();
      if ((await byLabel.count()) > 0) {
        await byLabel.fill(value);
        return;
      }
      const text = frame.getByText(label, { exact: false }).first();
      const input = text.locator(
        "xpath=following::input[1] | following::textarea[1]",
      );
      if ((await input.count()) > 0) {
        await input.first().fill(value);
        return;
      }
      continue;
    }
    if (selector.startsWith("text:")) continue;
    const loc = frame.locator(selector).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      await loc.fill(value);
      return;
    }
  }
  throw new Error(`element_not_found (fill): ${selector}`);
}

export async function clickButtonByText(page: Page, text: string) {
  const exactBtn = page.getByRole("button", { name: text, exact: true }).first();
  if (
    (await exactBtn.count()) > 0 &&
    (await exactBtn.isVisible().catch(() => false))
  ) {
    await exactBtn.click({ timeout: 15_000 });
    return;
  }
  const re = new RegExp(text.replace(/\s+/g, "\\s*"), "i");
  const btn = page.getByRole("button", { name: re }).first();
  if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
    await btn.click({ timeout: 15_000 });
    return;
  }
  const any = page.getByText(re).first();
  if ((await any.count()) > 0) {
    await any.click({ timeout: 15_000 });
    return;
  }
  throw new Error(`Tombol/teks tidak ditemukan: ${text}`);
}
