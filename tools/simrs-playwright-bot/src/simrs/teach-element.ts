import type { Page, Frame, ElementHandle } from "playwright";
import { sleep } from "../util/timing.js";
import { isDangerousLabel } from "./dangerous.js";

const EXT_GEN = /^ext-gen\d+$/i;

/** Injected as string so tsx/esbuild cannot inject `__name` into page.evaluate. */
const TEACH_INJECT_CLICK = `(() => {
  window.__idikTeach = undefined;
  const handler = (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    window.__idikTeach = { x: ev.clientX, y: ev.clientY };
    document.removeEventListener("click", handler, true);
  };
  document.addEventListener("click", handler, true);
})()`;

const TEACH_READ_POINT = `(() => window.__idikTeach)()`;

const BUILD_STABLE_FROM_NODE = `(node) => {
  const e = node;
  const tag = e.tagName.toLowerCase();
  const id = e.id || "";
  const name = (e.getAttribute("name") || "").trim();
  const aria = (e.getAttribute("aria-label") || "").trim();
  const placeholder = (e.getAttribute("placeholder") || "").trim();
  const type = (e.getAttribute("type") || "").trim();
  let label = "";
  if (aria) label = aria;
  else if (placeholder) label = placeholder;
  else {
    const idFor = id
      ? document.querySelector('label[for="' + id.replace(/"/g, "") + '"]')
      : null;
    if (idFor) label = (idFor.textContent || "").trim();
    else {
      const parentLabel = e.closest("label");
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
  if (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) {
    value = e.value || "";
  } else if (e instanceof HTMLSelectElement) {
    value = e.value || (e.options[e.selectedIndex] && e.options[e.selectedIndex].text) || "";
  } else {
    value = (e.textContent || "").trim().slice(0, 120);
  }
  return { tag: tag, id: id, name: name, aria: aria, placeholder: placeholder, type: type, label: label, value: value };
}`;

type StableMeta = {
  tag: string;
  id: string;
  name: string;
  aria: string;
  placeholder: string;
  type: string;
  label: string;
  value: string;
};

/** Prefer stable selector attributes; never ext-gen*. */
export async function buildStableSelector(
  el: ElementHandle<Element>,
): Promise<{ selector: string; label: string; value: string }> {
  // String pageFunction avoids tsx `__name` helper leaking into browser.
  const data = (await el.evaluate(BUILD_STABLE_FROM_NODE)) as StableMeta;

  let selector = "";
  if (data.name) {
    selector = `${data.tag}[name=${JSON.stringify(data.name)}]`;
  } else if (data.id && !EXT_GEN.test(data.id)) {
    selector = `#${data.id.replace(/(:|\.|\[|\]|,|=)/g, "\\$1")}`;
  } else if (data.aria) {
    selector = `${data.tag}[aria-label=${JSON.stringify(data.aria)}]`;
  } else if (data.placeholder) {
    selector = `${data.tag}[placeholder=${JSON.stringify(data.placeholder)}]`;
  } else if (data.label) {
    // Fallback: stored as label: for getByLabel / text sibling resolution
    selector = `label:${data.label}`;
  } else {
    selector = data.tag;
  }

  return {
    selector,
    label: data.label || data.name || data.aria || data.placeholder || data.tag,
    value: data.value,
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
 * Returns stable selector + sample value.
 */
export async function waitForTeachClick(
  page: Page,
  opts?: { timeoutMs?: number },
): Promise<{ selector: string; label: string; value: string }> {
  const timeoutMs = opts?.timeoutMs ?? 180_000;
  console.log(
    "[teach] Klik KIRI sekali pada elemen di SIMRS (klik kanan tidak perlu)…",
  );

  await page.evaluate(TEACH_INJECT_CLICK);

  // Also inject into child frames (best-effort)
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
        .catch(() => undefined)) as { x: number; y: number } | undefined;
      if (!point || typeof point.x !== "number" || typeof point.y !== "number") {
        continue;
      }

      // String evaluate avoids __name; serialize coords into expression.
      const handle = await ctx
        .evaluateHandle(
          `(() => document.elementFromPoint(${Number(point.x)}, ${Number(point.y)}))()`,
        )
        .catch(() => null);

      if (!handle) continue;
      const el = handle.asElement();
      if (!el) {
        await handle.dispose().catch(() => undefined);
        continue;
      }

      const built = await buildStableSelector(el);
      if (isDangerousTeachTarget(built.label, built.value)) {
        throw new Error(
          `Elemen berbahaya tidak boleh diajar: ${built.label}. Pilih field input, bukan Simpan/Hapus.`,
        );
      }
      console.log(
        `[teach] terekam label="${built.label}" selector=${built.selector} value=${built.value.slice(0, 40)}`,
      );
      return built;
    }
    await sleep(200);
  }
  throw new Error("Timeout menunggu klik ajar elemen");
}

export async function readBySelector(
  page: Page,
  selector: string,
): Promise<string> {
  if (selector.startsWith("label:")) {
    const label = selector.slice("label:".length);
    const byLabel = page.getByLabel(label, { exact: false }).first();
    if ((await byLabel.count()) > 0) {
      return (
        (await byLabel.inputValue().catch(() => "")) ||
        ((await byLabel.innerText().catch(() => "")) || "").trim()
      );
    }
    const text = page.getByText(label, { exact: false }).first();
    const input = text.locator(
      "xpath=following::input[1] | following::textarea[1] | following::select[1]",
    );
    if ((await input.count()) > 0) {
      return (
        (await input.first().inputValue().catch(() => "")) ||
        ((await input.first().innerText().catch(() => "")) || "").trim()
      );
    }
    throw new Error(`element_not_found: label ${label}`);
  }

  // Search main + frames
  const frames = [page.mainFrame(), ...page.frames()];
  for (const frame of frames) {
    const loc = frame.locator(selector).first();
    if ((await loc.count()) === 0) continue;
    const visible = await loc.isVisible().catch(() => false);
    if (!visible) continue;
    const val =
      (await loc.inputValue().catch(() => "")) ||
      ((await loc.innerText().catch(() => "")) || "").trim();
    return val;
  }
  throw new Error(`element_not_found: ${selector}`);
}

export async function clickButtonByText(page: Page, text: string) {
  // Exact-ish match for short labels like ERM
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
