import assert from "node:assert/strict";
import test from "node:test";
import {
  cathlabRowNeedsCompletenessBadge,
  cathlabRowShouldShowInMainTable,
  isCathlabIdentity,
} from "./cathlabRowVisibility";

test("isCathlabIdentity matches kategori or ruangan", () => {
  assert.equal(isCathlabIdentity({ kategori: "Cathlab", ruangan: "SAFIR" }), true);
  assert.equal(isCathlabIdentity({ kategori: "", ruangan: "Cath Lab 1" }), true);
  assert.equal(isCathlabIdentity({ kategori: "Bedah", ruangan: "ICCU" }), false);
});

test("cathlabRowShouldShowInMainTable keeps identity rows even if Selesai without lab", () => {
  const row = {
    kategori: "Cathlab",
    ruangan: "SAFIR",
    tanggal: "2026-08-28",
    no_rm: "931678",
    nama_pasien: "SUPARMAN",
    status: "Selesai",
    diagnosa: "",
    hasil_lab_ppm: "",
  };
  assert.equal(cathlabRowShouldShowInMainTable(row), true);
  assert.equal(cathlabRowNeedsCompletenessBadge(row), true);
});

test("cathlabRowShouldShowInMainTable hides Cath Lab without RM/nama", () => {
  assert.equal(
    cathlabRowShouldShowInMainTable({
      kategori: "Cathlab",
      tanggal: "2026-08-28",
      no_rm: "",
      nama_pasien: "Pasien",
    }),
    false,
  );
});

test("non-cathlab rows always pass the table gate", () => {
  assert.equal(
    cathlabRowShouldShowInMainTable({
      kategori: "ICCU",
      ruangan: "ICCU",
      tanggal: "",
      no_rm: "",
      nama_pasien: "",
    }),
    true,
  );
});
