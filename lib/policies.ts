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

/**
 * Por qué no hay cobros al recibir: la tienda declara que los aranceles están incluidos, o
 * declara que envía desde EE. UU. (no hay importación). Nada más cuenta.
 */
export type FeesBasis = "duties_included" | "ships_from_us";

export interface StorePolicy {
  policyUrl: string;
  returnsUrl?: string;
  checkedOn: string;
  shipsToUS: boolean;
  shipsToUSQuote?: string;
  shipsFrom?: PolicyFact<Exclude<ShipsFrom, "not_published">>;
  feesOnDelivery?: PolicyFact<Exclude<FeesOnDelivery, "not_published">> & { basis?: FeesBasis };
  freeShippingOverUsd?: { value: number; quote: string };
  deliveryDays?: { min: number; max: number; quote: string };
  returns?: { days: number; quote: string };
  byTag?: Record<string, Partial<Pick<StorePolicy, "shipsFrom" | "feesOnDelivery" | "deliveryDays">>>;
  /** Devoluciones en detalle (solo datos; todavía no se muestran). */
  returnsDetail?: ReturnsDetail;
}

/** Un dato de devoluciones: con cita, "conflicting" si las páginas de la tienda se contradicen, o no publicado. */
export type ReturnFact<T> = { value: T; quote: string; note?: string } | { value: "conflicting"; quotes: string[] } | "not_published";

export interface ReturnsDetail {
  policyUrl: string;
  checkedOn: string;
  window: ReturnFact<number>;
  refundType: ReturnFact<"refund" | "refund_or_exchange" | "exchange_or_credit">;
  returnShippingPaidBy: ReturnFact<"customer" | "store">;
  returnTo: ReturnFact<"US" | "Peru">;
  saleFinal: ReturnFact<"yes" | "clearance_only" | "exchange_or_credit_only">;
  refundsOriginalShipping: ReturnFact<boolean>;
  refundsDuties: ReturnFact<boolean>;
}

export type ProductShipping = NonNullable<Product["shipping"]>;

const FROM_TEXT: Record<ShipsFrom, string> = { US: "Ships from the US", Peru: "Ships from Peru", not_published: "Ships to the US" };

/** Política efectiva de un producto: la de la tienda, con los ajustes de sus etiquetas. */
export function shippingFromPolicy(policy: StorePolicy, tags: string[] = []): ProductShipping {
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  const override = Object.entries(policy.byTag ?? {}).find(([tag]) => tagSet.has(tag.toLowerCase()))?.[1] ?? {};
  const shipsFrom = override.shipsFrom ?? policy.shipsFrom;
  // Regla: "sin cobros al recibir" solo si la tienda lo declara, o si declara (no inferido) que
  // envía desde EE. UU. Si ambas cosas son inferidas, el dato queda como no publicado.
  const rawFees = override.feesOnDelivery ?? policy.feesOnDelivery;
  const shipsFromUsStated = shipsFrom?.value === "US" && shipsFrom.provenance === "stated";
  const fees =
    rawFees && (rawFees.provenance === "stated" || (rawFees.basis === "ships_from_us" && shipsFromUsStated)) ? rawFees : undefined;
  const days = override.deliveryDays ?? policy.deliveryDays;
  const from: ShipsFrom = shipsFrom?.value ?? "not_published";
  const feeValue: FeesOnDelivery = fees?.value ?? "not_published";
  const summary = [
    FROM_TEXT[from],
    feeValue === "none" ? (fees?.basis === "ships_from_us" ? "no import fees" : "duties included") : feeValue === "may_apply" ? "import duties not included" : null,
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
    ...(fees?.value === "none" && fees.basis ? { feesBasis: fees.basis } : {}),
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
