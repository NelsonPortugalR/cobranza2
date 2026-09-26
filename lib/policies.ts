// Políticas de envío y devoluciones curadas a mano (data/policies.json). Cada producto hereda
// la de su tienda; Kuna USA cambia por producto según la etiqueta "express_shipping".
import type { Product } from "./types.ts";

export type ShipsFrom = "US" | "Peru" | "not_published";
export type FeesOnDelivery = "none" | "may_apply" | "not_published";

export interface PolicyFact<T> {
  value: T;
  provenance: "stated" | "inferred";
  quote: string;
}

export interface StorePolicy {
  policyUrl: string;
  returnsUrl?: string;
  checkedOn: string;
  shipsToUS: boolean;
  shipsToUSQuote?: string;
  shipsFrom?: PolicyFact<Exclude<ShipsFrom, "not_published">>;
  feesOnDelivery?: PolicyFact<Exclude<FeesOnDelivery, "not_published">>;
  freeShippingOverUsd?: { value: number; quote: string };
  deliveryDays?: { min: number; max: number; quote: string };
  returns?: { days: number; quote: string };
  byTag?: Record<string, Partial<Pick<StorePolicy, "shipsFrom" | "feesOnDelivery" | "deliveryDays">>>;
}

export type ProductShipping = NonNullable<Product["shipping"]>;

const FROM_TEXT: Record<ShipsFrom, string> = { US: "Ships from the US", Peru: "Ships from Peru", not_published: "Ships to the US" };

/** Política efectiva de un producto: la de la tienda, con los ajustes de sus etiquetas. */
export function shippingFromPolicy(policy: StorePolicy, tags: string[] = []): ProductShipping {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const override = Object.entries(policy.byTag ?? {}).find(([tag]) => tagSet.has(tag.toLowerCase()))?.[1] ?? {};
  const shipsFrom = override.shipsFrom ?? policy.shipsFrom;
  const fees = override.feesOnDelivery ?? policy.feesOnDelivery;
  const days = override.deliveryDays ?? policy.deliveryDays;
  const from: ShipsFrom = shipsFrom?.value ?? "not_published";
  const feeValue: FeesOnDelivery = fees?.value ?? "not_published";
  const summary = [
    FROM_TEXT[from],
    feeValue === "none" ? (from === "US" ? "no customs fees" : "duties included") : feeValue === "may_apply" ? "import duties not included" : null,
    policy.freeShippingOverUsd ? `free shipping over $${policy.freeShippingOverUsd.value}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    summary,
    toUS: policy.shipsToUS,
    days: days ? `${days.min}–${days.max} business days to the US` : undefined,
    shipsFrom: from,
    feesOnDelivery: feeValue,
    freeShippingOverUsd: policy.freeShippingOverUsd?.value ?? null,
    deliveryDays: days ? { min: days.min, max: days.max } : null,
    returnsDays: policy.returns?.days ?? null,
    policyUrl: policy.policyUrl,
    returnsUrl: policy.returnsUrl,
    checkedOn: policy.checkedOn,
    evidence: {
      ...(shipsFrom ? { shipsFrom: { provenance: shipsFrom.provenance, quote: shipsFrom.quote } } : {}),
      ...(fees ? { feesOnDelivery: { provenance: fees.provenance, quote: fees.quote } } : {}),
      ...(policy.freeShippingOverUsd ? { freeShipping: { provenance: "stated" as const, quote: policy.freeShippingOverUsd.quote } } : {}),
      ...(days ? { deliveryDays: { provenance: "stated" as const, quote: days.quote } } : {}),
      ...(policy.returns ? { returns: { provenance: "stated" as const, quote: policy.returns.quote } } : {}),
    },
  };
}

export const SHIPS_FROM_LABEL: Record<Exclude<ShipsFrom, "not_published">, string> = { US: "United States", Peru: "Peru" };
