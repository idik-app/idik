import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTindakanListKey,
  isTindakanListSwrKey,
} from "./tindakanListQuery";

test("buildTindakanListKey is independent of table search", () => {
  const jadwal = buildTindakanListKey({
    from: "2026-08-01",
    to: "2026-08-31",
    limit: 1000,
  });
  const table = buildTindakanListKey({
    from: "2026-08-28",
    to: "2026-08-28",
    search: "931678",
    limit: 1000,
  });
  assert.equal(jadwal, "/api/tindakan?limit=1000&from=2026-08-01&to=2026-08-31");
  assert.notEqual(jadwal, table);
  assert.equal(isTindakanListSwrKey(jadwal), true);
  assert.equal(isTindakanListSwrKey("/api/tindakan/abc/status-log"), false);
});
