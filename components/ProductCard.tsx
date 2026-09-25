import Link from "next/link";
import type { Product } from "@/lib/types.ts";
import { AVAILABILITY_LABEL, BREED_LABEL, REGION_LABEL, TYPE_LABEL } from "@/lib/taxonomy.ts";
import { compositionLabel, finenessLabel, formatPen, formatUsd } from "@/lib/format.ts";
import { Swatch } from "./Swatch.tsx";

export function ProductCard({ product: p, unknownFields = [] }: { product: Product; unknownFields?: string[] }) {
  const fineness = finenessLabel(p);
  const micronInferred = p.evidence.micron?.provenance !== "declarado";
  const soldOut = p.availability.status === "agotado";

  return (
    <Link
      href={`/producto/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-sm bg-white ring-1 ring-arena-oscura/60 transition hover:ring-tierra/40"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-arena">
        <Swatch
          id={p.id}
          hex={p.color.hex}
          type={p.productType}
          className={`h-full w-full transition duration-500 group-hover:scale-[1.03] ${soldOut ? "opacity-60 grayscale-[30%]" : ""}`}
        />
        {fineness && (
          <span className="absolute left-2 top-2 rounded-full bg-carbon/85 px-2.5 py-1 text-[11px] font-medium text-lana backdrop-blur sm:left-3 sm:top-3">
            {fineness}
            {p.fiber.micron != null && micronInferred && " (inf.)"}
          </span>
        )}
        {p.availability.status !== "en_stock" && (
          <span className="absolute bottom-2 left-2 rounded-full bg-lana/90 px-2.5 py-1 text-[11px] text-carbon sm:bottom-3 sm:left-3">
            {AVAILABILITY_LABEL[p.availability.status]}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-piedra">
            {TYPE_LABEL[p.productType]} · {p.source.site}
          </p>
          <h3 className="mt-1 line-clamp-2 text-sm leading-snug text-carbon">{p.title}</h3>
        </div>

        <dl className="grid grid-cols-1 gap-y-1 text-[11px] leading-tight sm:grid-cols-2 sm:gap-x-3 sm:gap-y-1.5 sm:text-xs">
          <Spec label="Fibra" value={compositionLabel(p)} />
          <Spec label="Raza" value={p.fiber.breed ? BREED_LABEL[p.fiber.breed] : null} />
          <Spec
            label="Color"
            value={`${p.color.name.split(" (")[0]}${p.color.natural === true ? " · natural" : p.color.natural === false ? " · teñido" : ""}`}
          />
          <Spec label="Origen" value={p.origin.region ? REGION_LABEL[p.origin.region] : null} />
        </dl>

        {unknownFields.length > 0 && (
          <p className="rounded-sm bg-arena px-2 py-1.5 text-[11px] text-tierra">
            Sin dato de {unknownFields.join(", ")} — no podemos confirmar que cumpla tu filtro.
          </p>
        )}

        <div className="mt-auto flex items-baseline justify-between gap-2 border-t border-arena pt-3">
          <span className="font-serif text-lg text-carbon">{formatPen(p.price.amountPen)}</span>
          {p.price.currency === "USD" && <span className="text-[11px] text-piedra">{formatUsd(p.price.amount)}</span>}
        </div>
      </div>
    </Link>
  );
}

function Spec({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex min-w-0 justify-between gap-2 sm:block">
      <dt className="shrink-0 text-piedra">{label}</dt>
      <dd className={`truncate text-right sm:text-left ${value ? "text-carbon" : "italic text-piedra/80"}`}>{value ?? "no declarado"}</dd>
    </div>
  );
}
