# Alpaca Atlas: notes for Claude

Comparison site for Peruvian alpaca aimed at US buyers (alpacaatlas.com). Next.js 15 + Tailwind 4 on Netlify, no database: the catalog lives in `data/`.

## Non-negotiable rules
- **Never invent product data.** Every field stores its provenance: stated (with the store's quote), inferred (labeled as such) or not published. The UI shows "not published"; it never hides or guesses.
- A language model may only interpret queries or write answers from indexed sources (`lib/answers.ts`). It never creates product attributes (fiber, microns, duties) and never ranks by "authenticity".
- New sources: check robots.txt and the terms before reading them. If automated reading isn't allowed, use a hand-curated file with the URL and the check date (`data/policies.json`, `data/aia-members.json`).
- Don't break URLs or SEO. Filter combinations don't create indexable URLs (`?q=` is noindex). Before publishing, diff the sitemap against production.

## Where things live
- `scripts/ingest.ts`: downloads catalogs (Shopify/WooCommerce) and normalizes them. `--cache` re-normalizes from `data/raw/` without network.
- `lib/ingest/shopify.ts`: composition, grade, microns, seal, colors and sizes, by rules.
- `lib/fiber.ts`: controlled fiber vocabulary, `compositionStatus`, alpaca-share ranges.
- `lib/policies.ts` + `data/policies.json`: each store's shipping and returns policy, with quotes.
- `lib/taxonomy.ts`: grades as each store names them, plus the NTP 231.301:2022 table (source and check date).
- `lib/parseQuery.ts`: deterministic search parser. `lib/answers.ts` answers questions from the guides and policies.
- `lib/filter.ts`: three-state verdict (pass / fail / unknown → "possible matches").

## Commands
- `npm test`: unit tests plus the search eval (fails below 90%).
- `node --experimental-strip-types --no-warnings scripts/search-eval.ts`: accuracy per case.
- `npm run typecheck`, `npm run build`.
- `npm run ingest` (network) / `node --experimental-strip-types --no-warnings scripts/ingest.ts --cache`.

## Conventions
- UI and guides in English (short, plain sentences; explain each concept in one line). Code comments and internal docs in Spanish.
- Internal filter ids are Spanish (`chompa`, `bufanda`…); labels come from `lib/taxonomy.ts`.
- A new search synonym or intent gets a case in `tests/search-eval.json`.
- A new normalizer rule gets a fixture from a real listing in `lib/ingest/ingest.test.ts`.
- Netlify publishes `claude/alpaca-catalog-agent-rhyuwz` to production. Work on another branch and ask before merging or deploying.
- The daily refresh (`.github/workflows/refresh-catalog.yml`) runs from `main` and commits the catalog to the production branch.
