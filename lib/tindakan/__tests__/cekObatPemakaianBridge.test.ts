/**
 * Unit tests for cek obat ↔ pemakaian bridge helpers.
 * Run with: npx tsx --test lib/tindakan/__tests__/cekObatPemakaianBridge.test.ts
 * (or any node:test runner that supports TS)
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPemakaianChecklistToCek,
  buildPrefillSlot,
  mergeObatAlkesPrefill,
  normalizeCekJam,
  parsePrefillSlot,
  parseQtyFromKet,
  sanitizeLogBarangKlinis,
  upsertLogFromCek,
} from "../cekObatPemakaianBridge";

describe("normalizeCekJam", () => {
  it("normalizes HH:mm", () => {
    assert.equal(normalizeCekJam("9:5"), "09:05");
    assert.equal(normalizeCekJam("10:30"), "10:30");
    assert.equal(normalizeCekJam(""), null);
    assert.equal(normalizeCekJam("99:99"), null);
  });
});

describe("buildPrefillSlot / parsePrefillSlot", () => {
  it("builds ket + jam", () => {
    assert.equal(buildPrefillSlot({ ket: "5000 IU", jam: "10:30" }), "5000 IU @ 10:30");
    assert.equal(buildPrefillSlot({ ket: "", jam: "10:30" }), "1 @ 10:30");
    assert.equal(buildPrefillSlot({ ket: "5000 IU", jam: "" }), "5000 IU");
    assert.equal(buildPrefillSlot({}), "1");
  });

  it("parses round-trip", () => {
    const p = parsePrefillSlot("5000 IU @ 10:30");
    assert.equal(p.ket, "5000 IU");
    assert.equal(p.jam, "10:30");
    const p2 = parsePrefillSlot("1 @ 08:00");
    assert.equal(p2.ket, null);
    assert.equal(p2.jam, "08:00");
  });
});

describe("mergeObatAlkesPrefill", () => {
  it("fills empty slot", () => {
    const r = mergeObatAlkesPrefill({ obatAlkes: {}, komponen: {} }, "oa-12", "1 @ 10:00");
    assert.equal(r.changed, true);
    assert.equal(r.template.obatAlkes["oa-12"], "1 @ 10:00");
  });

  it("does not overwrite manual value", () => {
    const r = mergeObatAlkesPrefill(
      { obatAlkes: { "oa-12": "manual" }, komponen: {} },
      "oa-12",
      "1 @ 10:00",
      "1",
    );
    assert.equal(r.changed, false);
  });

  it("refreshes previous auto prefill", () => {
    const r = mergeObatAlkesPrefill(
      { obatAlkes: { "oa-12": "1" }, komponen: {} },
      "oa-12",
      "5000 IU @ 10:30",
      "1",
    );
    assert.equal(r.changed, true);
    assert.equal(r.template.obatAlkes["oa-12"], "5000 IU @ 10:30");
  });
});

describe("applyPemakaianChecklistToCek", () => {
  it("sets checked and ket/jam when empty", () => {
    const patch = applyPemakaianChecklistToCek({
      kind: "heparin",
      slotValue: "5000 IU @ 10:30",
      current: {},
    });
    assert.ok(patch);
    assert.equal(patch!.cek_heparin, true);
    assert.equal(patch!.cek_heparin_ket, "5000 IU");
    assert.equal(patch!.cek_heparin_jam, "10:30");
  });

  it("does not overwrite filled fields", () => {
    const patch = applyPemakaianChecklistToCek({
      kind: "heparin",
      slotValue: "999 @ 11:00",
      current: {
        cek_heparin: true,
        cek_heparin_ket: "existing",
        cek_heparin_jam: "09:00",
      },
    });
    assert.equal(patch, null);
  });
});

describe("sanitizeLogBarangKlinis / parseQtyFromKet", () => {
  it("sanitizes array", () => {
    const items = sanitizeLogBarangKlinis([
      { id: "a", nama: "Heparin", jam: "10:30", keterangan: "x", oleh: "Ns" },
      { nama: "" },
    ]);
    assert.equal(items.length, 1);
    assert.equal(items[0].nama, "Heparin");
    assert.equal(items[0].jam, "10:30");
  });

  it("parses qty", () => {
    assert.equal(parseQtyFromKet("5000 IU"), 5000);
    assert.equal(parseQtyFromKet(""), 1);
  });
});

describe("upsertLogFromCek", () => {
  it("appends new heparin row", () => {
    const r = upsertLogFromCek({
      items: [],
      kind: "heparin",
      ket: "5000 IU",
      jam: "10:30",
      oleh: "Ns",
    });
    assert.equal(r.changed, true);
    assert.equal(r.items.length, 1);
    assert.equal(r.items[0].nama, "Heparin");
    assert.equal(r.items[0].jam, "10:30");
    assert.equal(r.items[0].keterangan, "5000 IU");
  });

  it("fills empty fields on existing row only", () => {
    const r = upsertLogFromCek({
      items: [
        {
          id: "a",
          nama: "Heparin",
          jam: "09:00",
          keterangan: "old",
          oleh: null,
        },
      ],
      kind: "heparin",
      ket: "new",
      jam: "11:00",
      oleh: "Ns",
    });
    assert.equal(r.changed, true);
    assert.equal(r.items[0].jam, "09:00");
    assert.equal(r.items[0].keterangan, "old");
    assert.equal(r.items[0].oleh, "Ns");
  });
});
