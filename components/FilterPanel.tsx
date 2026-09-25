"use client";

import type { Filters } from "@/lib/types.ts";
import {
  BREEDS,
  BREED_LABEL,
  COLOR_FAMILIES,
  COLOR_LABEL,
  COLOR_SWATCH,
  PRODUCT_TYPES,
  QUALITY_RANGES,
  REGIONS,
  REGION_LABEL,
  TYPE_LABEL,
  micronRangeLabel,
} from "@/lib/taxonomy.ts";

export type FacetCounter = (patch: Partial<Filters>) => number;

type ArrayKey = "types" | "qualities" | "breeds" | "colorFamilies" | "origins" | "sources";

export function FilterPanel({
  filters,
  onChange,
  count,
  sources,
}: {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  count: FacetCounter;
  sources: string[];
}) {
  function toggle<K extends ArrayKey>(key: K, value: Filters[K][number]) {
    const list = filters[key] as string[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onChange({ [key]: next } as Partial<Filters>);
  }
  const optionCount = (key: ArrayKey, value: string) => count({ [key]: [value] } as Partial<Filters>);

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

      <Section title="Finura (NTP 231.301)" hint="Micras = diámetro de la fibra. Menos µm, más suave.">
        <ul className="space-y-1">
          {QUALITY_RANGES.slice(0, 5).map((q) => (
            <CheckRow
              key={q.id}
              checked={filters.qualities.includes(q.id)}
              onChange={() => toggle("qualities", q.id)}
              label={q.label}
              detail={micronRangeLabel(q.id)}
              n={optionCount("qualities", q.id)}
            />
          ))}
        </ul>
      </Section>

      <Section title="Raza">
        <div className="grid grid-cols-2 gap-1.5">
          {BREEDS.map((b) => (
            <Pill
              key={b}
              active={filters.breeds.includes(b)}
              onClick={() => toggle("breeds", b)}
              label={BREED_LABEL[b]}
              n={optionCount("breeds", b)}
              block
            />
          ))}
        </div>
      </Section>

      <Section title="Color">
        <Segmented
          value={filters.dye}
          options={[
            ["cualquiera", "Todos"],
            ["natural", "Natural"],
            ["tenido", "Teñido"],
          ]}
          onChange={(dye) => onChange({ dye })}
        />
        <div className="mt-3 grid grid-cols-5 gap-2">
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

      <Section title="Origen declarado" hint="Solo cuando la tienda lo indica.">
        <ul className="space-y-1">
          {REGIONS.map((r) => (
            <CheckRow
              key={r}
              checked={filters.origins.includes(r)}
              onChange={() => toggle("origins", r)}
              label={REGION_LABEL[r]}
              n={optionCount("origins", r)}
            />
          ))}
        </ul>
      </Section>

      <Section title="Precio (S/)">
        <div className="flex items-center gap-2">
          <NumberInput placeholder="Mín." value={filters.priceMin} onChange={(priceMin) => onChange({ priceMin })} />
          <span className="text-piedra">–</span>
          <NumberInput placeholder="Máx." value={filters.priceMax} onChange={(priceMax) => onChange({ priceMax })} />
        </div>
      </Section>

      <Section title="Disponibilidad">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>Solo en stock</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-tierra"
            checked={filters.inStockOnly}
            onChange={(e) => onChange({ inStockOnly: e.target.checked })}
          />
        </label>
      </Section>

      <Section title="Tienda">
        <ul className="space-y-1">
          {sources.map((s) => (
            <CheckRow
              key={s}
              checked={filters.sources.includes(s)}
              onChange={() => toggle("sources", s)}
              label={s}
              n={optionCount("sources", s)}
            />
          ))}
        </ul>
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
  n: number;
  block?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={!active && n === 0}
      className={`rounded-full border px-3 py-1.5 text-xs transition disabled:opacity-35 ${block ? "w-full" : ""} ${
        active ? "border-carbon bg-carbon text-lana" : "border-arena-oscura bg-white hover:border-tierra/60"
      }`}
    >
      {label} <span className={active ? "text-lana/60" : "text-piedra"}>{n}</span>
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
  n: number;
}) {
  return (
    <li>
      <label className={`flex cursor-pointer items-center gap-2.5 py-1 ${!checked && n === 0 ? "opacity-40" : ""}`}>
        <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-tierra" />
        <span className="flex-1">
          {label}
          {detail && <span className="ml-1.5 text-xs text-piedra">{detail}</span>}
        </span>
        <span className="text-xs tabular-nums text-piedra">{n}</span>
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
