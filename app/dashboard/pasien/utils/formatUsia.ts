export function hitungUsia(tanggalLahir: string) {
  if (!tanggalLahir) return { angka: 0, teks: "-" };

  const tglLahir = new Date(tanggalLahir);
  const sekarang = new Date();

  let usia = sekarang.getFullYear() - tglLahir.getFullYear();
  const bulan = sekarang.getMonth() - tglLahir.getMonth();
  const hari = sekarang.getDate() - tglLahir.getDate();

  if (bulan < 0 || (bulan === 0 && hari < 0)) usia--;

  const teks = `${usia} thn`;
  return { angka: usia, teks };
}
