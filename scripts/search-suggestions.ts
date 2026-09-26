// Propuestas semanales de sinónimos y reglas para búsquedas que fallaron. Fuera de línea:
// NADA se aplica solo; el archivo que genera es para revisión humana.
//
//   SEARCH_REPORT_TOKEN=… ANTHROPIC_API_KEY=… \
//     node --experimental-strip-types --no-warnings scripts/search-suggestions.ts --url https://alpacaatlas.com
//   node … scripts/search-suggestions.ts --report reporte.json      (JSON guardado del reporte)
//   … --dry-run                                                      (sin llamar al modelo)
//
// El modelo (Haiku) solo ve las consultas fallidas y los valores permitidos de cada filtro;
// nunca descripciones de producto. Cada propuesta se valida contra esos valores y se mide contra
// tests/search-eval.json antes de proponerla. Salida: reports/search-suggestions-AAAA-MM-DD.md
// (carpeta ignorada por git: contiene búsquedas de usuarios y el repositorio es público).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { COLOR_FAMILIES, PRODUCT_TYPES, QUALITIES, TYPE_LABEL } from "../lib/taxonomy.ts";
import { parseQueryLocal } from "../lib/parseQuery.ts";
import type { SearchReport } from "../lib/searchLog/report.ts";

const MODEL = process.env.SUGGESTIONS_MODEL ?? "claude-haiku-4-5";
const STORES = ["Sol Alpaca", "Kuna USA", "Incalpaca", "Alpaca Collections", "PAKA", "Peruvian Connection", "Krimson Klover", "Peruvian Link", "Etno Alpaca", "Qinti", "All Alpaca"];
const ALLOWED: Record<string, readonly string[]> = {
  types: PRODUCT_TYPES,
  qualities: QUALITIES,
  colorFamilies: COLOR_FAMILIES,
  sources: STORES,
  genders: ["women", "men"],
  alpacaRanges: ["100", "70-99", "50-69", "lt50", "unpublished"],
  shipsFrom: ["US", "Peru"],
};

const Proposal = z.object({
  proposals: z.array(
    z.object({
      query: z.string(),
      kind: z.enum(["synonym", "rule", "not_in_catalog", "no_action"]),
      /** Palabra o frase del usuario que habría que reconocer. */
      phrase: z.string(),
      field: z.string(),
      value: z.string(),
      rationale: z.string(),
    }),
  ),
});

function arg(name: string) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function loadReport(): Promise<SearchReport> {
  const file = arg("--report");
  if (file) return JSON.parse(await readFile(file, "utf8"));
  const base = arg("--url");
  const token = process.env.SEARCH_REPORT_TOKEN;
  if (!base || !token) throw new Error("Usa --report <archivo.json> o --url <sitio> con SEARCH_REPORT_TOKEN");
  const res = await fetch(`${base.replace(/\/$/, "")}/api/admin/search-report?format=json`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Reporte: HTTP ${res.status}`);
  return res.json();
}

const report = await loadReport();
const failed = [
  ...report.topNoResults.map((r) => ({ ...r, problem: "no results" })),
  ...report.topNoClicks.filter((r) => r.leftover).map((r) => ({ ...r, problem: "results but no clicks" })),
];
if (!failed.length) {
  console.log("No hay búsquedas fallidas en el reporte.");
  process.exit(0);
}

const SYSTEM = `You help maintain a deterministic search parser for a Peruvian alpaca catalog (English-speaking US shoppers).
For each failed search, propose how the parser should read it, using ONLY these filter values:
${Object.entries(ALLOWED).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n")}
Product types: ${PRODUCT_TYPES.map((t) => `${t} = ${TYPE_LABEL[t]}`).join("; ")}.
kind: "synonym" (a word that means an existing value), "rule" (a phrase pattern), "not_in_catalog" (the shopper wants something we don't list, e.g. vicuña), or "no_action".
Never invent product facts. field/value must be one of the allowed pairs, or empty for not_in_catalog/no_action.`;

const user = failed.map((f) => `- "${f.query}" (${f.problem}, ${f.count}×${f.leftover ? `, not understood: "${f.leftover}"` : ""})`).join("\n");

let proposals: z.infer<typeof Proposal>["proposals"] = [];
if (process.argv.includes("--dry-run") || !process.env.ANTHROPIC_API_KEY) {
  console.log(`[dry run] ${failed.length} búsquedas fallidas; se enviarían a ${MODEL}:\n${user}`);
} else {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: `Failed searches this week:\n${user}` }],
    output_config: { format: zodOutputFormat(Proposal) },
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`Sin propuestas (stop_reason: ${response.stop_reason})`);
  proposals = response.parsed_output.proposals;
}

// Validación: valores permitidos, y que la consulta hoy no se entienda ya.
const rows = proposals.map((p) => {
  const allowed = !p.field || (ALLOWED[p.field]?.includes(p.value) ?? false);
  const now = parseQueryLocal(p.query);
  return { ...p, allowed, alreadyParsed: !now.filters.text && (now.filters as unknown as Record<string, unknown[]>)[p.field]?.includes?.(p.value) };
});

const date = new Date().toISOString().slice(0, 10);
const md = [
  `# Search suggestions ${date}`,
  "",
  `Report ${report.from.slice(0, 10)} → ${report.to.slice(0, 10)} · ${report.searches} searches · ${report.notUnderstood} not understood. Model: ${MODEL}.`,
  "",
  "Nothing here is applied automatically. To accept one, add the synonym or rule to lib/parseQuery.ts and a case to tests/search-eval.json.",
  "",
  "| Query | Proposal | Phrase → filter | Why | Check |",
  "|---|---|---|---|---|",
  ...rows.map((r) => `| ${r.query} | ${r.kind} | ${r.phrase ? `"${r.phrase}" → ${r.field}=${r.value}` : "—"} | ${r.rationale.replace(/\|/g, "/")} | ${!r.allowed ? "rejected: value not allowed" : r.alreadyParsed ? "already understood today" : "to review"} |`),
  ...(rows.length ? [] : ["| (dry run) | | | | |"]),
].join("\n");
await mkdir("reports", { recursive: true });
const out = `reports/search-suggestions-${date}.md`;
await writeFile(out, md + "\n");
console.log(`Propuestas: ${out}`);
