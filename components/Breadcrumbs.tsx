import Link from "next/link";
import { absoluteUrl } from "@/lib/site.ts";
import { JsonLd } from "./JsonLd.tsx";

export interface Crumb {
  name: string;
  path: string;
}

/** Migas de pan visibles + BreadcrumbList para los resultados de búsqueda. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="py-4 text-xs text-piedra">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((c, i) => (
            <li key={c.path} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>/</span>}
              {i < items.length - 1 ? (
                <Link href={c.path} className="hover:text-carbon">
                  {c.name}
                </Link>
              ) : (
                <span aria-current="page" className="text-carbon/80">
                  {c.name}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: absoluteUrl(c.path),
          })),
        }}
      />
    </>
  );
}
