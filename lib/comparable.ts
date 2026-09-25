import type { Filters } from "./types.ts";
import { BREED_LABEL, REGION_LABEL } from "./taxonomy.ts";

// Solo filtramos por lo que las tiendas publican de forma comparable.
// Origen, raza y natural/teñido casi nunca se declaran: si el usuario los pide,
// se lo decimos en vez de dejar el catálogo vacío.

export function stripNonComparable(f: Filters): { filters: Filters; ignored: string[] } {
  const ignored: string[] = [];
  if (f.origins.length) ignored.push(`origen (${f.origins.map((r) => REGION_LABEL[r]).join(", ")})`);
  if (f.breeds.length) ignored.push(`raza (${f.breeds.map((b) => BREED_LABEL[b]).join(", ")})`);
  if (f.dye !== "cualquiera") ignored.push(f.dye === "natural" ? "color natural sin teñir" : "teñido");
  return { filters: { ...f, origins: [], breeds: [], dye: "cualquiera" }, ignored };
}
