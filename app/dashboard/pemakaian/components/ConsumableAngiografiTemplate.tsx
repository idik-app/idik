"use client";

import type { TemplateChecklistRow } from "@/app/dashboard/pemakaian/data/templateInputBarangRows";

const idrFmt = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function fmtHarga(n: number | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return idrFmt.format(n);
}

function splitTemplateSlots(raw: string, slots: number): string[] {
  const parts = (raw ?? "").split("|");
  return Array.from({ length: slots }, (_, i) => (parts[i] ?? "").trim());
}

function isTemplateRowFilled(raw: string | undefined, slots: number): boolean {
  return splitTemplateSlots(raw ?? "", slots).some((p) => p.length > 0);
}

/** Gabungkan slot terisi untuk cetak (hanya bagian yang ada isinya). */
function formatTemplateSlotsForPrint(raw: string | undefined, slots: number): string {
  const parts = splitTemplateSlots(raw ?? "", slots);
  const filled = parts.filter((p) => p.length > 0);
  if (filled.length === 0) return "—";
  return filled.join(" · ");
}

/** Payload ringkas agar komponen bebas dari import halaman. */
export type ConsumableAngiografiOrderPayload = {
  id: string;
  tanggal: string;
  pasien: string;
  ruangan: string;
  dokter: string;
  depo: string;
  status: string;
  catatan?: string;
  items: {
    barang: string;
    distributor?: string;
    lot?: string;
    ukuran?: string;
    ed?: string;
    harga?: number;
    qtyRencana: number;
    qtyDipakai: number;
    tipe: "BARU" | "REUSE";
  }[];
  /** Isian checklist (id baris → nilai dipisah "|"). */
  templateInputBarang?: {
    obatAlkes: Record<string, string>;
    komponen: Record<string, string>;
  };
  /** Definisi baris template saat cetak (urutan & label). */
  templateRowsObatAlkes?: TemplateChecklistRow[];
  templateRowsKomponen?: TemplateChecklistRow[];
};

function isStrukLineFilled(
  line: ConsumableAngiografiOrderPayload["items"][0],
): boolean {
  if (String(line.barang ?? "").trim()) return true;
  if ((line.qtyRencana ?? 0) > 0 || (line.qtyDipakai ?? 0) > 0) return true;
  if (String(line.distributor ?? "").trim()) return true;
  if (String(line.lot ?? "").trim()) return true;
  if (String(line.ukuran ?? "").trim()) return true;
  if (String(line.ed ?? "").trim()) return true;
  if (line.harga != null && Number.isFinite(line.harga) && line.harga > 0) {
    return true;
  }
  return false;
}

/** Judul daftar — sama dengan PemakaianPrintTable */
function listTitleForMode(mode: "RESEP" | "PEMAKAIAN"): string {
  return mode === "RESEP"
    ? "Daftar Resep / Order Alkes"
    : "Daftar Pemakaian Alkes";
}

/**
 * Lembar cetak detail order: format header & tabel ringkasan sama dengan "Daftar Pemakaian Alkes",
 * lalu tabel rincian barang (struk) / CONSUMABLE ANGIOGRAFI.
 */
