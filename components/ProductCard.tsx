import Link from "next/link";
import type { Product } from "@/lib/types.ts";
import { AVAILABILITY_LABEL, BREED_LABEL, REGION_LABEL, TYPE_LABEL } from "@/lib/taxonomy.ts";
import { compositionLabel, finenessLabel, formatPen, formatUsd } from "@/lib/format.ts";
import { ProductImage } from "./ProductImage.tsx";

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
        <ProductImage
          product={p}
          className={`h-full w-full transition duration-500 group-hover:scale-[1.03] ${soldOut ? "opacity-60 grayscale-[30%]" : ""}`}
        />
        {p.demo && (
          <span className="absolute right-2 top-2 rounded-full bg-ocre px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:right-3 sm:top-3">
            Ejemplo
          </span>
        )}
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

        {p.sizes && p.sizes.length > 0 && !(p.sizes.length === 1 && p.sizes[0] === "Única") && (
          <div className="flex flex-wrap gap-1" aria-label="Tallas">
            {p.sizes.map((sz) => {
              const known = p.sizesAvailable != null;
              const ok = !known || p.sizesAvailable!.includes(sz);
              return (
                <span
                  key={sz}
                  title={!known ? "Stock por talla no informado" : ok ? "Con stock" : "Agotada"}
                  className={`min-w-7 rounded-sm border px-1.5 py-0.5 text-center text-[10px] ${
                    ok ? "border-arena-oscura text-carbon" : "border-transparent bg-arena text-piedra/70 line-through"
                  }`}
                >
                  {sz}
                </span>
              );
            })}
          </div>
        )}

        {unknownFields.length > 0 && (
          <p className="rounded-sm bg-arena px-2 py-1.5 text-[11px] text-tierra">
            Sin dato de {unknownFields.join(", ")} — no podemos confirmar que cumpla tu filtro.
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 border-t border-arena pt-3">
          <span className="flex items-baseline gap-1.5">
            <span className="font-serif text-lg text-carbon">
              {p.price.currency === "USD" ? formatUsd(p.price.amount) : formatPen(p.price.amount)}
            </span>
            {p.price.compareAt && (
              <span className="text-[11px] text-piedra line-through">
                {p.price.currency === "USD" ? formatUsd(p.price.compareAt) : formatPen(p.price.compareAt)}
              </span>
            )}
          </span>
          {p.price.currency === "USD" && <span className="text-[11px] text-piedra">≈ {formatPen(p.price.amountPen)}</span>}
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
