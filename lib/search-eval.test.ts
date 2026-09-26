import { test } from "node:test";
import assert from "node:assert/strict";
import { runEval } from "../scripts/search-eval.ts";

test("search eval: at least 90% of tests/search-eval.json cases parse as expected", () => {
  const r = runEval();
  const detail = r.failures.map((f) => `#${f.id} ${f.query}: ${f.why.join("; ")}`).join("\n");
  assert.ok(r.ok / r.total >= 0.9, `${r.ok}/${r.total}\n${detail}`);
});
