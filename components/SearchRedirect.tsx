"use client";

import { useRouter } from "next/navigation";
import { SearchBox } from "./SearchBox.tsx";

/** Buscador para páginas sin catálogo (p. ej. la 404): lleva la consulta a la portada. */
export function SearchRedirect() {
  const router = useRouter();
  return <SearchBox size="compact" onSubmit={(q) => router.push(`/?q=${encodeURIComponent(q)}#catalogo`)} />;
}
