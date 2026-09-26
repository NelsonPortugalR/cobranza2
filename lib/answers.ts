// Respuestas a preguntas, solo desde fuentes propias e indexadas: las guías del sitio y las
// políticas de tienda curadas (data/policies.json). Sin fuente, lo decimos y enlazamos a la tienda.
import policiesFile from "../data/policies.json" with { type: "json" };
import { GUIDES } from "./seo/guides.ts";
import type { StorePolicy } from "./policies.ts";
import type { ParsedQuery } from "./types.ts";

export interface Answer {
  title: string;
  /** Texto plano, citado de la guía o de la política. */
  text: string;
  href: string;
  linkLabel: string;
  /** Tienda cuya política responde la pregunta. */
  store?: string;
  /** Fecha de revisión de la fuente (políticas de tienda). */
  checkedOn?: string;
  external?: boolean;
}

const POLICIES = (policiesFile as unknown as { stores: Record<string, StorePolicy> }).stores;
const plain = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

function fromGuide(slug: string, faqQuestion?: RegExp): Answer | null {
  const g = GUIDES.find((x) => x.slug === slug);
  if (!g) return null;
  const faq = faqQuestion ? g.faq.find((f) => faqQuestion.test(f.q)) : undefined;
  return {
    title: faq?.q ?? g.title,
    text: plain(faq?.a ?? g.summary),
    href: `/guides/${g.slug}`,
    linkLabel: `Read: ${g.title}`,
  };
}

const TOPICS: [RegExp, () => Answer | null][] = [
  [/\bbaby alpacas?\b.*\b(from|made|come)|\b(from|made of|come from) baby alpacas?\b|\byoung alpacas?\b/, () => fromGuide("alpaca-fiber-grades-explained", /baby alpacas/)],
  [/\bitch|scratch|prickl|sensitive skin|pica\b/, () => fromGuide("alpaca-fiber-grades-explained", /itchy/)],
  [/\bsuper ?baby\b.*\bofficial|\bofficial\b.*\bgrade/, () => fromGuide("alpaca-fiber-grades-explained", /super baby/i)],
  [/\broyal\b.*\bbaby\b|\bbaby\b.*\broyal\b/, () => fromGuide("alpaca-fiber-grades-explained", /royal alpaca and baby/)],
  [/\bmicron|grade|royal|superfine|ultrafin/, () => fromGuide("alpaca-fiber-grades-explained")],
  [/\bcashmere|merino|sheep|\bwool\b|\bvs\b|versus|compare/, () => fromGuide("alpaca-vs-cashmere-vs-merino")],
  [/\bwash|clean|care|dry|laundr|pill|moth|store (it|them)|shrink|lavar/, () => fromGuide("how-to-care-for-alpaca")],
  [/\bcustoms|dut(y|ies)|tariff|import|fees?|taxes|aranceles|aduana/, () => fromGuide("how-to-buy-alpaca-online", /customs/)],
  [/\breal\b|\bfake\b|authentic|genuine|blend|label/, () => fromGuide("how-to-buy-alpaca-online")],
];

/** Respuesta de la política de una tienda: envío, aranceles, plazos o devoluciones. */
function fromStore(store: string, q: string): Answer {
  const p = POLICIES[store];
  if (!p) {
    return {
      title: `${store}`,
      text: `We don't have ${store}'s shipping policy on file yet. Check it on the store's site before buying.`,
      href: `/brands`,
      linkLabel: "See all stores",
      store,
    };
  }
  const wants = (re: RegExp) => re.test(q);
  let fact: { label: string; quote?: string } | null = null;
  if (wants(/dut(y|ies)|customs|tariff|import|fees?|tax/)) {
    fact = p.feesOnDelivery
      ? { label: p.feesOnDelivery.value === "none" ? "No fees on delivery" : "Import duties may apply on delivery", quote: p.feesOnDelivery.quote }
      : { label: "The store's policy doesn't say whether duties are included" };
  } else if (wants(/return|refund|exchange/)) {
    // Las devoluciones aún no se muestran en el sitio: enlazamos a la política de la tienda.
    return {
      title: `${store}: returns`,
      text: "We haven't added return details to the site yet. Read the store's returns policy before buying.",
      href: p.returnsUrl ?? p.policyUrl,
      linkLabel: `${store}'s returns policy`,
      store,
      checkedOn: p.checkedOn,
      external: true,
    };
  } else if (wants(/how long|deliver|arrive|days|fast/)) {
    fact = p.deliveryDays
      ? { label: `${p.deliveryDays.min}–${p.deliveryDays.max} business days to the US`, quote: p.deliveryDays.quote }
      : { label: "The store's policy doesn't state delivery times" };
  } else if (wants(/free shipping|shipping cost/)) {
    fact = p.freeShippingOverUsd
      ? { label: `Free shipping over $${p.freeShippingOverUsd.value}`, quote: p.freeShippingOverUsd.quote }
      : { label: "The store's policy doesn't state a free-shipping threshold" };
  } else if (wants(/ship|from where|where from|warehouse/)) {
    const byTag = Object.entries(p.byTag ?? {}).find(([, o]) => o.shipsFrom);
    fact = p.shipsFrom
      ? { label: `Ships from ${p.shipsFrom.value === "US" ? "the US" : "Peru"}`, quote: p.shipsFrom.quote }
      : byTag
        ? { label: "Some items ship from a US warehouse", quote: byTag[1].shipsFrom!.quote }
        : { label: "The store's policy doesn't say where orders ship from" };
  }
  return {
    title: fact ? `${store}: ${fact.label}` : `${store}: shipping and returns`,
    text: fact?.quote ? `“${fact.quote}”` : `${fact?.label ?? "See the store's policy for details"}.`,
    href: p.policyUrl,
    linkLabel: `${store}'s shipping policy`,
    store,
    checkedOn: p.checkedOn,
    external: true,
  };
}

export function answerFor(query: string, parsed: ParsedQuery): Answer | null {
  if (parsed.intent !== "question" && parsed.intent !== "store" && parsed.intent !== "mixed") return null;
  const q = query.toLowerCase();
  if (parsed.intent === "store" && parsed.filters.sources.length) return fromStore(parsed.filters.sources[0], q);
  for (const [re, make] of TOPICS) if (re.test(q)) return make();
  return {
    title: "We don't have a sourced answer for that",
    text: "We only answer from our guides and the stores' published policies. Here are related pieces; each links to the store, which can answer directly.",
    href: "/guides",
    linkLabel: "Browse our guides",
  };
}
