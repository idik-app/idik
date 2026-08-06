from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from playwright.sync_api import Browser, BrowserContext, Page, sync_playwright

from .config import config

STORAGE_PATH = lambda: config.artifacts_dir / "storageState-idik-py.json"


@contextmanager
def idik_browser(
    storage_state: Path | None = None,
) -> Iterator[tuple[Browser, BrowserContext, Page]]:
    config.ensure_dirs()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=config.headless)
        ctx_opts: dict = {}
        if storage_state and storage_state.exists():
            ctx_opts["storage_state"] = str(storage_state)
        context = browser.new_context(**ctx_opts)
        page = context.new_page()

        def _dismiss(dialog) -> None:
            try:
                dialog.dismiss()
            except Exception:
                pass

        page.on("dialog", _dismiss)
        try:
            yield browser, context, page
        finally:
            browser.close()


def login_idik_playwright() -> Path:
    """Login via UI; return path to storage state."""
    if not config.idik_user or not config.idik_pass:
        raise RuntimeError("IDIK_USER / IDIK_PASS wajib di .env")

    with idik_browser() as (_browser, context, page):
        page.goto(config.idik_base_url, wait_until="domcontentloaded")
        user = page.locator('input[name="username"]')
        user.wait_for(timeout=45_000)
        user.fill(config.idik_user)
        page.locator('input[name="password"]').fill(config.idik_pass)
        page.locator('button[type="submit"], button:has-text("Login")').first.click()
        page.wait_for_url("**/dashboard**", timeout=60_000)
        path = STORAGE_PATH()
        config.ensure_dirs()
        context.storage_state(path=str(path))
        cookies = context.cookies()
        if not any(c.get("name") == "session" for c in cookies):
            raise RuntimeError("Playwright login: cookie session hilang")
        return path
