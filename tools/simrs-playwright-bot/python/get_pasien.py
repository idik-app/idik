from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any, Literal, TypedDict
from urllib.parse import quote

import requests

from .config import BOT_ROOT, config


class SimrsPasienData(TypedDict, total=False):
    id: str
    norm: str
    nik: str
    nama: str
    alamat: str
    jenkel: str
    tgl_lhr: str
    kota: str


class GetPasienOk(TypedDict):
    ok: Literal[True]
    data: SimrsPasienData
    ms: int
    source: Literal["api", "mock"]


class GetPasienErr(TypedDict, total=False):
    ok: Literal[False]
    error: str
    status: int
    ms: int


GetPasienResult = GetPasienOk | GetPasienErr


def format_tanggal_lahir(raw: Any) -> str:
    if raw is None or raw == "":
        return ""
    s = str(raw).strip()
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    if re.match(r"^\d{4}-\d{2}-\d{2}T", s):
        return s[:10]
    m = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", s)
    if m:
        d, mo, y = m.group(1), m.group(2), m.group(3)
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    return s


def get_pasien(norm: str) -> GetPasienResult:
    clean = str(norm or "").strip()
    if not clean:
        return {"ok": False, "error": "No. RM kosong", "ms": 0}

    if config.simrs_mock_path:
        full = Path(config.simrs_mock_path)
        if not full.is_absolute():
            full = BOT_ROOT / config.simrs_mock_path
        t0 = time.perf_counter()
        try:
            payload = json.loads(full.read_text(encoding="utf-8"))
        except OSError as e:
            return {
                "ok": False,
                "error": f"Mock tidak bisa dibaca: {e}",
                "ms": int((time.perf_counter() - t0) * 1000),
            }
        ms = int((time.perf_counter() - t0) * 1000)
        data = payload.get("data")
        if payload.get("status") == "Ok" and data:
            return {"ok": True, "data": data, "ms": ms, "source": "mock"}
        return {"ok": False, "error": "Mock invalid", "ms": ms}

    url = f"{config.simrs_get_pasien_url}/{quote(clean, safe='')}"
    t0 = time.perf_counter()
    try:
        res = requests.get(url, timeout=5)
    except requests.RequestException as e:
        ms = int((time.perf_counter() - t0) * 1000)
        msg = str(e)
        if "timed out" in msg.lower() or "timeout" in msg.lower():
            msg = "timeout — jalankan di LAN/VPN/WiFi RS"
        return {"ok": False, "error": msg, "ms": ms}

    ms = int((time.perf_counter() - t0) * 1000)
    try:
        body = res.json()
    except ValueError:
        return {
            "ok": False,
            "error": f"Response bukan JSON (HTTP {res.status_code})",
            "status": res.status_code,
            "ms": ms,
        }

    code = body.get("code")
    if res.status_code == 404 or code == 404:
        return {
            "ok": False,
            "error": body.get("message") or "Data tidak ditemukan (404)",
            "status": 404,
            "ms": ms,
        }

    data = body.get("data") or {}
    if body.get("status") == "Ok" and data.get("norm"):
        return {"ok": True, "data": data, "ms": ms, "source": "api"}

    return {
        "ok": False,
        "error": body.get("message") or f"SIMRS status {res.status_code}",
        "status": res.status_code,
        "ms": ms,
    }


def safe_patient_summary(data: SimrsPasienData) -> str:
    norm = str(data.get("norm") or "")
    nama = str(data.get("nama") or "")
    return f"norm={norm} nama={nama[:24]}{'…' if len(nama) > 24 else ''}"
