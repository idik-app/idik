# Generate data rows for wireframe-rekapitulasi-pasien-iccu.md (Jan-Apr filled)

from pathlib import Path

OUT = Path(__file__).resolve().parent / "_iccu_wireframe_rows.txt"

LABEL_INNER = 39  # leading space + 39 => 40-char label cell


def cell(v):
    if v is None or v == "":
        return "   "
    if isinstance(v, float):
        s = f"{v:.1f}"
        return s.rjust(3)[:3]
    s = str(v)
    if len(s) > 3:
        return s[:3]
    return s.rjust(3)


def fmt_no(n):
    if n is None:
        return "    "
    if isinstance(n, str):
        return n.ljust(4)[:4]
    if n < 10:
        return f" {n}  "
    return f" {n} "


def lbl(text):
    return " " + text[:LABEL_INNER].ljust(LABEL_INNER)


def row(no, label, jan, feb, mar, apr, total):
    mo = [jan, feb, mar, apr] + [None] * 8
    cells = [cell(x) for x in mo]
    tot = str(total).rjust(7) if total is not None else "       "
    return "|" + fmt_no(no) + "|" + lbl(label) + "|" + "|".join(cells) + "|" + tot + "|"


def main():
    rows = []

    rows.append(row(1, "UMUM / BAYAR", 18, 22, 19, 21, 80))
    rows.append(row(2, "BPJS PBI", 45, 48, 52, 46, 191))
    rows.append(row(None, "NPBI 1", 12, 11, 13, 12, 48))
    rows.append(row(None, "NPBI 2", 8, 9, 7, 8, 32))
    rows.append(row(None, "NPBI 3", 5, 6, 5, 6, 22))
    rows.append(row(3, "R / JKS", 14, 15, 13, 14, 56))
    rows.append(row(4, "LAIN-LAIN / ASURANSI", 3, 4, 2, 3, 12))
    rows.append(row(None, "", 105, 115, 111, 110, 441))

    men_tot = [2, 3, 2, 4]
    men_lt = [1, 2, 1, 2]
    men_gt = [men_tot[i] - men_lt[i] for i in range(4)]

    rows.append(row(1, "JUMLAH PASIEN MENINGGAL", *men_tot, sum(men_tot)))
    rows.append(row(None, "    < 48 JAM", *men_lt, sum(men_lt)))
    rows.append(row(None, "    > 48 JAM", *men_gt, sum(men_gt)))
    rows.append(row(2, "JUMLAH PASIEN DIRUJUK", 5, 6, 5, 7, 23))
    rows.append(row(3, "JUMLAH PASIEN PULANG PAKSA", 1, 0, 1, 1, 3))
    rows.append(row(4, "JUMLAH PASIEN DENGAN VENTILATOR", 12, 14, 11, 13, 50))
    rows.append(row(5, "JUMLAH PASIEN CVC", 18, 19, 17, 20, 74))
    rows.append(row(6, "JUMLAH PASIEN PDT", 4, 5, 4, 5, 18))
    rows.append(row(7, "JUMLAH PASIEN KRS", 9, 10, 8, 11, 38))
    rows.append(row(8, "JUMLAH PASIEN PINDAH RUANGAN", 3, 2, 4, 3, 12))
    rows.append(row(9, "JUMLAH PASIEN KRS (SEMUA KONDISI)", 11, 12, 10, 13, 46))
    rows.append(row(10, "JUMLAH PASIEN MASIH DALAM PERAWATAN", 8, 9, 8, 10, 35))
    rows.append(row(11, "JUMLAH HARI PERAWATAN", 142, 156, 148, 162, 608))
    rows.append(row(12, "JUMLAH PASIEN KEMBALI < 72 JAM", 2, 1, 2, 2, 7))
    rows.append(row(13, "JUMLAH PASIEN PERAWATAN > 7 HARI", 15, 16, 14, 17, 62))
    rows.append(row(14, "JUMLAH PASIEN DCA / PTCA", 6, 7, 6, 8, 27))
    rows.append(row(15, "JUMLAH PASIEN TROMBOLITIK", 4, 3, 5, 4, 16))
    rows.append(row(16, "JUMLAH PASIEN TPM", 2, 2, 3, 2, 9))
    rows.append(row(17, "JUMLAH PASIEN PPM", 1, 1, 2, 1, 5))
    rows.append(row(18, "JUMLAH PASIEN PERIKARDIOSENTESIS", 0, 1, 0, 1, 2))
    rows.append(row(19, "JUMLAH PASIEN ABLASI", 5, 6, 5, 7, 23))

    mean_bor = (85 + 82 + 79 + 88) // 4
    rows.append(row(1, "BOR (%)", 85, 82, 79, 88, mean_bor))
    rows.append(row(2, "ALOS", 4.2, 4.5, 4.1, 4.4, None))
    rows.append(row(3, "TOI", 15, 14, 16, 13, 58))
    rows.append(row(4, "BTO", 42, 38, 41, 40, 161))
    rows.append(row(5, "NDR", 2.1, 1.8, 2.4, 2.0, None))
    rows.append(row(6, "GDR", 4.5, 4.2, 4.8, 4.4, None))

    rows.append(row(1, "STEMI", 14, 16, 13, 15, 58))
    rows.append(row(2, "NSTEMI", 9, 11, 10, 12, 42))
    rows.append(row(3, "UAP", 7, 8, 6, 9, 30))
    rows.append(row(4, "SVT", 4, 5, 4, 6, 19))
    rows.append(row(5, "DC", 6, 7, 6, 8, 27))
    rows.append(row(6, "HT", 18, 19, 17, 20, 74))
    rows.append(row(7, "AV BLOCK", 3, 4, 3, 5, 15))
    rows.append(row(8, "AF", 11, 12, 10, 13, 46))
    rows.append(row(9, "NON CARDIO", 22, 21, 23, 24, 90))

    for line in rows:
        assert len(line) == 103, (len(line), line[:75])

    text = "\n".join(rows)
    OUT.write_text(text + "\n", encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
