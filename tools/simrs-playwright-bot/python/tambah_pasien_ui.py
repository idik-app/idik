from __future__ import annotations

import re

from playwright.sync_api import Page, expect

from .config import config
from .map_payload import IdikPasienPayload

_RE_TAMBAH = re.compile(r"Tambah Pasien", re.I)
_RE_SIMPAN = re.compile(r"Simpan", re.I)


def fill_tambah_pasien_ui(page: Page, payload: IdikPasienPayload) -> None:
    """Mode B: isi modal Tambah Pasien di UI idik (mirror TS + tahan race lookup Vercel)."""
    page.goto(
        f"{config.idik_base_url}/dashboard/layanan/tindakan",
        wait_until="domcontentloaded",
    )
    page.get_by_role("button", name=_RE_TAMBAH).first.click()
    page.get_by_text("Tambah Pasien", exact=False).first.wait_for(timeout=15_000)

    def fill_by_name(name: str, value: str) -> None:
        loc = page.locator(f'[name="{name}"]').first
        if loc.count() == 0:
            return
        loc.fill("")
        loc.fill(value)

    fill_by_name("noRM", payload["noRM"])

    # Tunggu lookup No. RM di form selesai (tombol Simpan tidak disabled / rmChecking)
    simpan = page.get_by_role("button", name=_RE_SIMPAN).first
    expect(simpan).to_be_enabled(timeout=30_000)

    # Timpa ulang dari getPasien LAN — abaikan 404/error lookup Vercel
    fill_by_name("nama", payload["nama"])
    fill_by_name("tanggalLahir", payload["tanggalLahir"])
    fill_by_name("alamat", payload["alamat"])

    jk = page.locator('[name="jenisKelamin"]').first
    if jk.count() > 0:
        jk.select_option(payload["jenisKelamin"])

    expect(simpan).to_be_enabled(timeout=10_000)
    simpan.click()
    page.wait_for_timeout(1500)
