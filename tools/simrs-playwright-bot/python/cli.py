from __future__ import annotations

import argparse
import json
import sys
import time

import requests

from .config import config
from .get_pasien import get_pasien, safe_patient_summary
from .idik_login_ui import idik_browser, login_idik_playwright
from .map_payload import map_simrs_to_idik_payload, payload_for_log
from .tambah_pasien_ui import fill_tambah_pasien_ui


def _probe(url: str, timeout: float = 5.0) -> dict:
    t0 = time.perf_counter()
    try:
        res = requests.get(url, timeout=timeout, allow_redirects=True)
        ms = int((time.perf_counter() - t0) * 1000)
        ok = res.status_code < 500
        return {
            "ok": ok,
            "ms": ms,
            "error": None if ok else f"HTTP {res.status_code}",
        }
    except requests.RequestException as e:
        ms = int((time.perf_counter() - t0) * 1000)
        msg = str(e)
        if "timed out" in msg.lower() or "timeout" in msg.lower():
            msg = "timeout — jalankan di LAN/VPN/WiFi RS"
        return {"ok": False, "ms": ms, "error": msg}


def cmd_preflight(_: argparse.Namespace) -> int:
    sample = f"{config.simrs_get_pasien_url}/0"
    get_p = (
        {"ok": True, "ms": 0, "error": None}
        if config.simrs_mock_path
        else _probe(sample)
    )
    idik = _probe(config.idik_base_url)
    print("preflight:")
    print(
        f"  getPasien: {'OK' if get_p['ok'] else 'FAIL'}"
        f" ({get_p['ms']}ms)"
        + (f" — {get_p['error']}" if get_p.get("error") else "")
    )
    if config.simrs_mock_path:
        print(f"    (mock: {config.simrs_mock_path})")
    print(
        f"  idik:      {'OK' if idik['ok'] else 'FAIL'}"
        f" ({idik['ms']}ms)"
        + (f" — {idik['error']}" if idik.get("error") else "")
    )
    return 0 if get_p["ok"] and idik["ok"] else 1


def _fetch_and_map(norm: str) -> tuple[int, dict | None]:
    gp = get_pasien(norm)
    if not gp["ok"]:
        print(f"getPasien FAIL: {gp['error']}", file=sys.stderr)
        return (2 if gp.get("status") == 404 else 1), None

    payload = map_simrs_to_idik_payload(gp["data"])
    print(
        f"Mapped {safe_patient_summary(gp['data'])} "
        f"source={gp['source']} ({gp['ms']}ms)"
    )
    print("Payload (tanpa NIK):")
    print(json.dumps(payload_for_log(payload), indent=2, ensure_ascii=False))
    return 0, payload


def cmd_get(args: argparse.Namespace) -> int:
    code, _ = _fetch_and_map(args.norm)
    return code


def cmd_add(args: argparse.Namespace) -> int:
    code, payload = _fetch_and_map(args.norm)
    if code != 0 or payload is None:
        return code

    if not args.write:
        print("Dry-run: akan isi UI Tambah Pasien (tambah --write untuk menulis)")
        return 0

    print("Login idik via Playwright…")
    try:
        storage = login_idik_playwright()
    except Exception as e:
        print(f"Login idik gagal: {e}", file=sys.stderr)
        return 1

    print("Isi form Tambah Pasien…")
    try:
        with idik_browser(storage) as (_b, _c, page):
            fill_tambah_pasien_ui(page, payload)
    except Exception as e:
        print(f"Isi form gagal: {e}", file=sys.stderr)
        return 1

    print("OK — form disimpan via UI Playwright")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m python.cli",
        description="SIMRS getPasien + Playwright isi form idik",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_pre = sub.add_parser("preflight", help="Probe getPasien + idik")
    p_pre.set_defaults(func=cmd_preflight)

    p_get = sub.add_parser("get", help="Ambil getPasien + map (dry-run)")
    p_get.add_argument("--norm", required=True, help="No. RM")
    p_get.set_defaults(func=cmd_get)

    p_add = sub.add_parser(
        "add",
        help="getPasien + isi Tambah Pasien UI (butuh --write untuk Simpan)",
    )
    p_add.add_argument("--norm", required=True, help="No. RM")
    p_add.add_argument(
        "--write",
        action="store_true",
        help="Login idik + isi form + klik Simpan",
    )
    p_add.set_defaults(func=cmd_add)

    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