export function ConsumableAngiografiPrintTemplate({
  order,
  mode = "PEMAKAIAN",
}: {
  order: ConsumableAngiografiOrderPayload;
  /** Sama dengan mode tampilan halaman (RESEP / PEMAKAIAN) */
  mode?: "RESEP" | "PEMAKAIAN";
}) {
  const printedAt = new Date().toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const listTitle = listTitleForMode(mode);

  const strukFilled = order.items.filter(isStrukLineFilled);
  const obatRows = order.templateRowsObatAlkes ?? [];
  const komRows = order.templateRowsKomponen ?? [];
  const obatVal = order.templateInputBarang?.obatAlkes ?? {};
  const komVal = order.templateInputBarang?.komponen ?? {};
  const obatFilled = obatRows.filter((r) =>
    isTemplateRowFilled(obatVal[r.id], r.slots),
  );
  const komFilled = komRows.filter((r) =>
    isTemplateRowFilled(komVal[r.id], r.slots),
  );

  return (
    <div className="text-[10px] text-black">
      {/* —— Sama dengan PemakaianPrintTable —— */}
      <h1 className="text-base font-bold text-black">IDIK-App — {listTitle}</h1>
      <p className="text-gray-700 mt-1">
        Detail order — Struk (master), checklist Obat/Alkes &amp; Komponen cathlab
        (hanya isian terisi) · CONSUMABLE ANGIOGRAFI · Mode: {mode} · Dicetak:{" "}
        {printedAt}
      </p>

      <table className="mt-3 w-full border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              ID Order
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Tanggal
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Pasien
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Ruangan
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Dokter
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Depo
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 px-1.5 py-0.5">{order.id}</td>
            <td className="border border-gray-400 px-1.5 py-0.5">
              {order.tanggal}
            </td>
            <td className="border border-gray-400 px-1.5 py-0.5">
              {order.pasien}
            </td>
            <td className="border border-gray-400 px-1.5 py-0.5">
              {order.ruangan || "—"}
            </td>
            <td className="border border-gray-400 px-1.5 py-0.5">
              {order.dokter}
            </td>
            <td className="border border-gray-400 px-1.5 py-0.5">{order.depo}</td>
            <td className="border border-gray-400 px-1.5 py-0.5">
              {order.status}
            </td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-4 text-base font-bold text-black">
        Struk (master)
      </h2>
      <p className="text-gray-700 mt-1">
        {strukFilled.length} baris terisi
        {order.items.length > strukFilled.length
          ? ` (${order.items.length} baris total di order; baris kosong tidak dicetak)`
          : ""}
        . Kolom selaras layar Daftar / Edit order.
      </p>

      <table className="mt-2 w-full border-collapse border border-gray-400">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold w-[28px]">
              No
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold min-w-[100px]">
              Barang
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
              Distributor
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold">
              Ukuran
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold">
              LOT
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold">
              ED
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-right font-semibold">
              Harga
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold">
              Resep
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold">
              Stok
            </th>
            <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold">
              Tipe
            </th>
          </tr>
        </thead>
        <tbody>
          {order.items.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="border border-gray-400 px-2 py-2 text-center text-gray-600"
              >
                Tidak ada rincian barang
              </td>
            </tr>
          ) : strukFilled.length === 0 ? (
            <tr>
              <td
                colSpan={10}
                className="border border-gray-400 px-2 py-2 text-center text-gray-600"
              >
                Tidak ada baris struk yang berisi data (nama barang, qty, LOT,
                dll.)
              </td>
            </tr>
          ) : (
            strukFilled.map((line, i) => (
              <tr key={`${line.barang}-${i}`}>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center tabular-nums">
                  {i + 1}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {line.barang || "—"}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5">
                  {line.distributor ?? "—"}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center">
                  {line.ukuran ?? "—"}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center font-mono text-[9px]">
                  {line.lot ?? "—"}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center">
                  {line.ed ?? "—"}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-right tabular-nums whitespace-nowrap">
                  {fmtHarga(line.harga)}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center tabular-nums">
                  {line.qtyRencana}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center tabular-nums">
                  {line.qtyDipakai}
                </td>
                <td className="border border-gray-400 px-1.5 py-0.5 text-center">
                  {line.tipe}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {obatFilled.length > 0 ? (
        <>
          <h2 className="mt-5 text-base font-bold text-black print:break-inside-avoid">
            Obat / Alkes (checklist — terisi)
          </h2>
          <p className="text-gray-700 mt-1">
            {obatFilled.length} item dengan isian.
          </p>
          <table className="mt-2 w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold w-[28px]">
                  No
                </th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
                  Item
                </th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
                  Jumlah / isian
                </th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold w-[120px]">
                  Ket.
                </th>
              </tr>
            </thead>
            <tbody>
              {obatFilled.map((row, i) => (
                <tr key={row.id}>
                  <td className="border border-gray-400 px-1.5 py-0.5 text-center tabular-nums">
                    {i + 1}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-0.5">
                    {row.label}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-0.5">
                    {formatTemplateSlotsForPrint(obatVal[row.id], row.slots)}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-0.5 text-gray-800">
                    {row.catatan?.trim() ? row.catatan : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {komFilled.length > 0 ? (
        <>
          <h2 className="mt-5 text-base font-bold text-black print:break-inside-avoid">
            Komponen cathlab (checklist — terisi)
          </h2>
          <p className="text-gray-700 mt-1">
            {komFilled.length} item dengan isian.
          </p>
          <table className="mt-2 w-full border-collapse border border-gray-400">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-1.5 py-1 text-center font-semibold w-[28px]">
                  No
                </th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
                  Item
                </th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold">
                  Jumlah / isian
                </th>
                <th className="border border-gray-400 px-1.5 py-1 text-left font-semibold w-[120px]">
                  Ket.
                </th>
              </tr>
            </thead>
            <tbody>
              {komFilled.map((row, i) => (
                <tr key={row.id}>
                  <td className="border border-gray-400 px-1.5 py-0.5 text-center tabular-nums">
                    {i + 1}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-0.5">
                    {row.label}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-0.5">
                    {formatTemplateSlotsForPrint(komVal[row.id], row.slots)}
                  </td>
                  <td className="border border-gray-400 px-1.5 py-0.5 text-gray-800">
                    {row.catatan?.trim() ? row.catatan : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {order.catatan?.trim() ? (
        <p className="mt-3 text-[10px] text-black">
          <span className="font-semibold">Catatan ke Depo / farmasi:</span>{" "}
          {order.catatan}
        </p>
      ) : null}

      <p className="mt-3 text-gray-700">
        IDIK-App · {printedAt} · Struk terisi: {strukFilled.length} · Obat/Alkes
        terisi: {obatFilled.length} · Komponen terisi: {komFilled.length}
      </p>

      <div className="mt-8 grid grid-cols-2 gap-10 print:mt-10">
        <div>
          <div className="h-12 border-b border-gray-400" />
          <p className="text-center text-gray-700 mt-1">Petugas / perawat</p>
        </div>
        <div>
          <div className="h-12 border-b border-gray-400" />
          <p className="text-center text-gray-700 mt-1">
            Dokter / penanggung jawab tindakan
          </p>
        </div>
      </div>
    </div>
  );
}
