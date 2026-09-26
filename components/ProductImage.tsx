"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types.ts";
import { Swatch } from "./Swatch.tsx";

/** Foto original de la tienda (enlazada, no copiada). Si no carga, se muestra la muestra de color. */
export function ProductImage({
  product: p,
  className = "",
  sizes = "(max-width: 768px) 50vw, 33vw",
  priority = false,
}: {
  product: Product;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // Si la foto falló antes de hidratar (HTML del servidor), onError no se dispara: lo detectamos al montar.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  const src = p.images[0];
  if (!src || failed) return <Swatch id={p.id} hex={p.color.hex} type={p.productType} className={className} />;
  const shopify = /cdn\/shop|cdn\.shopify\.com/.test(src);
  const at = (w: number) => (shopify ? `${src}${src.includes("?") ? "&" : "?"}width=${w} ${w}w` : src);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={shopify ? `${src}${src.includes("?") ? "&" : "?"}width=600` : src}
      srcSet={shopify ? [360, 600, 900].map(at).join(", ") : undefined}
      sizes={sizes}
      alt={altText(p)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

/** Texto alternativo descriptivo: tipo, material, color y marca (útil para accesibilidad y búsqueda de imágenes). */
function altText(p: Product): string {
  const fiber = p.fiber.quality === "baby" ? "baby alpaca" : p.fiber.quality === "royal" ? "royal alpaca" : "alpaca";
  return `${p.title} — ${p.color.name.toLowerCase()} ${fiber} by ${p.seller.name}`;
}
