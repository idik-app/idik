"""Apply scripts/_iccu_wireframe_rows.txt numeric rows into wireframe md."""
from pathlib import Path

DOC = Path(__file__).resolve().parents[1] / "docs" / "wireframe-rekapitulasi-pasien-iccu.md"
DATA = Path(__file__).resolve().parent / "_iccu_wireframe_rows.txt"

data = DATA.read_text(encoding="utf-8").strip().splitlines()
assert len(data) == 44

lines = DOC.read_text(encoding="utf-8").splitlines()


def find(prefix: str, start: int = 0) -> int:
    for i in range(start, len(lines)):
        if lines[i].startswith(prefix):
            return i
    raise ValueError(prefix)


i_umum = find("| 1  | UMUM / BAYAR")
i_banner_a = find("| ■  JUMLAH TOTAL (summary Section A)")
i_sum_row = i_banner_a + 2

i_b0 = find("| 1  | JUMLAH PASIEN MENINGGAL")
i_b1 = find("| 19 | JUMLAH PASIEN ABLASI")

i_c0 = find("| 1  | BOR (%)")
i_c1 = find("| 6  | GDR")

i_d0 = find("| 1  | STEMI")
i_d1 = find("| 9  | NON CARDIO")

new_lines = (
    lines[:i_umum]
    + data[0:7]
    + lines[i_umum + 7 : i_sum_row]
    + [data[7]]
    + lines[i_sum_row + 1 : i_b0]
    + data[8:29]
    + lines[i_b1 + 1 : i_c0]
    + data[29:35]
    + lines[i_c1 + 1 : i_d0]
    + data[35:44]
    + lines[i_d1 + 1 :]
)

DOC.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
print("OK", DOC, "lines", len(lines), "->", len(new_lines))
