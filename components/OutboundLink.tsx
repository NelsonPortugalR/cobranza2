"use client";

import { logOutbound } from "@/lib/searchLog/client.ts";

/** Enlace a la tienda que registra la salida (anónima) antes de abrirla. */
export function OutboundLink({
  href,
  productId,
  store,
  className,
  children,
}: {
  href: string;
  productId: string;
  store: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className={className} onClick={() => logOutbound(productId, store)}>
      {children}
    </a>
  );
}
