"use client";

import { useEffect, useState } from "react";

export const EXAMPLE_QUERIES = [
  "Brown sweater, 100% baby alpaca, size M, under $180",
  "Gray baby alpaca cardigan, size S",
  "Royal alpaca wrap in camel",
  "Cardigan that ships from the US, no synthetics",
  "Scarf under $80, no customs fees",
  "Is alpaca itchy?",
];

/** Consulta en lenguaje natural. El agente la convierte en filtros; no es un chat. */
export function SearchBox({
  initial = "",
  loading,
  onSubmit,
  size = "hero",
}: {
  initial?: string;
  loading?: boolean;
  onSubmit: (query: string) => void;
  size?: "hero" | "compact";
}) {
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial]);
  const hero = size === "hero";

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      }}
      className={`flex items-center gap-2 rounded-full bg-white ring-1 ring-arena-oscura transition focus-within:ring-2 focus-within:ring-tierra/50 ${
        hero ? "p-1.5 pl-5 sm:p-2 sm:pl-6" : "p-1 pl-4"
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-piedra" aria-hidden>
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13 L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        enterKeyHint="search"
        aria-label="Describe what you are looking for"
        placeholder={hero ? "Describe it: fiber, color, size, budget…" : "Search the catalog"}
        className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-piedra/70 ${hero ? "py-2 text-base sm:text-lg" : "py-1.5 text-sm"}`}
      />
      <button
        type="submit"
        disabled={loading}
        className={`shrink-0 rounded-full bg-carbon font-medium text-lana transition hover:bg-tierra disabled:opacity-70 ${
          hero ? "px-5 py-2.5 text-sm sm:px-6 sm:py-3" : "px-4 py-2 text-xs"
        }`}
      >
        {loading ? "Reading…" : "Search"}
      </button>
    </form>
  );
}
