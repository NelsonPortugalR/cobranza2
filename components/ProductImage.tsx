"use client";

import { useState } from "react";
import type { Product } from "@/lib/types.ts";
import { Swatch } from "./Swatch.tsx";

/** Foto original de la tienda (enlazada, no copiada). Si no carga, se muestra la muestra de color. */
export function ProductImage({ product: p, className = "", sizes = "(max-width: 768px) 50vw, 33vw" }: { product: Product; className?: string; sizes?: string }) {
  const [failed, setFailed] = useState(false);
  const src = p.images[0];
  if (!src || failed) return <Swatch id={p.id} hex={p.color.hex} type={p.productType} className={className} />;
  const shopify = /cdn\/shop|cdn\.shopify\.com/.test(src);
  const at = (w: number) => (shopify ? `${src}${src.includes("?") ? "&" : "?"}width=${w} ${w}w` : src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={shopify ? `${src}${src.includes("?") ? "&" : "?"}width=600` : src}
      srcSet={shopify ? [360, 600, 900].map(at).join(", ") : undefined}
      sizes={sizes}
      alt={p.title}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
