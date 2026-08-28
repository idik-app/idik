import assert from "node:assert/strict";
import test from "node:test";
import {
  hasDuplicateRmOnDate,
  listCathlabRuanganLabels,
  mergeTindakanRowsForDupCheck,
  normalizeRmForCompare,
  pickDefaultCathlabRuangan,
} from "./tindakanRmDateDuplicate";

test("normalizeRmForCompare strips leading zeros", () => {
  assert.equal(normalizeRmForCompare("01234"), "1234");
  assert.equal(normalizeRmForCompare("1234"), "1234");
  assert.equal(normalizeRmForCompare(""), "");
});

test("hasDuplicateRmOnDate matches normalized RM", () => {
  const rows = [{ id: "a", no_rm: "01234", tanggal: "2026-08-28" }];
  assert.equal(hasDuplicateRmOnDate(rows, "1234", "2026-08-28"), true);
  assert.equal(hasDuplicateRmOnDate(rows, "9999", "2026-08-28"), false);
  assert.equal(hasDuplicateRmOnDate(rows, "1234", "2026-08-29"), false);
  assert.equal(hasDuplicateRmOnDate(rows, "", "2026-08-28"), false);
});

test("pickDefaultCathlabRuangan and list labels", () => {
  const options = [
    {
      id: "2",
      nama: "Cathlab 2",
      kode: "B",
      kategori: "Cathlab",
      aktif: true,
    },
    {
      id: "1",
      nama: "Cathlab 1",
      kode: "A",
      kategori: "Cathlab",
      aktif: true,
    },
    { id: "3", nama: "ICU", kode: null, kategori: "ICU", aktif: true },
  ];
  const labels = listCathlabRuanganLabels(options);
  assert.equal(labels.length, 2);
  assert.equal(pickDefaultCathlabRuangan(options), labels[0]);
});

test("mergeTindakanRowsForDupCheck dedupes by id", () => {
  const merged = mergeTindakanRowsForDupCheck(
    [{ id: "x", no_rm: "1", tanggal: "2026-01-01" }],
    [
      { id: "x", no_rm: "1", tanggal: "2026-01-01" },
      { id: "y", no_rm: "2", tanggal: "2026-01-02" },
    ],
  );
  assert.equal(merged.length, 2);
});
