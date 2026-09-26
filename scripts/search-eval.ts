// Mide el buscador contra tests/search-eval.json. Uso:
//   node --experimental-strip-types --no-warnings scripts/search-eval.ts
import { readFileSync } from "node:fs";
import { parseQueryLocal } from "../lib/parseQuery.ts";
import { answerFor } from "../lib/answers.ts";
import type { FxRate } from "../lib/fx.ts";

const FX: FxRate = { penPerUsd: 3.4, date: "2026-09-26", source: "BCRP" };

interface Case {
  id: number;
  query: string;
  expect: Record<string, unknown>;
}

export function evaluateCase(c: Case): string[] {
  const parsed = parseQueryLocal(c.query, FX);
  const f = parsed.filters as unknown as Record<string, unknown>;
  const answer = answerFor(c.query, parsed);
  const why: string[] = [];
  for (const [k, v] of Object.entries(c.expect)) {
    switch (k) {
      case "qualitiesHas":
        if (!(f.qualities as string[]).includes(v as string)) why.push(`qualities=${JSON.stringify(f.qualities)}`);
        break;
      case "textIncludes":
        if (!String(f.text).includes(v as string)) why.push(`text="${f.text}"`);
        break;
      case "intent":
        if (parsed.intent !== v) why.push(`intent=${parsed.intent}`);
        break;
      case "answerHref":
        if (answer?.href !== v) why.push(`answer=${answer?.href ?? "none"}`);
        break;
      case "answerStore":
        if (answer?.store !== v) why.push(`answerStore=${answer?.store ?? "none"}`);
        break;
      case "note":
        if (!parsed.note) why.push("no note");
        break;
      case "interpreted":
        if (!parsed.chips.some((ch) => ch.field === v && ch.interpreted)) why.push(`no interpreted ${v} chip`);
        break;
      default:
        if (JSON.stringify(f[k]) !== JSON.stringify(v)) why.push(`${k}=${JSON.stringify(f[k])}`);
    }
  }
  const textExpected = "textIncludes" in c.expect;
  if (!textExpected && f.text) why.push(`leftover text "${f.text}"`);
  return why;
}

export function runEval(): { ok: number; total: number; failures: { id: number; query: string; why: string[] }[] } {
  const { cases } = JSON.parse(readFileSync(new URL("../tests/search-eval.json", import.meta.url), "utf8")) as { cases: Case[] };
  const failures = cases.map((c) => ({ id: c.id, query: c.query, why: evaluateCase(c) })).filter((r) => r.why.length);
  return { ok: cases.length - failures.length, total: cases.length, failures };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runEval();
  for (const x of r.failures) console.log(`FAIL #${x.id} ${x.query} → ${x.why.join("; ")}`);
  console.log(`\nSearch eval: ${r.ok}/${r.total} = ${Math.round((100 * r.ok) / r.total)}%`);
}
