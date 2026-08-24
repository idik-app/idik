/** Teks clipboard WhatsApp untuk jadwal tindakan elektif Cath Lab. */

export type JadwalElektifWaRow = {
  nama_pasien?: string | null;
  nama?: string | null;
  no_rm?: string | null;
  kelas_pembiayaan?: string | null;
  diagnosa?: string | null;
  tindakan?: string | null;
  dokter?: string | null;
  hasil_lab_ppm?: string | null;
  waktu?: string | null;
  ruangan?: string | null;
};

const HARI_ID = [
  "minggu",
  "senin",
  "selasa",
  "rabu",
  "kamis",
  "jumat",
  "sabtu",
] as const;

const BULAN_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

function dash(v: unknown): string {
  const t = String(v ?? "").trim();
  return t || "-";
}

function namaPasien(row: JadwalElektifWaRow): string {
  return dash(row.nama_pasien || row.nama);
}

export function sapaanWib(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hour <= 10) return "Selamat pagi";
  if (hour <= 14) return "Selamat siang";
  if (hour <= 17) return "Selamat sore";
  return "Selamat malam";
}

export function formatTanggalFilterId(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(`${ymd}T12:00:00+07:00`);
  const hari = HARI_ID[dt.getUTCDay()] ?? "senin";
  const bulan = BULAN_ID[mo - 1] ?? m[2];
  return `${hari}, ${d} ${bulan} ${y}`;
}

export function rowSiapWhatsApp(row: JadwalElektifWaRow): boolean {
  return Boolean(
    String(row.nama_pasien || row.nama || "").trim() ||
      String(row.no_rm || "").trim(),
  );
}

export function buildJadwalElektifWhatsApp(args: {
  tanggalYmd: string;
  rows: JadwalElektifWaRow[];
  now?: Date;
}): string {
  const ready = args.rows.filter(rowSiapWhatsApp);
  const n = ready.length;
  const lines: string[] = [
    `*${sapaanWib(args.now)}, dokter.*`,
    "",
    "Izin menyampaikan *Jadwal Tindakan Elektif*",
    `_${formatTanggalFilterId(args.tanggalYmd)}_ · *${n} pasien*`,
    "",
    "━━━━━━━━━━━━━━━━",
    "",
  ];

  ready.forEach((row, i) => {
    lines.push(`*${i + 1}. ${namaPasien(row)}*`);
    lines.push(`_No RM_ : \`${dash(row.no_rm)}\``);
    lines.push(`_BPJS_ : *${dash(row.kelas_pembiayaan)}*`);
    lines.push(`_Diagnosa_ : _${dash(row.diagnosa)}_`);
    lines.push(`_Tindakan_ : *${dash(row.tindakan)}*`);
    lines.push(`_Operator_ : ${dash(row.dokter)}`);
    lines.push(`_Lab_ : \`${dash(row.hasil_lab_ppm)}\``);
    lines.push(`_Jam_ : ${dash(row.waktu)}`);
    lines.push(`_Ruang_ : ${dash(row.ruangan)}`);
    lines.push("");
  });

  lines.push("━━━━━━━━━━━━━━━━");
  lines.push("_terima kasih_ 🙏🏻");
  return lines.join("\n");
}
