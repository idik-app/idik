from __future__ import annotations

from typing import Any, TypedDict

from .config import config
from .get_pasien import SimrsPasienData, format_tanggal_lahir


class IdikPasienPayload(TypedDict):
    noRM: str
    nama: str
    jenisKelamin: str
    tanggalLahir: str
    alamat: str
    noHP: str
    jenisPembiayaan: str
    kelasPerawatan: str
    asuransi: str


def map_simrs_to_idik_payload(data: SimrsPasienData) -> IdikPasienPayload:
    alamat_parts = [
        str(x or "").strip()
        for x in (data.get("alamat"), data.get("kota"))
    ]
    alamat = ", ".join(p for p in alamat_parts if p)
    jenkel_raw = str(data.get("jenkel") or "L").upper()
    jenkel = "P" if jenkel_raw.startswith("P") else "L"
    return {
        "noRM": str(data.get("norm") or "").strip(),
        "nama": str(data.get("nama") or "").strip(),
        "jenisKelamin": jenkel,
        "tanggalLahir": format_tanggal_lahir(data.get("tgl_lhr")),
        "alamat": alamat or "-",
        "noHP": "",
        "jenisPembiayaan": config.default_jenis_pembiayaan,
        "kelasPerawatan": config.default_kelas_perawatan,
        "asuransi": "",
    }


def payload_for_log(payload: IdikPasienPayload) -> dict[str, Any]:
    alamat = payload["alamat"]
    return {
        "noRM": payload["noRM"],
        "nama": payload["nama"],
        "jenisKelamin": payload["jenisKelamin"],
        "tanggalLahir": payload["tanggalLahir"],
        "alamat": alamat[:40] + ("…" if len(alamat) > 40 else ""),
        "jenisPembiayaan": payload["jenisPembiayaan"],
        "kelasPerawatan": payload["kelasPerawatan"],
    }
