"use client";

import type { Filters } from "@/lib/types.ts";
import {
  COLOR_FAMILIES,
  COLOR_LABEL,
  COLOR_SWATCH,
  PRODUCT_TYPES,
  QUALITY_RANGES,
  SIZE_ORDER,
  TYPE_LABEL,
  USD_PEN,
} from "@/lib/taxonomy.ts";

import type { FacetCounts, FacetKey } from "@/lib/filter.ts";

type ArrayKey = "types" | "qualities" | "breeds" | "colorFamilies" | "origins" | "sources" | "sizes";

const SIZES = [...SIZE_ORDER.slice(1, 7), "Única"];

export function FilterPanel({
  filters,
  onChange,
  facets,
  sources,
  realSources,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  facets: FacetCounts;
  sources: string[];
  realSources: string[];
}) {
  const usd = filters.priceCurrency === "USD";
  const toShown = (pen: number | null) => (pen == null ? null : usd ? Math.round(pen / USD_PEN) : pen);
  const toPen = (v: number | null) => (v == null ? null : usd ? Math.round(v * USD_PEN) : v);
  function toggle<K extends ArrayKey>(key: K, value: Filters[K][number]) {
    const list = filters[key] as string[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onChange({ [key]: next } as Partial<Filters>);
  }
  const optionCount = (key: ArrayKey, value: string) => facets[key as FacetKey]?.[value] ?? { exact: 0, total: 0 };
  // Nota: el número mostrado son coincidencias exactas; la opción se desactiva solo si no hay ni por confirmar.

  return (
    <div className="space-y-7 text-sm">
      <Section title="Tipo de producto">
        <div className="flex flex-wrap gap-1.5">
          {PRODUCT_TYPES.map((t) => (
            <Pill
              key={t}
              active={filters.types.includes(t)}
              onClick={() => toggle("types", t)}
              label={TYPE_LABEL[t]}
              n={optionCount("types", t)}
            />
          ))}
        </div>
      </Section>

      <Section title="Talla con stock" hint="Solo muestra piezas con stock en esa talla.">
        <div className="grid grid-cols-4 gap-1.5">
          {SIZES.map((sz) => (
            <Pill
              key={sz}
              active={filters.sizes.includes(sz)}
              onClick={() => toggle("sizes", sz)}
              label={sz}
              n={optionCount("sizes", sz)}
              block
            />
          ))}
        </div>
      </Section>

      <Section title="Calidad declarada" hint="Como la nombra la tienda. De más fina a menos fina.">
        <ul className="space-y-1">
          {QUALITY_RANGES.slice(0, 4).map((q) => (
            <CheckRow
              key={q.id}
              checked={filters.qualities.includes(q.id)}
              onChange={() => toggle("qualities", q.id)}
              label={q.label}
              n={optionCount("qualities", q.id)}
            />
          ))}
        </ul>
      </Section>

      <Section title="Color">
        <div className="grid max-w-xs grid-cols-6 gap-2">
          {COLOR_FAMILIES.map((c) => {
            const active = filters.colorFamilies.includes(c);
            return (
              <button
                key={c}
                type="button"
                title={COLOR_LABEL[c]}
                aria-label={COLOR_LABEL[c]}
                aria-pressed={active}
                onClick={() => toggle("colorFamilies", c)}
                className={`aspect-square rounded-full ring-1 ring-black/10 transition ${
                  active ? "ring-2 ring-carbon ring-offset-2 ring-offset-lana" : "hover:scale-105"
                }`}
                style={{ background: COLOR_SWATCH[c] }}
              />
            );
          })}
        </div>
        {filters.colorFamilies.length > 0 && (
          <p className="mt-2 text-xs text-piedra">{filters.colorFamilies.map((c) => COLOR_LABEL[c]).join(", ")}</p>
        )}
      </Section>

      <Section title="Composición">
        <Segmented
          value={filters.composition}
          options={[
            ["cualquiera", "Todas"],
            ["100", "100% alpaca"],
            ["mezcla", "Mezcla"],
          ]}
          onChange={(composition) => onChange({ composition })}
        />
      </Section>

      <Section title="Precio">
        <Segmented
          value={filters.priceCurrency}
          options={[
            ["PEN", "Soles (S/)"],
            ["USD", "Dólares (US$)"],
          ]}
          onChange={(priceCurrency) => onChange({ priceCurrency })}
        />
        <div className="mt-3 flex items-center gap-2">
          <NumberInput placeholder="Mín." value={toShown(filters.priceMin)} onChange={(v) => onChange({ priceMin: toPen(v) })} />
          <span className="text-piedra">–</span>
          <NumberInput placeholder="Máx." value={toShown(filters.priceMax)} onChange={(v) => onChange({ priceMax: toPen(v) })} />
        </div>
        {usd && <p className="mt-2 text-xs text-piedra">Referencial: US$ 1 = S/ {USD_PEN}</p>}
      </Section>

      <Section title="Envío">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>Envía a Perú</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-tierra"
            checked={filters.shipsToPeru}
            onChange={(e) => onChange({ shipsToPeru: e.target.checked })}
          />
        </label>
        <p className="mt-1 text-xs text-piedra">Según la política de envío que publica cada tienda.</p>
      </Section>

      <Section title="Tienda">
        <ul className="space-y-1">
          {sources
            .filter((s) => filters.includeDemo || realSources.includes(s))
            .map((s) => (
              <CheckRow
                key={s}
                checked={filters.sources.includes(s)}
                onChange={() => toggle("sources", s)}
                label={s}
                detail={realSources.includes(s) ? "datos reales" : "ejemplo"}
                n={optionCount("sources", s)}
              />
            ))}
        </ul>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-sm bg-arena p-3 text-xs leading-snug text-tierra">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-tierra"
            checked={filters.includeDemo}
            onChange={(e) => onChange({ includeDemo: e.target.checked, sources: [] })}
          />
          <span>
            Mostrar ejemplos de tiendas aún no conectadas (Kuna, Mercado Libre, Etsy…). No son listados reales.
          </span>
        </label>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tierra">{title}</h3>
      {hint && <p className="mt-1 text-xs text-piedra">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Pill({
  active,
  onClick,
  label,
  n,
  block,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  n: { exact: number; total: number };
  block?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={!active && n.total === 0}
      title={n.total > n.exact ? `${n.exact} exactas · ${n.total - n.exact} por confirmar` : undefined}
      className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-35 ${block ? "w-full" : ""} ${
        active ? "border-carbon bg-carbon text-lana" : "border-arena-oscura bg-white hover:border-tierra/60"
      }`}
    >
      {label} <span className={active ? "text-lana/60" : "text-piedra"}>{n.exact}</span>
    </button>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  detail,
  n,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  detail?: string;
  n: { exact: number; total: number };
}) {
  return (
    <li>
      <label
        className={`flex cursor-pointer items-center gap-2.5 py-1 ${!checked && n.total === 0 ? "opacity-40" : ""}`}
        title={n.total > n.exact ? `${n.exact} exactas · ${n.total - n.exact} por confirmar` : undefined}
      >
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-tierra" />
        <span className="flex-1">
          {label}
          {detail && <span className="ml-1.5 text-xs text-piedra">{detail}</span>}
        </span>
        <span className="text-xs tabular-nums text-piedra">
          {n.exact}
          {n.total > n.exact && <span className="text-piedra/60"> +{n.total - n.exact}</span>}
        </span>
      </label>
    </li>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-full bg-arena p-0.5 text-xs">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-2 py-1.5 transition ${value === v ? "bg-white text-carbon shadow-sm" : "text-piedra"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="w-full rounded-sm border border-arena-oscura bg-white px-3 py-2 text-sm outline-none focus:border-tierra"
    />
  );
}
