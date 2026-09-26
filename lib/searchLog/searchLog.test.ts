import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { maskPersonalData, sanitize, type StoredEvent } from "./events.ts";
import { buildReport, lastWeek } from "./report.ts";
import { testFileStore } from "./store.ts";

const SID = "session-abc123";
const search = (qid: string, query: string, results: number, extra: Partial<StoredEvent> = {}): StoredEvent =>
  ({
    type: "search", sid: SID, test: false, qid, query, engine: "rules", intent: "product_search", filters: {}, leftover: "",
    exact: results, partial: 0, topIds: [], at: "2026-10-06T10:00:00.000Z", context: "production", ...extra,
  }) as StoredEvent;

test("search log: no personal data survives sanitizing", () => {
  assert.equal(maskPersonalData("sweater for jane.doe@gmail.com"), "sweater for [email]");
  assert.equal(maskPersonalData("call +1 (555) 123-4567 size M"), "call [number] size M");
  assert.equal(maskPersonalData("scarf under 150"), "scarf under 150");
  const e = sanitize({ type: "search", sid: SID, qid: "q-000001", query: "x".repeat(500), ip: "1.2.3.4", email: "a@b.co", filters: { types: ["chompa"], evil: 1 } });
  assert.ok(e && e.type === "search");
  assert.equal(e.query.length, 200);
  assert.ok(!("ip" in e) && !("email" in e));
  assert.deepEqual(e.filters, { types: ["chompa"] });
  assert.equal(sanitize({ type: "search", sid: "bad id!", qid: "q-000001" }), null);
});

test("search log: weekly report lists zero-result and zero-click searches, without tests or previews", () => {
  const { from, to } = { from: "2026-10-05T00:00:00.000Z", to: "2026-10-12T00:00:00.000Z" };
  const events: StoredEvent[] = [
    search("q-000001", "Vicuna gloves", 0, { leftover: "vicuna" }),
    search("q-000002", "vicuna  gloves", 0),
    search("q-000003", "alpaca sweater", 40),
    search("q-000004", "alpaca sweater", 35),
    search("q-000005", "royal scarf", 12),
    { type: "click", sid: SID, test: false, qid: "q-000005", productId: "p1", position: 2, at: "2026-10-06T10:01:00.000Z", context: "production" },
    search("q-000006", "test query", 0, { test: true }),
    search("q-000007", "preview query", 0, { context: "deploy-preview" }),
    search("q-000008", "alpaca sweater", 30, { reformulationOf: "q-000004" }),
  ];
  const r = buildReport(events, from, to);
  assert.equal(r.searches, 6);
  assert.deepEqual(r.topNoResults.map((x) => [x.query, x.count]), [["vicuna gloves", 2]]);
  assert.equal(r.topNoResults[0].leftover, "vicuna");
  assert.deepEqual(r.topNoClicks.map((x) => [x.query, x.count]), [["alpaca sweater", 3]]);
  assert.equal(r.withClicks, 1);
  assert.equal(r.reformulated, 1);
});

test("search log: file store keeps events by day and purges after the retention window", async () => {
  const store = testFileStore(await mkdtemp(path.join(tmpdir(), "aa-log-")));
  await store.append([search("q-000001", "old", 1, { at: "2025-01-02T00:00:00.000Z" })]);
  await store.append([search("q-000002", "new", 1, { at: "2026-10-06T00:00:00.000Z" })]);
  assert.equal((await store.read("2026-10-05T00:00:00.000Z", "2026-10-12T00:00:00.000Z")).length, 1);
  assert.equal(await store.purgeBefore("2025-10-06"), 1);
  assert.equal((await store.read("2025-01-01T00:00:00.000Z", "2025-01-03T00:00:00.000Z")).length, 0);
});

test("search log: last week runs Monday to Monday", () => {
  assert.deepEqual(lastWeek(new Date("2026-10-08T15:00:00Z")), { from: "2026-09-28T00:00:00.000Z", to: "2026-10-05T00:00:00.000Z" });
});
