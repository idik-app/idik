from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BOT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BOT_ROOT / ".env")


def _env(name: str, fallback: str = "") -> str:
    return (os.environ.get(name) or fallback).strip()


def _env_bool(name: str, fallback: bool) -> bool:
    v = os.environ.get(name)
    if v is None or v == "":
        return fallback
    return v.lower() not in ("0", "false", "no", "off")


class Config:
    def __init__(self) -> None:
        self.simrs_get_pasien_url = _env(
            "SIMRS_GET_PASIEN_URL",
            "http://10.250.10.107/apibdrs/apibdrs/getPasien",
        ).rstrip("/")
        self.simrs_mock_path = _env("SIMRS_GET_PASIEN_MOCK")
        self.idik_base_url = _env("IDIK_BASE_URL", "http://localhost:3000").rstrip(
            "/"
        )
        self.idik_user = _env("IDIK_USER")
        self.idik_pass = _env("IDIK_PASS")
        self.headless = _env_bool("HEADLESS", True)
        self.default_jenis_pembiayaan = _env("IDIK_DEFAULT_JENIS_PEMBIAYAAN", "Umum")
        self.default_kelas_perawatan = _env("IDIK_DEFAULT_KELAS_PERAWATAN", "Kelas 3")
        self.artifacts_dir = BOT_ROOT / "artifacts"

    def ensure_dirs(self) -> None:
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)


config = Config()
